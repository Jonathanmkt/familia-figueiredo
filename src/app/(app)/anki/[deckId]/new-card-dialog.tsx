'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { createCard } from '../actions';

export function NewCardDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!front.trim() || !back.trim()) return;
    startTransition(async () => {
      await createCard(deckId, front.trim(), back.trim());
      setFront('');
      setBack('');
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Novo cartão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cartão</DialogTitle>
          <DialogDescription>Escreva a pergunta (frente) e a resposta (verso).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="card-front">Frente</Label>
            <Textarea
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Pergunta..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="card-back">Verso</Label>
            <Textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Resposta..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={isPending || !front.trim() || !back.trim()}>
            {isPending ? 'Adicionando...' : 'Adicionar cartão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
