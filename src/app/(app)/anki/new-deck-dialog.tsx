'use client';

import { useState, useTransition } from 'react';
import { Plus, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { createDeck, type AudioLanguage } from './actions';

export function NewDeckDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audioOn, setAudioOn] = useState(false);
  const [audioLang, setAudioLang] = useState<AudioLanguage>('en-US');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDeck(name.trim(), description.trim(), audioOn ? audioLang : null);
      setName('');
      setDescription('');
      setAudioOn(false);
      setAudioLang('en-US');
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

          {/* Áudio (TTS) */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="deck-audio" className="flex items-center gap-2">
                <Volume2 className="size-4" /> Respostas com áudio
              </Label>
              <Switch id="deck-audio" checked={audioOn} onCheckedChange={setAudioOn} />
            </div>
            {audioOn && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Idioma do áudio</span>
                <RadioGroup
                  value={audioLang}
                  onValueChange={(v) => setAudioLang(v as AudioLanguage)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="en-US" id="lang-en" />
                    <Label htmlFor="lang-en" className="font-normal">
                      Inglês (EUA)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pt-BR" id="lang-pt" />
                    <Label htmlFor="lang-pt" className="font-normal">
                      Português (BR)
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Escreva as respostas no idioma escolhido — o áudio fala esse texto.
                </p>
              </div>
            )}
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
