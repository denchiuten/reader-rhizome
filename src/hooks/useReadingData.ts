import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReadingData } from '@/types/reading';

export function useReadingData(year: number) {
  return useQuery({
    queryKey: ['reading', year], staleTime: 60 * 60 * 1000, retry: 1,
    queryFn: async (): Promise<ReadingData> => {
      const { data, error } = await supabase.functions.invoke('readwise-books', { body: { year } });
      if (error || data?.error) throw new Error(data?.error || 'Could not load reading history. Please try again shortly.');
      return data;
    },
  });
}