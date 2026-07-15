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
