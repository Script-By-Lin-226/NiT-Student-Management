"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default query options for performance
            staleTime: 1000 * 60 * 5, // 5 minutes cache
            gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
            retry: 1, // Retry once on failure
            refetchOnWindowFocus: false, // Don't refetch on tab focus for better performance
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
