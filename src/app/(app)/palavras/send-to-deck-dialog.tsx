'use client';

import { useEffect, useState, useTransition } from 'react';
import { MailCheck, Send } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { enviarParaBaralho } from './actions';
import type { WordItem } from './word-bank-tabs';

type Deck = { id: string; name: string };

export function SendToDeckDialog({ items, onSent }: { items: WordItem[]; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [deckId, setDeckId] = useState<string>('');
  const [phase, setPhase] = useState<'form' | 'sent'>('form');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Carrega os baralhos do usuário ao abrir.
  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setError(null);
    const supabase = createClient();
    supabase
      .schema('anki')
      .from('decks')
      .select('id, name')
      .order('created_at', { ascending: false })
      .then(({ data }) => setDecks(data ?? []));
  }, [open]);

  const handleSend = () => {
    if (!deckId) return;
    setError(null);
    startTransition(async () => {
      try {
        await enviarParaBaralho(
          items.map((i) => i.id),
          deckId
        );
        setPhase('sent');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send /> Enviar
        </Button>
      </DialogTrigger>
      <DialogContent>
        {phase === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Enviar {items.length} para um baralho</DialogTitle>
              <DialogDescription>
                A IA vai criar uma frase de treino para cada palavra e inserir no baralho escolhido.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label>Baralho</Label>
              {decks === null ? (
                <p className="text-sm text-muted-foreground">Carregando baralhos…</p>
              ) : decks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem baralhos. Crie um em “Anki” primeiro.
                </p>
              ) : (
                <Select value={deckId} onValueChange={setDeckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um baralho" />
                  </SelectTrigger>
                  <SelectContent>
                    {decks.map((deck) => (
                      <SelectItem key={deck.id} value={deck.id}>
                        {deck.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSend} disabled={isPending || !deckId}>
                {isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="size-5 text-success" /> Enviado!
              </DialogTitle>
              <DialogDescription>
                Em alguns instantes os cards estarão no baralho selecionado. Você receberá um email
                quando terminar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  onSent();
                }}
              >
                Ok
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
