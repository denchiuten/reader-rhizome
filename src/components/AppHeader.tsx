import { ReadingNavigation } from '@/components/ReadingNavigation';

export function AppHeader() {
  return <header className="shrink-0 border-b border-border bg-card/50">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-3 px-5 py-4 sm:px-8">
      <ReadingNavigation />
    </div>
  </header>;
}