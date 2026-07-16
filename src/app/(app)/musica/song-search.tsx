'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LyricHit } from './actions';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

// Cache em memória (por sessão): dedupe de buscas repetidas → menos chamadas ao LRCLIB.
const searchCache = new Map<string, LyricHit[]>();

/**
 * Busca no LRCLIB DIRETO do navegador (não pelo servidor): distribui as chamadas pelos IPs
 * residenciais de cada pessoa, evitando o IP único da VPS e a proteção anti-bot. CORS é aberto
 * (`access-control-allow-origin: *`). O navegador manda o próprio User-Agent (aceito pelo LRCLIB).
 */
async function searchLyrics(q: string): Promise<LyricHit[]> {
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const hits: LyricHit[] = (data as Array<Record<string, unknown>>)
      .filter((d) => !d.instrumental && typeof d.plainLyrics === 'string' && d.plainLyrics)
      .slice(0, 20)
      .map((d) => ({
        id: d.id as number,
        trackName: d.trackName as string,
        artistName: d.artistName as string,
        albumName: (d.albumName as string | null) ?? null,
        plainLyrics: d.plainLyrics as string,
      }));
    searchCache.set(key, hits);
    return hits;
  } catch {
    return [];
  }
}

/** Combobox de busca ao vivo de letras (LRCLIB), com debounce e navegação por teclado. */
export function SongSearch({ onSelect }: { onSelect: (hit: LyricHit) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LyricHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef(''); // guard por texto: só aplica a resposta da busca ATUAL
  const listId = useId();

  // Busca com debounce a partir do 3º caractere.
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    if (q.length < MIN_CHARS) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    const t = setTimeout(async () => {
      try {
        const hits = await searchLyrics(q);
        if (latestQuery.current !== q) return; // já não é a busca atual → descarta
        setResults(hits);
        setHighlight(hits.length ? 0 : -1);
      } catch {
        if (latestQuery.current !== q) return;
        setResults([]);
      } finally {
        if (latestQuery.current === q) setLoading(false);
      }
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

  const choose = (hit: LyricHit) => {
    onSelect(hit);
    setOpen(false);
    setQuery('');
    setResults([]);
    setHighlight(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && results.length) setOpen(true);
      setHighlight((h) => (results.length ? (h + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (results.length ? (h - 1 + results.length) % results.length : -1));
    } else if (e.key === 'Enter') {
      if (open && results[highlight]) {
        e.preventDefault();
        choose(results[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && highlight >= 0 ? `${listId}-opt-${highlight}` : undefined}
          placeholder="Música e artista (ex.: yesterday beatles)"
          className="pr-9 pl-9"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && query.trim().length >= MIN_CHARS && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma letra encontrada. Tente incluir o artista.
            </li>
          ) : (
            results.map((hit, i) => (
              <li
                key={hit.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // não deixa o input perder o foco antes do clique
                  choose(hit);
                }}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-2',
                  i === highlight && 'bg-accent text-accent-foreground'
                )}
              >
                <p className="truncate text-sm font-medium">{hit.trackName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {hit.artistName}
                  {hit.albumName ? ` · ${hit.albumName}` : ''}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
