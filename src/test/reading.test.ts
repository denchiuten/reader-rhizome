import { describe, expect, it } from 'vitest';
import { monthlyCompletions, finishedInYear, pagesInFinishedBooks, monthlyPagesRead, yearlyPagesRead, readingBreakdown } from '@/lib/reading';
import { normalizeBook } from '../../supabase/functions/readwise-books/normalize';
import { genreFromSubjects } from '../../supabase/functions/readwise-books/genres';
import { shouldRefreshReading } from '../../supabase/functions/readwise-books/freshness';
import type { ReadingBook } from '@/types/reading';

const book = (overrides = {}): ReadingBook => ({ id: 1, title: 'Example', author: null, status: 'finished', progress: 1, started_reading_at: null, finished_reading_at: '2026-01-31T12:00:00Z', rating: 4.25, review: null, pages: 200, format: 'Ebook', cover: null, tags: [], highlightBookId: null, ...overrides });
describe('Reading statistics', () => {
  it('refreshes a saved shelf manually after five minutes without waiting for the daily sync', () => {
    const syncedAt = '2026-11-21T06:00:00Z';
    expect(shouldRefreshReading(syncedAt, true, Date.parse('2026-11-21T06:04:59Z'))).toBe(false);
    expect(shouldRefreshReading(syncedAt, true, Date.parse('2026-11-21T06:05:00Z'))).toBe(true);
    expect(shouldRefreshReading(syncedAt, false, Date.parse('2026-11-21T07:20:00Z'))).toBe(false);
    expect(shouldRefreshReading(syncedAt, false, Date.parse('2026-11-22T06:00:00Z'))).toBe(true);
  });
  it('preserves the provider shelf status when Anne Frank is no longer currently reading', () => {
    const removed = normalizeBook({ id: 3163892, title: 'The Diary of Anne Frank: Adapted For Younger Readers', status: 'want_to_read' });
    expect(removed?.status).toBe('want_to_read');
    expect([removed].filter(b => b?.status === 'currently_reading')).toHaveLength(0);
  });
  it('assigns page totals to the finish month with a previous-year comparison', () => {
    const books = [book({ pages: 200 }), book({ pages: 350 }), book({ pages: null }), book({ pages: 800, status: 'currently_reading' }), book({ pages: 120, finished_reading_at: '2025-01-01T00:00:00Z' }), book({ pages: 300, finished_reading_at: '2026-02-01T00:00:00Z' })];
    const months = monthlyPagesRead(books, 2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ name: 'Jan', pages: 550, previous: 120 });
    expect(months[1]).toEqual({ name: 'Feb', pages: 300, previous: 0 });
    expect(months.reduce((sum, month) => sum + month.pages, 0)).toBe(850);
  });
  it('groups pages by finish year and includes an empty selected year', () => {
    expect(yearlyPagesRead([book({ pages: 200 }), book({ pages: null }), book({ pages: 120, finished_reading_at: '2025-12-31T00:00:00Z' }), book({ pages: 800, status: 'currently_reading' })], 2027)).toEqual([
      { name: '2025', pages: 120 }, { name: '2026', pages: 200 }, { name: '2027', pages: 0 },
    ]);
  });
  it('totals pages only for books finished in the selected year', () => {
    expect(pagesInFinishedBooks([
      book({ pages: 200 }), book({ pages: 350 }),
      book({ pages: 900, finished_reading_at: '2025-12-31T12:00:00Z' }),
      book({ pages: 800, status: 'currently_reading' }),
    ], 2026)).toBe(550);
  });
  it('excludes finished books without usable page counts', () => {
    expect(pagesInFinishedBooks([
      book({ pages: 200 }), book({ pages: null }), book({ pages: 0 }), book({ pages: -20 }),
    ], 2026)).toBe(200);
  });
  it('keeps missing catalog genres unclassified rather than guessing', () => {
    expect(genreFromSubjects([])).toBeNull();
    expect(genreFromSubjects(['Dystopian fiction'])).toBe('Science fiction');
    expect(readingBreakdown([book()], 'genre')).toEqual([{ name: 'Unclassified', books: 1 }]);
  });
  it('groups equivalent reading formats together', () => {
    expect(normalizeBook({ ...book(), product: { format: 'ebook' } })?.format).toBe('Ebook');
    expect(normalizeBook({ ...book(), product: { format: 'hardback' } })?.format).toBe('Paper');
  });
  it('counts finished books in their finish month and year only', () => {
    const books = [book(), book({ id: 2, finished_reading_at: '2025-12-31T12:00:00Z' }), book({ id: 3, status: 'currently_reading' }), book({ id: 4, finished_reading_at: null })];
    expect(finishedInYear(books, 2026)).toHaveLength(1);
    expect(monthlyCompletions(books, 2026)[0].books).toBe(1);
    expect(monthlyCompletions(books, 2026)[11].previous).toBe(1);
    expect(monthlyCompletions(books, 2026)[1].books).toBe(0);
  });
  it('preserves quarter-star ratings and unknown page counts', () => {
    expect(normalizeBook({ ...book(), product: null }).rating).toBe(4.25);
    expect(readingBreakdown([book({ pages: null })], 'length')).toEqual([{ name: 'Unknown', books: 1 }]);
  });
  it('never publishes private or deleted books', () => {
    expect(normalizeBook({ ...book(), is_private: true })).toBeNull();
    expect(normalizeBook({ ...book(), status: 'deleted' })).toBeNull();
  });
  it('uses document tags and matches highlights by title rather than unrelated IDs', () => {
    const result = normalizeBook({ ...book(), id: 22 }, [{ id: 90, title: 'example', tags: ['History'] }]);
    expect(result?.tags).toEqual(['History']);
    expect(result?.highlightBookId).toBe(90);
  });
});