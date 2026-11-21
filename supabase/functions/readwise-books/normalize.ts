export function normalizeBook(b: any, sources: any[] = []) {
  if (b.is_private || b.status === 'deleted') return null;
  const title = b.title || b.product?.title || 'Untitled';
  const source = sources.find(s => s.title?.trim().toLowerCase() === title.trim().toLowerCase());
  const rawFormat = (b.product?.format || '').toLowerCase();
  const format = /ebook|e-book|kindle|epub/.test(rawFormat) ? 'Ebook' : /audio/.test(rawFormat) ? 'Audiobook' : /paper|hardback|hardcover|print/.test(rawFormat) ? 'Paper' : b.product?.format || ({ physical: 'Paper', kindle: 'Ebook', audible: 'Audiobook', bookstore_ebook: 'Ebook', uploaded_ebook: 'Ebook' } as Record<string, string>)[b.creation_origin] || null;
  return {
    id: b.id, title, author: b.author || null, status: b.status,
    progress: b.progress ?? null, started_reading_at: b.started_reading_at ?? null,
    finished_reading_at: b.finished_reading_at ?? null, rating: b.rating ?? null,
    review: b.review ?? null, pages: b.manual_total_pages ?? b.product?.page_count ?? null,
    format, isbn: b.product?.isbn || null, genre: null,
    cover: b.product?.cover_thumbnail_url || b.product?.cover_url || source?.cover_image_url || null,
    tags: source?.tags || [], highlightBookId: source?.id ?? null,
  };
}