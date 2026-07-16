'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Globe, Loader2, Music, Search } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { salvarSong, type Song } from './actions';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

type OnlineHit = { id: number; title: string; artist: string; album: string | null; lyrics: string };

// Cache do "buscar online" (LRCLIB) por sessão.
const onlineCache = new Map<string, OnlineHit[]>();

/** Busca online no LRCLIB, DIRETO do navegador (só sob demanda, no clique). */
async function searchOnlineLRCLIB(q: string): Promise<OnlineHit[]> {
  const key = q.toLowerCase();
  const cached = onlineCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const hits: OnlineHit[] = (data as Array<Record<string, unknown>>)
      .filter((d) => !d.instrumental && typeof d.plainLyrics === 'string' && d.plainLyrics)
      .slice(0, 20)
      .map((d) => ({
        id: d.id as number,
        title: d.trackName as string,
        artist: d.artistName as string,
        album: (d.albumName as string | null) ?? null,
        lyrics: d.plainLyrics as string,
      }));
    onlineCache.set(key, hits);
    return hits;
  } catch {
    return [];
  }
}

/**
 * Busca de música: type-ahead no NOSSO catálogo (Supabase, instantâneo, sem tocar o LRCLIB).
 * Quando não acha (ou quer outra versão), um item "Buscar online" chama o LRCLIB sob demanda
 * e salva o achado no catálogo (que cresce sozinho).
 */
export function SongSearch({ onSelect }: { onSelect: (song: Song) => void }) {
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState<Song[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [online, setOnline] = useState<OnlineHit[] | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef('');
  const listId = useId();

  // Type-ahead LOCAL (Supabase) com debounce.
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    setMode('local');
    setOnline(null);
    if (q.length < MIN_CHARS) {
      setLocal([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.schema('leitor').rpc('search_songs', { q });
      if (latestQuery.current !== q) return;
      const songs: Song[] = (data ?? []).map((r) => ({
        title: r.title,
        artist: r.artist,
        album: r.album,
        lyrics: r.plain_lyrics,
      }));
      setLocal(songs);
      setHighlight(songs.length ? 0 : -1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Fecha ao clicar fora.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const reset = () => {
    setOpen(false);
    setQuery('');
    setLocal([]);
    setOnline(null);
    setMode('local');
    setHighlight(-1);
  };

  const goOnline = async () => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return;
    setMode('online');
    setLoadingOnline(true);
    setOnline(null);
    const hits = await searchOnlineLRCLIB(q);
    if (latestQuery.current !== q) return;
    setLoadingOnline(false);
    setOnline(hits);
  };

  const chooseLocal = (song: Song) => {
    onSelect(song);
    reset();
  };

  const chooseOnline = (hit: OnlineHit) => {
    // Alimenta o catálogo (não bloqueia a abertura) e abre a letra.
    void salvarSong({ lrclibId: hit.id, artist: hit.artist, title: hit.title, album: hit.album, lyrics: hit.lyrics });
    onSelect({ title: hit.title, artist: hit.artist, album: hit.album, lyrics: hit.lyrics });
    reset();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (mode !== 'local') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (local.length) {
        setOpen(true);
        setHighlight((h) => (h + 1) % local.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (local.length) setHighlight((h) => (h - 1 + local.length) % local.length);
    } else if (e.key === 'Enter') {
      if (local[highlight]) {
        e.preventDefault();
        chooseLocal(local[highlight]);
      } else if (query.trim().length >= MIN_CHARS) {
        e.preventDefault();
        void goOnline();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= MIN_CHARS;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query.trim().length >= MIN_CHARS && setOpen(true)}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Música e artista (ex.: coldplay yellow)"
          className="pl-9"
        />
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {mode === 'local' ? (
            <>
              {local.map((song, i) => (
                <li
                  key={`${song.artist}-${song.title}-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseLocal(song);
                  }}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-2',
                    i === highlight && 'bg-accent text-accent-foreground'
                  )}
                >
                  <p className="truncate text-sm font-medium">{song.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                </li>
              ))}

              {/* Ação sob demanda: buscar no LRCLIB (não dispara sozinho) */}
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  void goOnline();
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border-t px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Globe className="size-4 shrink-0" />
                {local.length === 0
                  ? `Não está no catálogo — buscar “${query.trim()}” online`
                  : `Não achou? Buscar “${query.trim()}” online`}
              </li>
            </>
          ) : (
            <>
              <li className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Resultados online (LRCLIB)
              </li>
              {loadingOnline ? (
                <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Buscando online…
                </li>
              ) : (online?.length ?? 0) === 0 ? (
                <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Music className="size-4" /> Nada encontrado online.
                </li>
              ) : (
                online?.map((hit) => (
                  <li
                    key={hit.id}
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseOnline(hit);
                    }}
                    className="cursor-pointer rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    <p className="truncate text-sm font-medium">{hit.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {hit.artist}
                      {hit.album ? ` · ${hit.album}` : ''}
                    </p>
                  </li>
                ))
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
