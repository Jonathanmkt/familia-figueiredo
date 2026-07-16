import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, GraduationCap, Volume2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { RichText } from '@/lib/anki/rich-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NewCardDialog } from './new-card-dialog';
import { DeleteCardButton } from './delete-card-button';

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const supabase = await createClient();

  const { data: deck } = await supabase.schema('anki').from('decks').select('*').eq('id', deckId).single();
  if (!deck) notFound();

  const { data: cards } = await supabase
    .schema('anki')
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false });

  const nowIso = new Date().toISOString();
  const dueCount = cards?.filter((c) => c.due <= nowIso).length ?? 0;

  return (
    <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/anki">
            <ArrowLeft /> Baralhos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{deck.name}</h1>
            {deck.description && <p className="text-sm text-muted-foreground">{deck.description}</p>}
            {deck.audio_language && (
              <Badge variant="secondary" className="mt-1 gap-1">
                <Volume2 className="size-3" /> Áudio
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <NewCardDialog deckId={deckId} />
            {dueCount > 0 ? (
              <Button asChild variant="brand">
                <Link href={`/anki/${deckId}/estudar`}>
                  <GraduationCap /> Estudar ({dueCount})
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <GraduationCap /> Nada pendente
              </Button>
            )}
          </div>
        </div>
      </div>

      {!cards?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum cartão ainda. Adicione o primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <RichText text={c.front} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <RichText text={c.back} />
                  </p>
                </div>
                <Badge variant={c.due <= nowIso ? 'warning' : 'secondary'}>
                  {c.due <= nowIso ? 'Pendente' : 'Agendado'}
                </Badge>
                <DeleteCardButton cardId={c.id} deckId={deckId} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
