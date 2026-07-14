import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { StudySession } from './study-session';

export default async function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const supabase = await createClient();

  const { data: deck } = await supabase.schema('anki').from('decks').select('*').eq('id', deckId).single();
  if (!deck) notFound();

  const { data: cards } = await supabase
    .schema('anki')
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true });

  return <StudySession deckId={deckId} deckName={deck.name} initialCards={cards ?? []} />;
}
