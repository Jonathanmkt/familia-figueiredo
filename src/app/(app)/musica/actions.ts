'use server';

import { createClient } from '@/lib/supabase/server';
import type { BookLanguage } from '../leitor/actions';

/** Resultado de busca de letra (a busca em si roda no cliente — ver `song-search.tsx`). */
export type LyricHit = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  plainLyrics: string;
};

/** Salva uma seleção da letra no banco de palavras (source_type = 'song'). */
export async function salvarSelecaoMusica(input: {
  selectedText: string;
  paragraphContext: string;
  language: BookLanguage;
  translationCommon: string | null;
  translationContextual: string | null;
  contextExplanation: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('word_bank').insert({
    book_id: null,
    source_type: 'song',
    selected_text: input.selectedText,
    paragraph_context: input.paragraphContext || null,
    location_cfi: null,
    language: input.language,
    translation_common: input.translationCommon,
    translation_contextual: input.translationContextual,
    context_explanation: input.contextExplanation,
  });
  if (error) throw new Error(error.message);
}
