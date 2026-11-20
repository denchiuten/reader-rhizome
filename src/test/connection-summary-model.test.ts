import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

function setup(cached: { summary: string; model: string } | null = null) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const insert = vi.fn().mockResolvedValue({ error: null });
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: cached, error: null }),
    insert,
  };
  const fetch = vi.fn().mockResolvedValue(Response.json({ output_text: "Both highlights connect learning with practice." }));
  const source = readFileSync("supabase/functions/summarize-connection/index.ts", "utf8")
    .replace(/^import .*;\n/, "");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  runInNewContext(compiled.outputText, {
    createClient: () => ({ from: () => query }),
    Deno: {
      env: { get: () => "test-only" },
      serve: (callback: typeof handler) => { handler = callback; },
    },
    fetch, Response, console,
  });
  const invoke = async () => {
    if (!handler) throw new Error("Summary handler was not registered");
    return handler(new Request("http://localhost/summary", {
      method: "POST",
      body: JSON.stringify({ a: { id: 1, text: "Learn by doing." }, b: { id: 2, text: "Practice makes progress." } }),
    }));
  };
  return { invoke, fetch, insert };
}

describe("connection summary model", () => {
  it("generates and saves new summaries using GPT-6 Luna", async () => {
    const { invoke, fetch, insert } = setup();
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe("gpt-6-luna");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-6-luna" }));
    expect(await response.json()).toEqual(expect.objectContaining({ model: "gpt-6-luna", cached: false }));
  });

  it("keeps existing saved summaries without regenerating them", async () => {
    const { invoke, fetch } = setup({ summary: "Saved explanation.", model: "gpt-5.4-nano" });
    const response = await invoke();
    expect(await response.json()).toEqual({ summary: "Saved explanation.", model: "gpt-5.4-nano", cached: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});