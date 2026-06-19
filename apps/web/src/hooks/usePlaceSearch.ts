import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchPlaces } from '../api/kartverket';

export function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTerm = debouncedQuery.trim();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const places = useQuery({
    queryKey: ['place-search', searchTerm],
    queryFn: () => searchPlaces(searchTerm),
    enabled: searchTerm.length > 0,
    staleTime: 10 * 60_000,
  });

  return {
    results: searchTerm ? (places.data ?? []) : [],
    isLoading: searchTerm.length > 0 && places.isFetching,
    query,
    setQuery,
  };
}
