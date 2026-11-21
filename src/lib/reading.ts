import type { ReadingBook } from '@/types/reading';

export function finishedInYear(books: ReadingBook[], year: number) {
  return books.filter(b => b.status === 'finished' && b.finished_reading_at?.startsWith(`${year}-`));
}

export function pagesInFinishedBooks(books: ReadingBook[], year: number) {
  return finishedInYear(books, year).reduce((total, book) =>
    total + (book.pages !== null && Number.isFinite(book.pages) && book.pages > 0 ? book.pages : 0), 0);
}

export function monthlyCompletions(books: ReadingBook[], year: number) {
  const finished = finishedInYear(books, year);
  return Array.from({ length: 12 }, (_, month) => ({
    name: new Date(Date.UTC(year, month, 1)).toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
    books: finished.filter(b => Number(b.finished_reading_at?.slice(5, 7)) === month + 1).length,
    previous: finishedInYear(books, year - 1).filter(b => Number(b.finished_reading_at?.slice(5, 7)) === month + 1).length,
  }));
}

export function readingBreakdown(books: ReadingBook[], mode: 'format' | 'length' | 'rating' | 'tags' | 'genre') {
  const counts = new Map<string, number>();
  for (const b of books) {
    const labels = mode === 'tags' ? (b.tags.length ? b.tags : ['Untagged']) : [
      mode === 'genre' ? b.genre || 'Unclassified' : mode === 'format' ? b.format || 'Unknown' :
      mode === 'length' ? b.pages == null ? 'Unknown' : b.pages < 200 ? 'Under 200 pages' : b.pages <= 400 ? '200–400 pages' : 'Over 400 pages' :
      b.rating == null ? 'Unrated' : b.rating === 5 ? '5 stars' : `${Math.floor(b.rating)}–<${Math.floor(b.rating) + 1} stars`,
    ];
    for (const label of labels) counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].map(([name, books]) => ({ name, books })).sort((a, b) => b.books - a.books);
}