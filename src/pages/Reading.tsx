import { useMemo, useState } from 'react';
import { BookCheck, Loader2, Star, Target } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ReadingCharts } from '@/components/reading/ReadingCharts';
import { BookShelf } from '@/components/reading/BookShelf';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useReadingData } from '@/hooks/useReadingData';
import { finishedInYear } from '@/lib/reading';

export default function Reading() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, error, refetch } = useReadingData(year);
  const finished = useMemo(() => finishedInYear(data?.books || [], year), [data, year]);
  const rated = finished.filter(b => b.rating !== null);
  const average = rated.length ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2) : '—';
  const earliest = Math.min(currentYear - 5, ...(data?.books || []).flatMap(b => b.finished_reading_at ? [Number(b.finished_reading_at.slice(0, 4))] : []));
  const years = Array.from({ length: currentYear - Math.max(2000, earliest) + 1 }, (_, i) => currentYear - i);
  const goal = data?.summary.target_books_read;
  return <div className="min-h-screen bg-background">
    <AppHeader />
    <main className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Dennis Chiuten · Reading journal</p><h1 className="text-3xl font-semibold sm:text-4xl">Dennis’ Reading History</h1><p className="mt-3 text-sm text-muted-foreground">Dennis’ reading history, one chapter at a time.</p></div><Select value={String(year)} onValueChange={v => setYear(Number(v))}><SelectTrigger className="w-28" aria-label="Reading year"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
      {isLoading ? <div className="flex min-h-80 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading Dennis’ reading history…</div> : error || !data ? <div role="alert" className="space-y-4 border-y border-border py-12"><h2 className="font-medium">Couldn't load reading history</h2><p className="text-sm text-muted-foreground">{error?.message}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : <>
        <div className="mb-8 grid grid-cols-2 gap-x-5 gap-y-7">
          {[{ icon: BookCheck, label: 'Books finished', value: data.summary.books_finished }, { icon: Star, label: 'Average rating', value: average }].map(m => <div key={m.label} className="border-l-2 border-border pl-4"><p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><m.icon className="h-3.5 w-3.5" />{m.label}</p><p className="text-3xl font-medium tabular-nums">{m.value}</p></div>)}
        </div>
        {goal && <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3"><div className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-primary" /><span>{year} reading goal</span><strong>{data.summary.books_finished} / {goal}</strong></div><Progress className="h-1.5 min-w-32 max-w-xs flex-1" value={Math.min(100, data.summary.books_finished / goal * 100)} /><span className="text-xs text-muted-foreground">{Math.round(data.summary.books_finished / goal * 100)}%</span></div>}
        <ReadingCharts books={data.books} year={year} />
        <BookShelf title="Currently reading" books={data.books.filter(b => b.status === 'currently_reading')} current />
        <BookShelf title={`Finished in ${year}`} books={finished} />
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Updated {new Date(data.syncedAt).toLocaleDateString()} · Synced daily with Readwise</span><div className="flex gap-4"><a href="https://www.linkedin.com/in/dchiuten/" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://github.com/denchiuten" target="_blank" rel="noreferrer">GitHub</a></div></footer>
      </>}
    </main>
  </div>;
}