'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { MAX_PDF_MB } from './constants';

export function UploadBookDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const language: BookLanguage = 'en-US'; // projeto é só inglês
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPdf = !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));

  const handleFile = (f: File | null) => {
    setFile(f);
    setError(null);
    // Sugere o título a partir do nome do arquivo (o usuário pode editar)
    if (f && !title.trim()) setTitle(f.name.replace(/\.(epub|pdf)$/i, '').replace(/[-_]+/g, ' '));
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setAuthor('');
    setOpen(false);
  };

  const handleUpload = () => {
    if (!file || !title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();

        if (isPdf) {
          if (file.size > MAX_PDF_MB * 1024 * 1024) {
            throw new Error(`PDF muito grande (máx. ${MAX_PDF_MB} MB).`);
          }
          // Converte PDF→EPUB no PRÓPRIO navegador (pdfjs + fflate), sobe o EPUB pronto.
          const { pdfToEpub } = await import('@/lib/leitor/pdf-to-epub');
          const epub = await pdfToEpub(file, title.trim(), author.trim());
          const storagePath = `${crypto.randomUUID()}.epub`;
          const { error: upErr } = await supabase.storage
            .from('books')
            .upload(storagePath, epub, { contentType: 'application/epub+zip' });
          if (upErr) throw new Error(upErr.message);

          await createBook({ title: title.trim(), author: author.trim(), language, storagePath });
        } else {
          const storagePath = `${crypto.randomUUID()}.epub`;
          const { error: upErr } = await supabase.storage
            .from('books')
            .upload(storagePath, file, { contentType: 'application/epub+zip' });
          if (upErr) throw new Error(upErr.message);

          await createBook({ title: title.trim(), author: author.trim(), language, storagePath });
        }

        reset();
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
            Envie um EPUB ou um PDF de texto para a biblioteca da família.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="book-file">Arquivo (EPUB ou PDF)</Label>
            <Input
              id="book-file"
              type="file"
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF deve ser de texto real (não escaneado), até {MAX_PDF_MB} MB — será convertido para EPUB.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book-title">Título</Label>
            <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book-author">Autor (opcional)</Label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={isPending || !file || !title.trim()}>
            {isPending ? (isPdf ? 'Convertendo…' : 'Enviando…') : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
