'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, PartyPopper } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { previewRatings, Rating, type ActiveRating, type CardRow } from '@/lib/anki/fsrs';
import { submitReview } from '../../actions';

const RATING_CONFIG: { rating: ActiveRating; label: string; variant: 'destructive' | 'outline' | 'secondary' | 'brand' }[] = [
  { rating: Rating.Again, label: 'Errei', variant: 'destructive' },
  { rating: Rating.Hard, label: 'Difícil', variant: 'outline' },
  { rating: Rating.Good, label: 'Bom', variant: 'secondary' },
  { rating: Rating.Easy, label: 'Fácil', variant: 'brand' },
];

function formatInterval(due: Date, now: Date): string {
  const diffMin = Math.round((due.getTime() - now.getTime()) / 60000);
  if (diffMin < 60) return `${Math.max(diffMin, 1)}min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.round(diffDays / 30);
  return `${diffMonths}mês${diffMonths === 1 ? '' : 'es'}`;
}

export function StudySession({
  deckId,
  deckName,
  initialCards,
}: {
  deckId: string;
  deckName: string;
  initialCards: CardRow[];
}) {
  const [queue, setQueue] = useState(initialCards);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = queue[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- só "now" novo quando o cartão muda
  const now = useMemo(() => new Date(), [current]);
  const preview = useMemo(() => (current ? previewRatings(current, now) : null), [current, now]);

  const handleRate = (rating: ActiveRating) => {
    if (!current || isPending) return;
    startTransition(async () => {
      await submitReview(current.id, deckId, rating);
      setQueue((q) => q.slice(1));
      setRevealed(false);
    });
  };

  if (!current) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <PartyPopper className="size-10 text-brand" />
        <h1 className="text-xl font-bold">Sessão concluída!</h1>
        <p className="text-sm text-muted-foreground">
          Você revisou todos os cartões pendentes de {deckName}.
        </p>
        <Button asChild variant="brand">
          <Link href={`/anki/${deckId}`}>Voltar ao baralho</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{deckName}</span>
        <Badge variant="secondary">
          {queue.length} restante{queue.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-lg leading-relaxed whitespace-pre-wrap">
            {current.front}
          </CardTitle>
        </CardHeader>
        {revealed && (
          <CardContent className="border-t pt-4 text-center text-base whitespace-pre-wrap text-muted-foreground">
            {current.back}
          </CardContent>
        )}
      </Card>

      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)}>
          <Check /> Mostrar resposta
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATING_CONFIG.map(({ rating, label, variant }) => (
            <Button
              key={rating}
              variant={variant}
              disabled={isPending}
              onClick={() => handleRate(rating)}
              className="flex h-auto flex-col gap-0.5 py-2.5"
            >
              <span>{label}</span>
              {preview && (
                <span className="text-xs opacity-70">{formatInterval(preview[rating].due, now)}</span>
              )}
            </Button>
          ))}
        </div>
      )}
    </main>
  );
}
