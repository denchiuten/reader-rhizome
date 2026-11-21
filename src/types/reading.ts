export interface ReadingBook {
  id: number;
  title: string;
  author: string | null;
  status: string;
  progress: number | null;
  started_reading_at: string | null;
  finished_reading_at: string | null;
  rating: number | null;
  review: string | null;
  pages: number | null;
  format: string | null;
  cover: string | null;
  tags: string[];
  highlightBookId: number | null;
  genre?: string | null;
  fallbackCover?: string | null;
}

export interface ReadingDay {
  date: string;
  session_count: number;
  total_time_seconds: number;
}

export interface ReadingSummary {
  books_finished: number;
  books_started: number;
  reading_days: number;
  total_time_seconds: number;
  session_count: number;
  target_books_read: number | null;
}

export interface ReadingData {
  books: ReadingBook[];
  days: ReadingDay[];
  summary: ReadingSummary;
  year: number;
  syncedAt: string;
}