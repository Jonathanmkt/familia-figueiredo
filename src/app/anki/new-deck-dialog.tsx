'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { createDeck } from './actions';

export function NewDeckDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDeck(name.trim(), description.trim());
      setName('');
      setDescription('');
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <Plus /> Novo baralho
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo baralho</DialogTitle>
          <DialogDescription>Dê um nome ao seu novo baralho de estudo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="deck-name">Nome</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Vocabulário em inglês"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deck-desc">Descrição (opcional)</Label>
            <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? 'Criando...' : 'Criar baralho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
