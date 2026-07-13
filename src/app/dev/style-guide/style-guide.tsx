'use client';

import { Search, Plus, Bell, ChevronDown, Check, Info, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Toaster } from '@/components/ui/sonner';
import { ThemeControls } from '../_components/theme-controls';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border ${className}`} />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

const MEMBROS = [
  { nome: 'Maria Figueiredo', papel: 'Matriarca', status: 'Ativo', variant: 'success' as const },
  { nome: 'João Figueiredo', papel: 'Filho', status: 'Ativo', variant: 'success' as const },
  { nome: 'Pedro Figueiredo', papel: 'Neto', status: 'Pendente', variant: 'warning' as const },
];

export function StyleGuide() {
  return (
    <TooltipProvider>
      <Toaster />
      <div className="min-h-screen text-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
          {/* Header + controle de tema */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Style Guide</h1>
              <p className="text-sm text-muted-foreground">
                Componentes do projeto — troque o preset pra reskin ao vivo
              </p>
            </div>
            <ThemeControls />
          </header>

          {/* Tokens de cor */}
          <Section title="Tokens de cor">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Swatch name="primary" className="bg-primary" />
              <Swatch name="brand" className="bg-brand" />
              <Swatch name="secondary" className="bg-secondary" />
              <Swatch name="muted" className="bg-muted" />
              <Swatch name="accent" className="bg-accent" />
              <Swatch name="border" className="bg-border" />
              <Swatch name="card" className="bg-card" />
              <Swatch name="foreground" className="bg-foreground" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">Feedback</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Swatch name="destructive" className="bg-destructive" />
              <Swatch name="success" className="bg-success" />
              <Swatch name="warning" className="bg-warning" />
              <Swatch name="info" className="bg-info" />
            </div>
          </Section>

          {/* Superfícies */}
          <Section title="Superfícies e containers">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Card</CardTitle>
                  <CardDescription>Conteúdo principal (bg-card).</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No preset glass ganha vidro (blur) automático.
                </CardContent>
              </Card>
              <div className="rounded-xl border bg-muted p-6">
                <p className="text-sm font-medium">Container muted</p>
                <p className="text-sm text-muted-foreground">Bloco recuado para agrupar.</p>
              </div>
              <div className="surface-glass rounded-xl p-6">
                <p className="text-sm font-medium">Container glass</p>
                <p className="text-sm text-muted-foreground">Vidro que se adapta ao preset.</p>
              </div>
            </div>
          </Section>

          {/* Botões */}
          <Section title="Botões">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button variant="brand">Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button>
                <Plus /> Com ícone
              </Button>
              <Button variant="outline" size="icon">
                <Search />
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
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
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
            <div className="flex flex-wrap items-center gap-8 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox id="chk" defaultChecked />
                <Label htmlFor="chk">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="sw" defaultChecked />
                <Label htmlFor="sw">Switch</Label>
              </div>
              <RadioGroup defaultValue="1" className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="r1" />
                  <Label htmlFor="r1">Opção 1</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="r2" />
                  <Label htmlFor="r2">Opção 2</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Label>Slider</Label>
              <Slider defaultValue={[60]} max={100} step={1} className="max-w-xs" />
            </div>
          </Section>

          {/* Tabs */}
          <Section title="Tabs">
            <Tabs defaultValue="membros" className="w-full">
              <TabsList>
                <TabsTrigger value="membros">Membros</TabsTrigger>
                <TabsTrigger value="eventos">Eventos</TabsTrigger>
                <TabsTrigger value="financas">Finanças</TabsTrigger>
              </TabsList>
              <TabsContent value="membros" className="pt-3 text-sm text-muted-foreground">
                Conteúdo da aba Membros.
              </TabsContent>
              <TabsContent value="eventos" className="pt-3 text-sm text-muted-foreground">
                Conteúdo da aba Eventos.
              </TabsContent>
              <TabsContent value="financas" className="pt-3 text-sm text-muted-foreground">
                Conteúdo da aba Finanças.
              </TabsContent>
            </Tabs>
          </Section>

          {/* Tabela (lista) */}
          <Section title="Tabela / Lista">
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MEMBROS.map((m) => (
                    <TableRow key={m.nome}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{m.papel}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={m.variant}>{m.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Acordeão */}
          <Section title="Acordeão">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="a">
                <AccordionTrigger>O que é a Família Figueiredo?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  App de organização da família — eventos, membros, finanças.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Como funciona o tema?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Presets de token trocáveis ao vivo (schema + valores).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Alertas */}
          <Section title="Alertas">
            <div className="flex flex-col gap-3">
              <Alert>
                <Info />
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>Um aviso neutro para o usuário.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>Algo requer sua ação imediata.</AlertDescription>
              </Alert>
            </div>
          </Section>

          {/* Avatar + Dropdown + Tooltip + Popover */}
          <Section title="Avatar, menu, tooltip e popover">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar>
                <AvatarFallback>MF</AvatarFallback>
              </Avatar>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Menu <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Perfil</DropdownMenuItem>
                  <DropdownMenuItem>Configurações</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Bell />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notificações</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Abrir popover</Button>
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  Conteúdo flutuante — filtros, ações rápidas, etc.
                </PopoverContent>
              </Popover>
            </div>
          </Section>

          {/* Progresso + Skeleton */}
          <Section title="Progresso e carregamento">
            <div className="flex flex-col gap-4">
              <Progress value={62} />
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Overlays: Modal + Toast */}
          <Section title="Modal e Toast">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="brand">Abrir modal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Exemplo de modal</DialogTitle>
                    <DialogDescription>Re-skina junto com o preset.</DialogDescription>
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

              <Button
                variant="outline"
                onClick={() =>
                  toast.success('Evento criado', { description: 'Aniversário da Vó Maria · 12 JUL' })
                }
              >
                <Check /> Disparar toast
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </TooltipProvider>
  );
}
