'use client';

import { useState, useTransition } from 'react';
import { Send, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { deleteWordBankEntries } from './actions';
import { ListenWordButton } from './listen-word-button';

type Entry = {
  id: string;
  selected_text: string;
  translation_common: string | null;
  translation_contextual: string | null;
  context_explanation: string | null;
  paragraph_context: string | null;
  language: string;
  created_at: string;
  bookTitle: string | null;
};

export function WordBankList({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleting] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const ids = [...selected];
    startDeleting(async () => {
      await deleteWordBankEntries(ids);
      setSelected(new Set());
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {selected.size} selecionada{selected.size === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" title="Enviar para um baralho (em breve)" disabled>
              <Send /> Enviar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 /> Apagar
            </Button>
          </div>
        </div>
      )}

      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selected.has(entry.id)}
                onCheckedChange={() => toggle(entry.id)}
                aria-label="Selecionar para a lista"
                className="mt-1"
              />
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <p className="truncate text-base font-semibold">{entry.selected_text}</p>
                <ListenWordButton text={entry.selected_text} language={entry.language} />
              </div>
            </div>

            {(entry.translation_common || entry.translation_contextual) && (
              <div className="flex flex-col gap-1 pl-6 text-sm">
                {entry.translation_common && (
                  <p>
                    <span className="text-xs text-muted-foreground">Tradução: </span>
                    {entry.translation_common}
                  </p>
                )}
                {entry.translation_contextual && (
                  <p>
                    <span className="text-xs text-muted-foreground">No contexto: </span>
                    {entry.translation_contextual}
                  </p>
                )}
                {entry.context_explanation && (
                  <p className="text-xs text-muted-foreground">{entry.context_explanation}</p>
                )}
              </div>
            )}

            {entry.paragraph_context && (
              <p className="line-clamp-2 pl-6 text-xs text-muted-foreground italic">
                “{entry.paragraph_context}”
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pl-6">
              <Badge variant="secondary">
                {entry.language === 'en-US' ? 'Inglês (EUA)' : 'Português (BR)'}
              </Badge>
              {entry.bookTitle && <Badge variant="outline">{entry.bookTitle}</Badge>}
              <span className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
