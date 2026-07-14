'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { applyReview, newCardFsrsFields, type ActiveRating, type CardRow } from '@/lib/anki/fsrs';

export type AudioLanguage = 'pt-BR' | 'en-US';

export async function createDeck(
  name: string,
  description: string,
  audioLanguage: AudioLanguage | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .schema('anki')
    .from('decks')
    .insert({ name, description: description || null, audio_language: audioLanguage });
  if (error) throw new Error(error.message);
  revalidatePath('/anki');
}

export async function deleteDeck(deckId: string) {
  const supabase = await createClient();
  const { error } = await supabase.schema('anki').from('decks').delete().eq('id', deckId);
  if (error) throw new Error(error.message);
  revalidatePath('/anki');
}

export async function createCard(deckId: string, front: string, back: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .schema('anki')
    .from('cards')
    .insert({ deck_id: deckId, front, back, ...newCardFsrsFields() });
  if (error) throw new Error(error.message);
  revalidatePath(`/anki/${deckId}`);
}

export async function deleteCard(cardId: string, deckId: string) {
  const supabase = await createClient();
  const { error } = await supabase.schema('anki').from('cards').delete().eq('id', cardId);
  if (error) throw new Error(error.message);
  revalidatePath(`/anki/${deckId}`);
}

/** Aplica a nota (Again/Hard/Good/Easy) ao cartão: agenda via FSRS + grava no histórico. */
export async function submitReview(cardId: string, deckId: string, rating: ActiveRating) {
  const supabase = await createClient();

  const { data: card, error: fetchError } = await supabase
    .schema('anki')
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (fetchError || !card) throw new Error(fetchError?.message ?? 'Cartão não encontrado');

  const { cardUpdate, logInsert } = applyReview(card as CardRow, rating);

  const { error: updateError } = await supabase
    .schema('anki')
    .from('cards')
    .update(cardUpdate)
    .eq('id', cardId);
  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.schema('anki').from('review_log').insert(logInsert);
  if (logError) throw new Error(logError.message);

  revalidatePath(`/anki/${deckId}`);
}
