import { createClient } from '@/lib/supabase/server';
import { WordBankTabs } from './word-bank-tabs';
import { deriveStatus } from './status';

export default async function PalavrasPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .schema('leitor')
    .from('word_bank')
    .select('*, books(title)')
    .order('created_at', { ascending: false });

  // Status derivado: busca o intervalo (scheduled_days) dos cards ligados e classifica.
  const cardIds = (entries ?? []).map((e) => e.card_id).filter((id): id is string => !!id);
  const cardsById = new Map<string, number>();
  if (cardIds.length) {
    const { data: cards } = await supabase
      .schema('anki')
      .from('cards')
      .select('id, scheduled_days')
      .in('id', cardIds);
    for (const c of cards ?? []) cardsById.set(c.id, c.scheduled_days);
  }

  const items = (entries ?? []).map((entry) => ({
    id: entry.id,
    selected_text: entry.selected_text,
    translation_common: entry.translation_common,
    translation_contextual: entry.translation_contextual,
    context_explanation: entry.context_explanation,
    paragraph_context: entry.paragraph_context,
    language: entry.language,
    created_at: entry.created_at,
    bookTitle: (entry.books as { title: string } | null)?.title ?? null,
    status: deriveStatus(entry.card_id ? cardsById.get(entry.card_id) : null),
  }));

  return (
    <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Banco de Palavras</h1>
      </header>

      <WordBankTabs items={items} />
    </main>
  );
}
