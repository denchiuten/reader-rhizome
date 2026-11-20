import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

function setup(fail = false) {
  let handler: (req: Request) => Promise<Response>;
  const tables: string[] = [];
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const query = {
    select: () => query,
    in: vi.fn().mockResolvedValue({ data: [], error: fail ? { message: "private database detail" } : null }),
    upsert,
  };
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: [{ embedding: [0.1, 0.2] }] }));
  const source = readFileSync("supabase/functions/embed-highlights/index.ts", "utf8").replace(/^import .*;\n/, "");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    createClient: () => ({ from: (table: string) => { tables.push(table); return query; } }),
    Deno: { env: { get: () => "test-only" }, serve: (fn: typeof handler) => { handler = fn; } },
    crypto: webcrypto, TextEncoder, fetch, Response, console: { error: vi.fn() },
  });
  return {
    tables, upsert, fetch,
    invoke: (highlights: unknown[]) => handler(new Request("http://localhost/embed", {
      method: "POST", body: JSON.stringify({ highlights }),
    })),
  };
}

describe("embedding cache security", () => {
  it("does not use highlight IDs as cache keys or overwrite entries", async () => {
    const { invoke, tables, upsert } = setup();
    const response = await invoke([{ id: 123, text: "Learning through practice" }]);
    expect(response.status).toBe(200);
    expect(tables).toEqual(["content_embeddings", "content_embeddings"]);
    const [rows, options] = upsert.mock.calls[0];
    expect(rows[0]).not.toHaveProperty("highlight_id");
    expect(rows[0].text_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(options).toEqual({ onConflict: "text_hash", ignoreDuplicates: true });
    expect((await response.json()).embeddings[0].id).toBe(123);
  });

  it("rejects malformed highlights without internal details", async () => {
    const { invoke, fetch, upsert } = setup();
    const response = await invoke([null]);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid highlights" });
    expect(fetch).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns only a generic error on internal failure", async () => {
    const { invoke } = setup(true);
    const response = await invoke([{ id: 1, text: "Example" }]);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to compute embeddings" });
  });
});