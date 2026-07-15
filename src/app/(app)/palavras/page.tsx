import { Vault } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { WordBankList } from './word-bank-list';

export default async function PalavrasPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .schema('leitor')
    .from('word_bank')
    .select('*, books(title)')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Banco de Palavras</h1>
      </header>

      {!entries?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Vault className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nada salvo ainda. Marque palavras ou expressões no Leitor e use “Salvar no banco de
              palavras”.
            </p>
          </CardContent>
        </Card>
      ) : (
        <WordBankList
          entries={entries.map((entry) => ({
            ...entry,
            bookTitle: (entry.books as { title: string } | null)?.title ?? null,
          }))}
        />
      )}
    </main>
  );
}
