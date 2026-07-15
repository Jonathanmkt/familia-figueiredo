'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { deleteWordBankEntry } from './actions';

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      aria-label="Excluir do banco de palavras"
      disabled={isPending}
      onClick={() => startTransition(() => deleteWordBankEntry(entryId))}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
