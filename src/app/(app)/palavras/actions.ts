'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export async function deleteWordBankEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('word_bank').delete().eq('id', entryId);
  if (error) throw new Error(error.message);
  revalidatePath('/palavras');
}

export async function deleteWordBankEntries(entryIds: string[]) {
  if (!entryIds.length) return;
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('word_bank').delete().in('id', entryIds);
  if (error) throw new Error(error.message);
  revalidatePath('/palavras');
}

/**
 * Dispara a geração dos cards em segundo plano (Edge Function `enviar-cards`).
 * A function processa por trás dos panos e retorna 202 na hora; a conclusão vem por email.
 */
export async function enviarParaBaralho(entryIds: string[], deckId: string) {
  if (!entryIds.length || !deckId) return;
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('enviar-cards', {
    body: { entryIds, deckId },
  });
  if (error) throw new Error(error.message);
}
