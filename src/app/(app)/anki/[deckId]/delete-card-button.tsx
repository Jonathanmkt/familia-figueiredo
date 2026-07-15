'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { deleteCard } from '../actions';

export function DeleteCardButton({ cardId, deckId }: { cardId: string; deckId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => startTransition(() => deleteCard(cardId, deckId))}
    >
      <Trash2 />
    </Button>
  );
}
