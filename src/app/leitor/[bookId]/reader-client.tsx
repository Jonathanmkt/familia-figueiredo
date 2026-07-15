'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * O leitor depende de iframe/window/DOMParser — não renderiza no servidor (DR-1).
 */
export const ReaderClient = dynamic(() => import('./reader').then((m) => m.Reader), {
  ssr: false,
  loading: () => (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 p-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="min-h-[70svh] w-full" />
    </main>
  ),
});
