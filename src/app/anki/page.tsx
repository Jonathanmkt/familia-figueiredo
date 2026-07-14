import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewDeckDialog } from './new-deck-dialog';

export default async function AnkiPage() {
  const supabase = await createClient();
  const { data: decks } = await supabase
    .schema('anki')
    .from('decks')
    .select('id, name, description, cards(count)')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anki</h1>
          <p className="text-sm text-muted-foreground">Seus baralhos de estudo</p>
        </div>
        <NewDeckDialog />
      </header>

      {!decks?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Você ainda não tem baralhos. Crie o primeiro para começar a estudar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {decks.map((deck) => {
            const count = deck.cards?.[0]?.count ?? 0;
            return (
              <Link key={deck.id} href={`/anki/${deck.id}`}>
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    {deck.description && <CardDescription>{deck.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
                      {count} {count === 1 ? 'cartão' : 'cartões'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
