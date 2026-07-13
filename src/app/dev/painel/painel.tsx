'use client';

import {
  Home,
  Users,
  CalendarDays,
  Wallet,
  FileText,
  Settings,
  Search,
  Plus,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeControls } from '../_components/theme-controls';

const NAV = [
  { icon: Home, label: 'Início', active: true },
  { icon: Users, label: 'Membros' },
  { icon: CalendarDays, label: 'Eventos' },
  { icon: Wallet, label: 'Finanças' },
  { icon: FileText, label: 'Documentos' },
  { icon: Settings, label: 'Configurações' },
];

const STATS = [
  { icon: Users, label: 'Membros', value: '14', trend: '+2 este ano' },
  { icon: CalendarDays, label: 'Próximos eventos', value: '3', trend: 'esta semana' },
  { icon: Wallet, label: 'Caixa da família', value: 'R$ 1.240', trend: '+8%' },
  { icon: FileText, label: 'Documentos', value: '28', trend: '3 novos' },
];

const EVENTOS = [
  { dia: '12', mes: 'JUL', titulo: 'Aniversário da Vó Maria', sub: '19h · Casa da Vó', badge: 'Destaque', variant: 'brand' as const },
  { dia: '15', mes: 'JUL', titulo: 'Almoço de domingo', sub: '12h · Chácara', badge: 'Confirmado', variant: 'secondary' as const },
  { dia: '20', mes: 'JUL', titulo: 'Reunião de família', sub: '20h · Online', badge: 'Planejando', variant: 'outline' as const },
];

const AVISOS = [
  { titulo: 'Mensalidade do clube paga', variant: 'success' as const, label: 'Ok' },
  { titulo: 'Renovar seguro do carro', variant: 'warning' as const, label: 'Pendente' },
  { titulo: 'Nova foto no álbum da família', variant: 'info' as const, label: 'Info' },
  { titulo: 'Documento vencido: RG do Pedro', variant: 'destructive' as const, label: 'Urgente' },
];

export function Painel() {
  return (
    <div className="flex h-screen text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <span className="text-sm font-bold">F</span>
          </div>
          <span className="text-sm font-semibold">Família Figueiredo</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <button
              key={item.label}
              className={
                item.active
                  ? 'flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground'
                  : 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
          <div>
            <h1 className="text-base font-semibold leading-none">Início</h1>
            <p className="text-xs text-muted-foreground">Visão geral da família</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-9 w-40 pl-8" />
            </div>
            <Button variant="brand">
              <Plus /> Novo evento
            </Button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {/* Controle de preset (só página /dev) */}
            <div className="flex justify-end">
              <ThemeControls />
            </div>

            {/* Container grande agrupando os cards de métrica (padrão Idealis) */}
            <section className="rounded-2xl border border-border bg-muted p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Resumo da família</h2>
                <Button variant="ghost" size="sm">
                  Detalhes
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {STATS.map((s) => (
                  <Card key={s.label}>
                    <CardContent className="flex flex-col gap-1 pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{s.label}</span>
                        <s.icon className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-2xl font-bold">{s.value}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="size-3" /> {s.trend}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Painéis */}
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Próximos eventos</CardTitle>
                  <Button variant="ghost" size="sm">
                    Ver todos
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {EVENTOS.map((e) => (
                    <div
                      key={e.titulo}
                      className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md bg-muted">
                        <span className="text-base font-bold leading-none">{e.dia}</span>
                        <span className="text-[10px] text-muted-foreground">{e.mes}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.titulo}</p>
                        <p className="text-xs text-muted-foreground">{e.sub}</p>
                      </div>
                      <Badge variant={e.variant}>{e.badge}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avisos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {AVISOS.map((a) => (
                    <div key={a.titulo} className="flex items-start justify-between gap-3">
                      <p className="text-sm">{a.titulo}</p>
                      <Badge variant={a.variant}>{a.label}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
