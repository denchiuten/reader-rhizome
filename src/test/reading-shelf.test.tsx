import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BookShelf } from '@/components/reading/BookShelf';
import type { ReadingBook } from '@/types/reading';

describe('Refreshed book details', () => {
  it('closes Anne Frank details when the book leaves the current shelf', () => {
    const anne: ReadingBook = { id: 3163892, title: 'The Diary of Anne Frank', author: null, status: 'currently_reading', progress: null, started_reading_at: null, finished_reading_at: null, rating: null, review: null, pages: null, format: null, cover: null, tags: [], highlightBookId: null };
    const shelf = (books: ReadingBook[]) => <MemoryRouter><BookShelf title="Currently reading" books={books} current /></MemoryRouter>;
    const { rerender } = render(shelf([anne]));
    fireEvent.click(screen.getByRole('button', { name: 'View The Diary of Anne Frank' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(shelf([]));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});