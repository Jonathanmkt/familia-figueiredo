# Família Figueiredo

App da Família Figueiredo. Stack inspirada no **Idealis Core**: Next.js (App Router) + TypeScript + Tailwind + Supabase.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict) — alias `@/*` aponta para `src/*`
- **Tailwind CSS 3.4**
- **Supabase** (`@supabase/ssr`) — clientes em `src/lib/supabase/`

## Começando

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Comandos

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run start       # roda o build
npm run lint        # eslint
npm run type-check  # tsc --noEmit
```

## Variáveis de ambiente

Crie um `.env.local` na raiz com:

| Chave | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço — **somente server, nunca no client** |

> `.env*` está no `.gitignore`. Nunca commite segredos.
