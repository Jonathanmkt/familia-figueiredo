'use client';

import { useMemo, useState, useTransition } from 'react';
import { Trash2, Vault } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteWordBankEntries } from './actions';
import { ListenWordButton } from './listen-word-button';
import { SendToDeckDialog } from './send-to-deck-dialog';
import type { WordStatus } from './status';

export type WordItem = {
  id: string;
  selected_text: string;
  translation_common: string | null;
  translation_contextual: string | null;
  context_explanation: string | null;
  paragraph_context: string | null;
  language: string;
  created_at: string;
  bookTitle: string | null;
  status: WordStatus;
};

export function WordBankTabs({ items }: { items: WordItem[] }) {
  const grupos = useMemo(
    () => ({
      disponivel: items.filter((i) => i.status === 'disponivel'),
      estudando: items.filter((i) => i.status === 'estudando'),
      concluida: items.filter((i) => i.status === 'concluida'),
    }),
    [items]
  );

  return (
    <Tabs defaultValue="disponivel">
      <TabsList>
        <TabsTrigger value="disponivel">Disponíveis ({grupos.disponivel.length})</TabsTrigger>
        <TabsTrigger value="estudando">Estudando ({grupos.estudando.length})</TabsTrigger>
        <TabsTrigger value="concluida">Concluídas ({grupos.concluida.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="disponivel">
        <DisponiveisTab items={grupos.disponivel} />
      </TabsContent>
      <TabsContent value="estudando">
        <ReadOnlyList
          items={grupos.estudando}
          vazio="Nada em estudo ainda. Envie palavras de “Disponíveis” para um baralho."
        />
      </TabsContent>
      <TabsContent value="concluida">
        <ReadOnlyList
          items={grupos.concluida}
          vazio="Nenhuma concluída ainda. Uma palavra conclui quando você a domina por muito tempo."
        />
      </TabsContent>
    </Tabs>
  );
}

/** Aba Disponíveis: seleção + barra Enviar/Apagar (padrão caixa de entrada). */
function DisponiveisTab({ items }: { items: WordItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleting] = useTransition();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDelete = () => {
    const ids = [...selected];
    startDeleting(async () => {
      await deleteWordBankEntries(ids);
      setSelected(new Set());
    });
  };

  if (!items.length) {
    return (
      <EmptyState texto="Nada disponível. Marque palavras no Leitor e salve no banco." />
    );
  }

  const selecionadas = items.filter((i) => selected.has(i.id));

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {selected.size} selecionada{selected.size === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <SendToDeckDialog items={selecionadas} onSent={() => setSelected(new Set())} />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 /> Apagar
            </Button>
          </div>
        </div>
      )}

      {items.map((item) => (
        <WordCard
          key={item.id}
          item={item}
          selectable
          checked={selected.has(item.id)}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}

function ReadOnlyList({ items, vazio }: { items: WordItem[]; vazio: string }) {
  if (!items.length) return <EmptyState texto={vazio} />;
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <WordCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Vault className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{texto}</p>
      </CardContent>
    </Card>
  );
}

function WordCard({
  item,
  selectable = false,
  checked = false,
  onToggle,
}: {
  item: WordItem;
  selectable?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          {selectable && (
            <Checkbox
              checked={checked}
              onCheckedChange={onToggle}
              aria-label="Selecionar para a lista"
              className="mt-1"
            />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <p className="truncate text-base font-semibold">{item.selected_text}</p>
            <ListenWordButton text={item.selected_text} language={item.language} />
          </div>
        </div>

        {(item.translation_common || item.translation_contextual) && (
          <div className="flex flex-col gap-1 pl-6 text-sm">
            {item.translation_common && (
              <p>
                <span className="text-xs text-muted-foreground">Tradução: </span>
                {item.translation_common}
              </p>
            )}
            {item.translation_contextual && (
              <p>
                <span className="text-xs text-muted-foreground">No contexto: </span>
                {item.translation_contextual}
              </p>
            )}
            {item.context_explanation && (
              <p className="text-xs text-muted-foreground">{item.context_explanation}</p>
            )}
          </div>
        )}

        {item.paragraph_context && (
          <p className="line-clamp-2 pl-6 text-xs text-muted-foreground italic">
            “{item.paragraph_context}”
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pl-6">
          {item.bookTitle && <Badge variant="outline">{item.bookTitle}</Badge>}
          <span className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
