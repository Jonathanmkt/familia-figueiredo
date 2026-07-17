'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Music, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buscarNoDeezer, type DeezerHit } from './actions';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

/**
 * Busca de música: type-ahead no Deezer (via proxy no servidor — sem CORS), com debounce.
 * Ao escolher, entrega o hit (título + artista) — a letra é buscada na tela seguinte.
 */
export function SongSearch({ onSelect }: { onSelect: (hit: DeezerHit) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef('');
  const listId = useId();

  // Type-ahead no Deezer com debounce (guard por texto contra respostas obsoletas).
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
      const hits = await buscarNoDeezer(q);
      if (latestQuery.current !== q) return;
      setResults(hits);
      setHighlight(hits.length ? 0 : -1);
      setLoading(false);
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

  const choose = (hit: DeezerHit) => {
    onSelect(hit);
    setOpen(false);
    setQuery('');
    setResults([]);
    setHighlight(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) {
        setOpen(true);
        setHighlight((h) => (h + 1) % results.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (results[highlight]) {
        e.preventDefault();
        choose(results[highlight]);
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
          className="pr-9 pl-9"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
          ) : results.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Music className="size-4" /> Nada encontrado. Tente incluir o artista.
            </li>
          ) : (
            results.map((hit, i) => (
              <li
                key={`${hit.artist}-${hit.title}-${i}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(hit);
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2',
                  i === highlight && 'bg-accent text-accent-foreground'
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{hit.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{hit.artist}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
