import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useReadingData, useRefreshReadingData } from '@/hooks/useReadingData';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

describe('Shared reading shelf refresh', () => {
  it('updates another active year when Anne Frank is removed during a refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let refreshed = false;
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.refresh) refreshed = true;
      return { data: { year: body.year, books: refreshed ? [] : [{ id: 3163892, title: 'The Diary of Anne Frank', status: 'currently_reading' }] }, error: null };
    });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(() => ({ reading: useReadingData(2025), refresh: useRefreshReadingData(2026) }), { wrapper });
    await waitFor(() => expect(hook.result.current.reading.data?.books).toHaveLength(1));
    await act(async () => { await hook.result.current.refresh.mutateAsync(); });
    await waitFor(() => expect(hook.result.current.reading.data?.books).toHaveLength(0));
    expect(client.getQueryData(['reading', 2026])).toEqual({ year: 2026, books: [] });
    hook.unmount();
    client.clear();
  });
});