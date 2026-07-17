'use server';

import { createClient } from '@/lib/supabase/server';
import type { BookLanguage } from '../leitor/actions';

/** Música com letra — descoberta no Deezer + letra do LRCLIB (buscada no cliente). */
export type Song = {
  title: string;
  artist: string;
  album: string | null;
  lyrics: string;
};

/** Resultado de descoberta (metadados) — ainda SEM letra. */
export type DeezerHit = {
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
};

/**
 * Descoberta via Deezer (proxy no servidor — a API do Deezer não tem CORS). Só metadados
 * (título/artista/álbum/duração), sem letra. Ver DR `docs/drs/lyricsdoublesource.md`.
 */
export async function buscarNoDeezer(q: string): Promise<DeezerHit[]> {
  const query = q.trim();
  if (!query) return [];
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: Array<{ title?: string; duration?: number; artist?: { name?: string }; album?: { title?: string } }>;
    };
    const seen = new Set<string>();
    const hits: DeezerHit[] = [];
    for (const t of data.data ?? []) {
      const artist = t.artist?.name ?? '';
      if (!t.title || !artist) continue;
      const key = (artist + '::' + t.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ title: t.title, artist, album: t.album?.title ?? null, duration: t.duration ?? null });
    }
    return hits;
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
