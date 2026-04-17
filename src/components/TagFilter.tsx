import { useEffect, useMemo, useState } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { fetchAvailableTags } from "@/lib/readwise";

interface TagFilterProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagFilter({ selected, onChange, disabled }: TagFilterProps) {
  const [available, setAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAvailableTags()
      .then((tags) => {
        if (active) setAvailable(tags);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load tags");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((t) => t.toLowerCase().includes(q));
  }, [available, query]);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Tag className="h-3 w-3" />
          Tags
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 p-2">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={loading ? "Loading tags…" : "Search tags…"}
            className="h-8 text-xs"
            disabled={loading}
          />
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {error ? (
            <p className="px-2 py-3 text-xs text-destructive">{error}</p>
          ) : loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No tags found.</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((tag) => {
                const isSelected = selected.includes(tag);
                return (
                  <li key={tag}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(tag)}
                      />
                      <span className="truncate">{tag}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
