import { BookMarked } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteEntryButton } from './delete-entry-button';

export default async function PalavrasPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .schema('leitor')
    .from('word_bank')
    .select('*, books(title)')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Banco de Palavras</h1>
        <p className="text-sm text-muted-foreground">
          Suas seleções salvas nas leituras — futura matéria-prima dos cards do Anki.
        </p>
      </header>

      {!entries?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <BookMarked className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nada salvo ainda. Marque palavras ou expressões no Leitor e use “Salvar no banco de
              palavras”.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const bookTitle = (entry.books as { title: string } | null)?.title;
            return (
              <Card key={entry.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold">{entry.selected_text}</p>
                    <DeleteEntryButton entryId={entry.id} />
                  </div>

                  {(entry.translation_common || entry.translation_contextual) && (
                    <div className="flex flex-col gap-1 text-sm">
                      {entry.translation_common && (
                        <p>
                          <span className="text-xs text-muted-foreground">Tradução: </span>
                          {entry.translation_common}
                        </p>
                      )}
                      {entry.translation_contextual && (
                        <p>
                          <span className="text-xs text-muted-foreground">No contexto: </span>
                          {entry.translation_contextual}
                        </p>
                      )}
                      {entry.context_explanation && (
                        <p className="text-xs text-muted-foreground">{entry.context_explanation}</p>
                      )}
                    </div>
                  )}

                  {entry.paragraph_context && (
                    <p className="line-clamp-2 text-xs text-muted-foreground italic">
                      “{entry.paragraph_context}”
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {entry.language === 'en-US' ? 'Inglês (EUA)' : 'Português (BR)'}
                    </Badge>
                    {bookTitle && <Badge variant="outline">{bookTitle}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
