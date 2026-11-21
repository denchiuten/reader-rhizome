import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { finishedInYear, monthlyCompletions, readingBreakdown } from '@/lib/reading';
import type { ReadingBook } from '@/types/reading';
import { PagesReadChart } from '@/components/reading/PagesReadChart';

const config = {
  books: { label: 'Books finished', color: 'hsl(var(--rp-foam))' },
  previous: { label: 'Previous year', color: 'hsl(var(--rp-iris))' },
};

export function ReadingCharts({ books, year }: { books: ReadingBook[]; year: number }) {
  const [period, setPeriod] = useState('monthly');
  const [mode, setMode] = useState<'length' | 'rating' | 'genre'>('genre');
  const years = [...new Set([year, ...books.flatMap(b => b.finished_reading_at ? [Number(b.finished_reading_at.slice(0, 4))] : [])])].sort((a, b) => a - b);
  const chart = period === 'monthly' ? monthlyCompletions(books, year) : years.map(y => ({ name: String(y), books: finishedInYear(books, y).length }));
  const breakdown = readingBreakdown(finishedInYear(books, year), mode);
  return <div className="grid gap-8 border-y border-border py-8 lg:grid-cols-[1.65fr_1fr]">
    <section className="min-w-0" aria-labelledby="finished-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="finished-heading" className="text-lg font-semibold">Books finished</h2><Tabs value={period} onValueChange={setPeriod}><TabsList><TabsTrigger value="monthly">Monthly</TabsTrigger><TabsTrigger value="yearly">Yearly</TabsTrigger></TabsList></Tabs></div>
      <ChartContainer config={config} className="h-64 w-full">
        <BarChart data={chart} accessibilityLayer margin={{ left: -20, right: 8 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={12} minTickGap={3} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {period === 'monthly' && <Bar dataKey="previous" fill="var(--color-previous)" radius={[3, 3, 0, 0]} />}
          <Bar dataKey="books" fill="var(--color-books)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartContainer>
      {period === 'monthly' && <div className="mt-3 flex justify-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="reading-key reading-key-current" />{year}</span><span className="flex items-center gap-2"><i className="reading-key reading-key-previous" />{year - 1}</span></div>}
    </section>
    <div className="min-w-0 lg:col-start-1 lg:row-start-2"><PagesReadChart books={books} year={year} /></div>
    <section className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border lg:pl-8" aria-labelledby="breakdown-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="breakdown-heading" className="text-lg font-semibold">The year's mix</h2><Select value={mode} onValueChange={v => setMode(v as typeof mode)}><SelectTrigger className="w-36" aria-label="Reading breakdown"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="genre">Genre</SelectItem><SelectItem value="length">Book length</SelectItem><SelectItem value="rating">Rating</SelectItem></SelectContent></Select></div>
      {breakdown.length ? <ChartContainer config={config} className={breakdown.length > 8 ? 'h-96 w-full' : 'h-64 w-full'}><BarChart data={breakdown} layout="vertical" accessibilityLayer margin={{ left: 0, right: 20 }}><XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={0} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="books" fill="var(--color-books)" radius={[0, 3, 3, 0]} barSize={22} /></BarChart></ChartContainer> : <p className="py-20 text-center text-sm text-muted-foreground">No finished books in {year}.</p>}
      {mode === 'genre' && <p className="mt-3 text-xs text-muted-foreground">Genres from Open Library catalog subjects; unmatched books are unclassified.</p>}
    </section>
  </div>;
}
