'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Search, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

/** Bloco de seção com título. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Swatch de um token de cor. */
function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border ${className}`} />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

export function StyleGuide() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Style Guide</h1>
            <p className="text-sm text-muted-foreground">
              Laboratório de tokens e componentes — Família Figueiredo
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </header>

        {/* Tokens de cor */}
        <Section title="Tokens de cor">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="primary (azul)" className="bg-primary" />
            <Swatch name="brand (vermelho)" className="bg-brand" />
            <Swatch name="secondary" className="bg-secondary" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="destructive" className="bg-destructive" />
            <Swatch name="border" className="bg-border" />
            <Swatch name="card" className="bg-card" />
          </div>
        </Section>

        {/* Superfícies */}
        <Section title="Superfícies e containers">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card</CardTitle>
                <CardDescription>Superfície padrão de conteúdo.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Conteúdo do card sobre <code>bg-card</code>.
              </CardContent>
            </Card>
            <div className="rounded-xl border bg-muted p-6">
              <p className="text-sm font-medium">Container muted</p>
              <p className="text-sm text-muted-foreground">
                Bloco neutro (<code>bg-muted</code>) para agrupar.
              </p>
            </div>
          </div>
        </Section>

        {/* Tipografia */}
        <Section title="Tipografia">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Título H1</h1>
            <h2 className="text-2xl font-semibold tracking-tight">Título H2</h2>
            <h3 className="text-xl font-semibold">Título H3</h3>
            <p className="text-base">
              Parágrafo padrão. O texto do corpo herda a fonte Geist.
            </p>
            <p className="text-sm text-muted-foreground">
              Texto secundário / muted-foreground.
            </p>
          </div>
        </Section>

        {/* Botões */}
        <Section title="Botões — variantes">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Default (azul)</Button>
            <Button variant="brand">Brand (vermelho)</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button>
              <Plus /> Com ícone
            </Button>
            <Button variant="outline" size="icon">
              <Search />
            </Button>
            <Button variant="destructive" size="icon">
              <Trash2 />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        {/* Formulário */}
        <Section title="Campos de formulário">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" placeholder="Digite seu nome" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Opção A</SelectItem>
                  <SelectItem value="b">Opção B</SelectItem>
                  <SelectItem value="c">Opção C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="msg">Mensagem</Label>
              <Textarea id="msg" placeholder="Escreva algo..." />
            </div>
          </div>
        </Section>

        {/* Dialog */}
        <Section title="Modal (Dialog)">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="brand">Abrir modal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exemplo de modal</DialogTitle>
                <DialogDescription>
                  Diálogo padrão do shadcn sobre o tema da Família Figueiredo.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Confirmar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>
      </div>
    </div>
  );
}
