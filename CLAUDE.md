# CLAUDE.md

Guia para o Claude Code (claude.ai/code) neste repositório.

## O que é

App da **Família Figueiredo**. Stack inspirada no Idealis Core: Next.js (App Router) + Supabase + TypeScript. Código, comentários e docs em **pt-BR**; responda em português.

## Comandos

```bash
npm run dev         # servidor de desenvolvimento (porta 3000)
npm run build       # build de produção
npm run lint        # eslint
npm run type-check  # tsc --noEmit — rode após qualquer mudança
```

Ainda não há suíte de testes automatizados; validação = `type-check` + `lint` + verificação manual.

## Convenções

- **Alias de import**: `@/*` → `src/*` (definido no `tsconfig.json`).
- **Tailwind 4** (CSS-first). Config mora no `src/app/globals.css` via `@import 'tailwindcss'` + `@theme` — **não** existe `tailwind.config.*`. PostCSS usa `@tailwindcss/postcss`. Utilitários renomeados no v4 (ex.: `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `ring` = 1px); não misturar sintaxe v3.
- **Design system**: tema do brasão (azul `--primary` + vermelho `--brand`), neutros azulados, feedback (success/warning/info). Tokens em `src/app/globals.css`; laboratório em `/dev/style-guide`. Regra de ouro: cor no token, nunca na tela. Ver skill local `.claude/skills/design-system`.
- **Supabase**: cliente de browser em `src/lib/supabase/client.ts`; cliente de servidor em `src/lib/supabase/server.ts`. A `SUPABASE_SERVICE_ROLE_KEY` é **só server**, nunca no client.
- **Segredos**: `.env*` está no `.gitignore`. Nunca commitar chaves.

## Estrutura

```
src/
  app/            # App Router (layout, page, rotas)
  lib/supabase/   # clientes Supabase (browser + server)
```

> Base enxuta por escolha: adicionar libs (Radix/shadcn, TanStack Query, Zustand, Zod, etc.) por demanda, conforme o app crescer.
