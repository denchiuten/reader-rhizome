import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

interface Props {
  selected: CategoryKey[];
  onChange: (cats: CategoryKey[]) => void;
  disabled?: boolean;
}

export function CategoryFilter({ selected, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Filter
      </span>
      <ToggleGroup
        type="multiple"
        size="sm"
        value={selected}
        onValueChange={(v) => onChange(v as CategoryKey[])}
        disabled={disabled}
        className="flex-wrap justify-start gap-1"
      >
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <ToggleGroupItem
            key={key}
            value={key}
            aria-label={label}
            variant="outline"
            className="h-7 gap-1.5 rounded-full px-2.5 text-xs"
          >
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selected.length === 0 && (
        <span className="text-xs text-muted-foreground">All categories</span>
      )}
    </div>
  );
}
