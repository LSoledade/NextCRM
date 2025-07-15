import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

async function fetchServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*');

  if (error) {
    throw new Error('Error fetching services');
  }

  return data || [];
}

export function useServices() {
  const { data: services, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
  });

  return { services, isLoading, isError };
}