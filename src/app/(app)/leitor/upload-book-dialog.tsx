'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { createBook, type BookLanguage } from './actions';

export function UploadBookDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState<BookLanguage>('en-US');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (f: File | null) => {
    setFile(f);
    // Sugere o título a partir do nome do arquivo (o usuário pode editar)
    if (f && !title.trim()) setTitle(f.name.replace(/\.epub$/i, '').replace(/[-_]+/g, ' '));
  };

  const handleUpload = () => {
    if (!file || !title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const storagePath = `${crypto.randomUUID()}.epub`;
        const { error: uploadError } = await supabase.storage
          .from('books')
          .upload(storagePath, file, { contentType: 'application/epub+zip' });
        if (uploadError) throw new Error(uploadError.message);

        await createBook({ title: title.trim(), author: author.trim(), language, storagePath });

        setFile(null);
        setTitle('');
        setAuthor('');
        setLanguage('en-US');
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha no upload.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <Plus /> Adicionar livro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar livro</DialogTitle>
          <DialogDescription>
            Envie um arquivo EPUB para a biblioteca da família.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="book-file">Arquivo EPUB</Label>
            <Input
              id="book-file"
              type="file"
              accept=".epub,application/epub+zip"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book-title">Título</Label>
            <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book-author">Autor (opcional)</Label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Idioma do livro</Label>
            <RadioGroup
              value={language}
              onValueChange={(v) => setLanguage(v as BookLanguage)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="en-US" id="book-lang-en" />
                <Label htmlFor="book-lang-en" className="font-normal">
                  Inglês (EUA)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pt-BR" id="book-lang-pt" />
                <Label htmlFor="book-lang-pt" className="font-normal">
                  Português (BR)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Define o idioma do áudio e a direção das traduções ao marcar palavras.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={isPending || !file || !title.trim()}>
            {isPending ? 'Enviando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
