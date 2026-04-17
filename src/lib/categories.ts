import { BookOpen, FileText, Headphones, Highlighter, Twitter, type LucideIcon } from "lucide-react";

export type CategoryKey = "books" | "articles" | "tweets" | "podcasts" | "supplementals";

export const CATEGORIES: { key: CategoryKey; label: string; icon: LucideIcon }[] = [
  { key: "books", label: "Books", icon: BookOpen },
  { key: "articles", label: "Articles", icon: FileText },
  { key: "tweets", label: "Tweets", icon: Twitter },
  { key: "podcasts", label: "Podcasts", icon: Headphones },
  { key: "supplementals", label: "Supplementals", icon: Highlighter },
];

export function categoryIcon(category: string | null | undefined): LucideIcon {
  const found = CATEGORIES.find((c) => c.key === category);
  return found?.icon ?? Highlighter;
}

export function categoryLabel(category: string | null | undefined): string {
  const found = CATEGORIES.find((c) => c.key === category);
  return found?.label ?? "Highlight";
}
