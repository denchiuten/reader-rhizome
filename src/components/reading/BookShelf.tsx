import { useState } from 'react';
import { BookOpen, Network, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Markdown } from '@/components/Markdown';
import type { ReadingBook } from '@/types/reading';

function Cover({ book }: { book: ReadingBook }) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const src = !failed ? book.cover : !fallbackFailed ? book.fallbackCover : null;
  return <div className="reading-cover flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-sm bg-muted">
    {src ? <img src={src} alt={`${book.title} cover`} loading="lazy" className="h-full w-full object-cover" onError={() => failed ? setFallbackFailed(true) : setFailed(true)} /> : <BookOpen className="h-8 w-8 text-muted-foreground" />}
  </div>;
}

export function BookShelf({ title, books, current = false }: { title: string; books: ReadingBook[]; current?: boolean }) {
  const [selected, setSelected] = useState<ReadingBook | null>(null);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? books : books.slice(0, current ? 6 : 12);
  return <section className="border-b border-border py-8">
    <div className="mb-6 flex items-baseline justify-between gap-3"><h2 className="text-lg font-semibold">{title} <span className="ml-2 text-sm font-normal text-muted-foreground">{books.length}</span></h2>{books.length > (current ? 6 : 12) && <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'View all'}</Button>}</div>
    {books.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{visible.map(b => <article key={b.id} className="min-w-0">
      <Button variant="ghost" onClick={() => setSelected(b)} className="h-auto w-full p-0 hover:bg-transparent" aria-label={`View ${b.title}`}><Cover book={b} /></Button>
      <h3 className="mt-3 break-words text-sm font-medium leading-snug">{b.title}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{b.author}</p>
      {current ? <div className="mt-3">{b.progress !== null ? <><Progress value={b.progress * 100} className="h-1" /><p className="mt-1.5 text-xs text-muted-foreground">{Math.round(b.progress * 100)}% complete</p></> : <p className="text-xs text-muted-foreground">In progress</p>}</div> : <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{b.rating !== null && <span className="flex items-center gap-1 text-primary"><Star className="h-3 w-3" />{b.rating}</span>}{b.finished_reading_at && <span>{new Date(b.finished_reading_at).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>}</div>}
    </article>)}</div> : <p className="py-8 text-sm text-muted-foreground">{current ? 'No books currently in progress.' : 'No finished books in this year.'}</p>}
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">{selected && <>
      <DialogHeader><DialogTitle className="pr-5 leading-snug">{selected.title}</DialogTitle></DialogHeader>
      <div className="flex items-start gap-5"><div className="w-28 shrink-0"><Cover book={selected} /></div><div className="min-w-0 space-y-2 text-sm"><p>{selected.author}</p><p className="capitalize text-muted-foreground">{selected.status.replace(/_/g, ' ')}</p>{selected.rating !== null && <p className="flex items-center gap-1"><Star className="h-4 w-4 text-primary" />{selected.rating} / 5</p>}{selected.pages && <p className="text-muted-foreground">{selected.pages} pages</p>}{selected.format && <p className="text-muted-foreground">{selected.format}</p>}{selected.finished_reading_at && <p className="text-muted-foreground">Finished {new Date(selected.finished_reading_at).toLocaleDateString()}</p>}</div></div>
      {selected.review && <div><h3 className="mb-2 text-sm font-semibold">Dennis’ review</h3><Markdown className="text-sm">{selected.review}</Markdown></div>}
      {selected.highlightBookId !== null && <Button asChild variant="outline"><Link to={`/?source=${selected.highlightBookId}`}><Network />View highlights</Link></Button>}
    </>}</DialogContent></Dialog>
  </section>;
}