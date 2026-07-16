'use server';

import { createClient } from '@/lib/supabase/server';
import type { BookLanguage } from '../leitor/actions';

export type LyricHit = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  plainLyrics: string;
};

/**
 * Busca letras no LRCLIB (grátis, sem chave). Uso familiar/educacional — ver DR
 * `docs/drs/lyrics.md`. Só retorna faixas com letra (descarta instrumentais).
 */
export async function buscarLetras(query: string): Promise<LyricHit[]> {
  const q = query.trim();
  if (!q) return [];

  // Nunca lançar/travar: qualquer falha (rede, rate-limit com HTML, timeout) vira [].
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      // User-Agent no formato recomendado pelo LRCLIB (nome + versão + URL do app).
      headers: { 'User-Agent': 'FamiliaFigueiredo v1.0 (https://tools.virtuetech.com.br)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return []; // LRCLIB devolveu HTML (ex.: rate-limit) — não é JSON
    }
    if (!Array.isArray(data)) return [];

    return (data as Array<Record<string, unknown>>)
      .filter((d) => !d.instrumental && typeof d.plainLyrics === 'string' && d.plainLyrics)
      .slice(0, 20)
      .map((d) => ({
        id: d.id as number,
        trackName: d.trackName as string,
        artistName: d.artistName as string,
        albumName: (d.albumName as string | null) ?? null,
        plainLyrics: d.plainLyrics as string,
      }));
  } catch {
    return [];
  }
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
