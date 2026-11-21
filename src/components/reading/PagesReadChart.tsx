import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { monthlyPagesRead, yearlyPagesRead } from '@/lib/reading';
import type { ReadingBook } from '@/types/reading';

const config = {
  pages: { label: 'Pages read', color: 'hsl(var(--rp-foam))' },
  previous: { label: 'Previous year', color: 'hsl(var(--rp-iris))' },
};

export function PagesReadChart({ books, year }: { books: ReadingBook[]; year: number }) {
  const [period, setPeriod] = useState('monthly');
  const chart = period === 'monthly' ? monthlyPagesRead(books, year) : yearlyPagesRead(books, year);
  return <section className="min-w-0" aria-labelledby="pages-heading">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="pages-heading" className="text-lg font-semibold">Pages read</h2>
      <Tabs value={period} onValueChange={setPeriod}><TabsList><TabsTrigger value="monthly">Monthly</TabsTrigger><TabsTrigger value="yearly">Yearly</TabsTrigger></TabsList></Tabs>
    </div>
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={chart} accessibilityLayer margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={12} minTickGap={3} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickFormatter={value => Number(value).toLocaleString()} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {period === 'monthly' && <Bar dataKey="previous" fill="var(--color-previous)" radius={[3, 3, 0, 0]} />}
        <Bar dataKey="pages" fill="var(--color-pages)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
    {period === 'monthly' && <div className="mt-3 flex justify-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="reading-key reading-key-current" />{year}</span><span className="flex items-center gap-2"><i className="reading-key reading-key-previous" />{year - 1}</span></div>}
  </section>;
}