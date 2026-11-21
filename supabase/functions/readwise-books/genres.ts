export function genreFromSubjects(subjects: string[]): string | null {
  const text = subjects.join(' ').toLowerCase();
  const rules: [RegExp, string][] = [
    [/science fiction|dystopi|speculative fiction/, 'Science fiction'],
    [/fantasy|magic.*fiction/, 'Fantasy'],
    [/mystery|detective|thriller/, 'Mystery & thriller'],
    [/historical fiction/, 'Historical fiction'],
    [/romance|love stories/, 'Romance'],
    [/poetry|poems/, 'Poetry'],
    [/biography|autobiograph|memoir/, 'Biography & memoir'],
    [/business|management|entrepreneur|finance|economics/, 'Business & economics'],
    [/psychology|self-help|personal development/, 'Psychology & growth'],
    [/philosophy|ethics/, 'Philosophy'],
    [/history|historical/, 'History'],
    [/science|technology|computer/, 'Science & technology'],
    [/fiction|novel|short stories/, 'Literary fiction'],
    [/nonfiction|non-fiction|essays/, 'Nonfiction & essays'],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || null;
}

export async function catalogGenres(books: any[], year: number) {
  const target = books.filter(b => b.status === 'finished' && b.finished_reading_at?.startsWith(`${year}-`) && b.isbn);
  const result: Record<string, { genre: string | null; cover: string | null }> = {};
  const isbns = [...new Set(target.map(b => String(b.isbn)))];
  const batches = Array.from({ length: Math.ceil(isbns.length / 20) }, (_, i) => isbns.slice(i * 20, (i + 1) * 20));
  // Only public catalog identifiers go to Open Library; no Readwise credentials or user data.
  for (let i = 0; i < batches.length; i += 3) {
    await Promise.all(batches.slice(i, i + 3).map(async batch => {
      try {
        const url = new URL('https://openlibrary.org/api/books');
        url.searchParams.set('bibkeys', batch.map(isbn => `ISBN:${isbn}`).join(','));
        url.searchParams.set('format', 'json');
        url.searchParams.set('jscmd', 'data');
        const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`Catalog status ${response.status}`);
        const data = await response.json();
        for (const b of target.filter(b => batch.includes(b.isbn))) {
          const entry = data[`ISBN:${b.isbn}`];
          result[b.id] = { genre: genreFromSubjects((entry?.subjects || []).map((s: any) => s.name)), cover: entry?.cover?.medium || null };
        }
      } catch (e) { console.warn('Catalog enrichment unavailable', e instanceof Error ? e.message : 'Unknown'); }
    }));
  }
  return result;
}