import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReadingData } from '@/types/reading';

async function fetchReadingData(year: number, refresh = false): Promise<ReadingData> {
  const { data, error } = await supabase.functions.invoke('readwise-books', { body: { year, refresh } });
  if (error || data?.error) throw new Error(data?.error || 'Could not load reading history. Please try again shortly.');
  return data;
}

export function useReadingData(year: number) {
  return useQuery({
    queryKey: ['reading', year], staleTime: 60 * 60 * 1000, retry: 1,
    queryFn: () => fetchReadingData(year),
  });
}

export function useRefreshReadingData(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchReadingData(year, true),
    onSuccess: async data => {
      await queryClient.invalidateQueries({ queryKey: ['reading'], refetchType: 'none' });
      queryClient.setQueryData(['reading', data.year], data);
    },
  });
}