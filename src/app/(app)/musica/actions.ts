'use server';

import { createClient } from '@/lib/supabase/server';
import type { BookLanguage } from '../leitor/actions';

/** Música com letra — vinda do nosso catálogo (Supabase) ou do LRCLIB (online). */
export type Song = {
  title: string;
  artist: string;
  album: string | null;
  lyrics: string;
};

/**
 * Salva no catálogo local uma música achada no "buscar online" (LRCLIB) — o catálogo
 * cresce sozinho: na próxima vez essa música já aparece no type-ahead local, sem tocar o LRCLIB.
 */
export async function salvarSong(input: {
  lrclibId: number;
  artist: string;
  title: string;
  album: string | null;
  lyrics: string;
}) {
  const supabase = await createClient();
  // ignore-duplicates via upsert por lrclib_id (não falha se já existir).
  const { error } = await supabase
    .schema('leitor')
    .from('songs')
    .upsert(
      {
        lrclib_id: input.lrclibId,
        artist: input.artist,
        title: input.title,
        album: input.album,
        plain_lyrics: input.lyrics,
      },
      { onConflict: 'lrclib_id', ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

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
