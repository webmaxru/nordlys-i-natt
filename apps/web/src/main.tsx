import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import './i18n';
import './styles.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      // Keep entries long enough for the persister to restore them on reload.
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Persist the React Query cache to localStorage so the last forecast/verdict
// is restored synchronously on the next visit and shown immediately, while a
// fresh forecast is fetched in the background (stale-while-revalidate).
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'nordlys.query-cache',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        // Show a cached verdict up to 12 h old; older is dropped and refetched.
        maxAge: 12 * 60 * 60_000,
        // Bump when the cached forecast shape changes to invalidate old caches.
        buster: 'nordlys-forecast-v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' &&
            query.queryKey[0] === 'forecast',
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
);
