import type { DeezerHit, Song } from './actions';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// LRCLIB responde devagar (~6–9s); timeout folgado pra não abortar antes da hora.
const TIMEOUT_MS = 12000;

/**
 * Letra do LRCLIB, DIRETO do navegador (CORS aberto) — sem desvio pelo nosso servidor.
 * Busca só por artista + título:
 *   1) /api/get  → match exato (mais rápido e mais preciso);
 *   2) /api/search → fallback fuzzy quando o título diverge (ex.: "Yellow - Remastered").
 */
export async function fetchLyrics(hit: DeezerHit): Promise<Song | null> {
  const song = (lyrics: string): Song => ({
    title: hit.title,
    artist: hit.artist,
    album: hit.album,
    lyrics,
  });

  // 1) match exato por artista + título
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
      hit.artist
    )}&track_name=${encodeURIComponent(hit.title)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.ok) {
      const d = (await r.json()) as { plainLyrics?: string; instrumental?: boolean };
      if (d?.plainLyrics && !d.instrumental) return song(d.plainLyrics);
    }
  } catch {
    /* cai no fallback */
  }

  // 2) fallback: busca fuzzy e escolhe o melhor por título/artista
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(hit.artist + ' ' + hit.title)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{
      trackName?: string;
      artistName?: string;
      plainLyrics?: string;
      instrumental?: boolean;
    }>;
    if (!Array.isArray(data)) return null;
    const nt = norm(hit.title);
    const na = norm(hit.artist);
    const withLyrics = data.filter((d) => !d.instrumental && typeof d.plainLyrics === 'string' && d.plainLyrics);
    const best =
      withLyrics.find((d) => norm(d.trackName ?? '') === nt && norm(d.artistName ?? '').includes(na)) ??
      withLyrics.find((d) => norm(d.trackName ?? '') === nt) ??
      withLyrics[0];
    return best ? song(best.plainLyrics as string) : null;
  } catch {
    return null;
  }
}
