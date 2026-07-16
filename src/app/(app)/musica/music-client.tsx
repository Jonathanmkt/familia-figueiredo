'use client';

import { useRef, useState, useTransition } from 'react';
import { ArrowLeft, BookmarkPlus, Check, Copy, Languages, Sparkles, Volume2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paragraphOf } from '@/lib/leitor/words';
import {
  traduzir,
  traduzirNoContexto,
  type BookLanguage,
  type ContextualTranslation,
} from '../leitor/actions';
import { salvarSelecaoMusica, type Song } from './actions';
import { SongSearch } from './song-search';

type Sel = { text: string; paragraph: string; pos: { left: number; top: number } };
type Panel = {
  common?: string;
  contextual?: ContextualTranslation;
  loading: 'common' | 'contextual' | null;
  error?: string;
};

export function MusicClient() {
  const [track, setTrack] = useState<Song | null>(null);
  const language: BookLanguage = 'en-US'; // música: só inglês

  const lyricsRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [panel, setPanel] = useState<Panel>({ loading: null });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language;
    window.speechSynthesis.speak(u);
  };

  const onSelect = () => {
    const container = lyricsRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSel(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const text = range.toString().replace(/\s+/g, ' ').trim();
    if (!text) {
      setSel(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    const left = Math.max(150, Math.min(rect.left + rect.width / 2 - box.left, box.width - 150));
    const top = rect.bottom - box.top + 8;
    setPanel({ loading: null });
    setFeedback(null);
    setSel({ text, paragraph: paragraphOf(range), pos: { left, top } });
  };

  const handleTranslate = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'common', error: undefined }));
    traduzir(sel.text, language)
      .then((r) => setPanel((p) => ({ ...p, common: r, loading: null })))
      .catch((e) => setPanel((p) => ({ ...p, loading: null, error: msg(e) })));
  };

  const handleContextual = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'contextual', error: undefined }));
    traduzirNoContexto(sel.text, sel.paragraph, language)
      .then((r) => setPanel((p) => ({ ...p, contextual: r, loading: null })))
      .catch((e) => setPanel((p) => ({ ...p, loading: null, error: msg(e) })));
  };

  const handleSave = () => {
    if (!sel || isSaving) return;
    startSaving(async () => {
      try {
        await salvarSelecaoMusica({
          selectedText: sel.text,
          paragraphContext: sel.paragraph,
          language,
          translationCommon: panel.common ?? null,
          translationContextual: panel.contextual?.traducao ?? null,
          contextExplanation: panel.contextual?.explicacao ?? null,
        });
        setFeedback('Salvo no banco de palavras ✓');
      } catch {
        setFeedback('Não foi possível salvar.');
      }
    });
  };

  const closeMenu = () => {
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  // ── Leitura da letra selecionada ──
  if (track) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTrack(null)}>
            <ArrowLeft /> Voltar
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
        </div>

        <Card>
          <CardContent className="relative">
            <div
              ref={lyricsRef}
              onMouseUp={onSelect}
              onTouchEnd={onSelect}
              className="flex flex-col gap-1 leading-relaxed whitespace-pre-wrap select-text"
            >
              {track.lyrics.split('\n').map((line, i) => (
                <p key={i} className={line.trim() ? '' : 'h-3'}>
                  {line}
                </p>
              ))}
            </div>

            {sel && (
              <div
                className="absolute z-20 w-[300px] -translate-x-1/2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md"
                style={{ left: sel.pos.left, top: sel.pos.top }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between gap-2 pb-1.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{sel.text}</p>
                  <Button variant="ghost" size="icon" className="size-6" onClick={closeMenu} aria-label="Fechar">
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={() => navigator.clipboard.writeText(sel.text).then(() => setFeedback('Copiado ✓'))} title="Copiar">
                    <Copy />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={() => speak(sel.text)} title="Ouvir">
                    <Volume2 />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleTranslate} title="Traduzir" disabled={panel.loading === 'common'}>
                    <Languages />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleContextual} title="Traduzir no contexto (IA)" disabled={panel.loading === 'contextual'}>
                    <Sparkles />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleSave} title="Salvar no banco" disabled={isSaving}>
                    <BookmarkPlus />
                  </Button>
                </div>

                {(panel.loading || panel.common || panel.contextual || panel.error || feedback) && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t pt-2 text-sm">
                    {panel.loading === 'common' && <p className="text-xs text-muted-foreground">Traduzindo...</p>}
                    {panel.loading === 'contextual' && <p className="text-xs text-muted-foreground">Analisando o contexto...</p>}
                    {panel.common && (
                      <p>
                        <span className="text-xs text-muted-foreground">Tradução: </span>
                        {panel.common}
                      </p>
                    )}
                    {panel.contextual && (
                      <div className="flex flex-col gap-0.5">
                        <p>
                          <span className="text-xs text-muted-foreground">No contexto: </span>
                          {panel.contextual.traducao}
                        </p>
                        {panel.contextual.explicacao && (
                          <p className="text-xs text-muted-foreground">{panel.contextual.explicacao}</p>
                        )}
                      </div>
                    )}
                    {panel.error && <p className="text-xs text-destructive">{panel.error}</p>}
                    {feedback && (
                      <p className="flex items-center gap-1 text-xs text-success">
                        <Check className="size-3.5" /> {feedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Busca (catálogo local + fallback online) ──
  return (
    <SongSearch
      onSelect={(song) => {
        setTrack(song);
        setSel(null);
      }}
    />
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Falhou.';
}
