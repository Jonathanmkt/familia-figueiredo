---
description: >-
  Gestão de UI / design system do projeto (web). Use SEMPRE que criar ou alterar QUALQUER coisa de
  aparência: cor, fundo, borda, superfície, botão, campo, badge, tab, card, container, estado
  (hover/foco/disabled), tema, ou escolher "qual cor/token usar aqui". Baseada em SCHEMA DE TOKENS +
  PRESETS trocáveis (data-theme). Complementa a skill global `ui-foundations` (setup shadcn/lucide) —
  aqui é a governança do TEMA deste projeto. Regra de ouro: a decisão de estilo mora no token/
  componente, nunca na tela. Base importável do acervo `playbook` (ui/), adaptável por projeto.
---

# Design System — gestão de UI (base de presets)

> 🔧 **ESTE ARQUIVO É UMA BASE.** Cada projeto copia e adapta nos pontos marcados `🔧 ADAPTAR`.
> Origem: `github.com/Jonathanmkt/playbook` → `skills/design-system`. Vem junto com as entradas
> `ui/theme-system`, `ui/components`, `ui/page-style-guide`, `ui/page-painel`.

Tema baseado em **schema de tokens + presets**: o schema (nomes de token) é o contrato; cada
**preset** preenche com valores. Trocar preset = `data-theme` no `<html>`. Tailwind v4 (oklch),
efeito **glass** como propriedade do preset.

> 🔧 **ADAPTAR — identidade do projeto:** preset padrão e marca.
> - Projeto atual (Família Figueiredo): preset default **`glass-brasao`** (vidro navy do Idealis +
>   vermelho do brasão). Marca: `--primary` azul, `--brand` vermelho `#EC0019`.
> - Num projeto novo: defina o preset default e os valores da marca (ver `ui/theme-system`).

## Regra de ouro

**A decisão de estilo mora no token (`globals.css`) ou no componente (`ui/`), NUNCA na tela.**
Mudou a cor de um campo? Muda no componente/token → propaga pro sistema. Não cole `bg-[#...]` nem
classe de cor/fundo/borda numa instância. **Nomeie por papel** (`--primary`, `--brand`), nunca por
cor — quando a cor mudar, o nome continua verdadeiro.

## Fonte da verdade (arquivos)

- `src/app/globals.css` — o schema (`@theme inline`) + blocos de preset (`[data-theme=…]`) + regras
  de fundo/glass. **É aqui que a cor mora.**
- `src/lib/theme.ts` — lista de presets + `presetForcesDark()`.
- `.../theme-controls.tsx` — seletor de preset + claro/escuro (laboratório/proposta).
- `/dev/style-guide` e `/dev/painel` — laboratório visual (ver tudo junto, calibrar).

## Presets (como funciona)

Um preset = um bloco `[data-theme='x'] { --token: valor; … }` no `globals.css` + uma linha em
`theme.ts`. Presets podem **herdar** de outro (ex.: `glass-brasao` herda `navy-glass` e só troca a
marca). Adicionar preset ≈ 5 linhas.

> 🔧 **ADAPTAR — presets do projeto:** os valores oklch de cada preset (paleta, superfícies).
> Método pra extrair um preset de uma referência (print/tweakcn): pegue as cores e converta pra
> oklch (não chute na mão — use script de conversão). Ver `ui/theme-system`.

## Componentes customizados (não são o shadcn cru)

- `Button` variante **`brand`** (`bg-brand`) além das padrão.
- `Badge` variantes de **feedback**: `brand`, `success`, `warning`, `info`.
- `Tabs` com **pílula deslizante** animada (framer-motion `layoutId`), token-driven (`--primary`).

Ao rodar `shadcn add`, **substitua** esses pelos do acervo (`ui/components`) — senão perde os extras.

## Glass = propriedade do preset

Superfície de vidro não é decisão de tela: `--card` translúcido + blur via `[data-slot='card']` no
preset glass. Nenhum componente sabe que é "vidro" — quem decide é o `data-theme`. Container manual
glass: classe `.surface-glass` (adapta a qualquer fundo).

## ⚠️ Pegadinhas (decore)

1. **Preset de fundo escuro PRECISA da classe `.dark`.** Os componentes shadcn escondem o tema
   escuro atrás de `dark:` — sem a classe, a aba/campo ativo cai no tom claro e fica preto no fundo
   escuro. Marque o preset com `forceDark` no `theme.ts` (o controle liga o `.dark`).
2. **Reinicie o dev server após `shadcn add` / instalar dep / mudança grande de vários arquivos.**
   O HMR do webpack embola (CSS congela/vazio). Fix: matar + `rm -rf .next` + subir. E **verifique a
   app RODANDO, não só o `build`** — build verde ≠ tela certa.
3. **`brand` ≠ `destructive`.** Mesmo quando a cor é parecida (vermelho), papéis separados: `brand`
   = destaque de marca raro; `destructive` = perigo. Nunca `brand` em botão comum.
4. **Nada de cor literal na tela** (`bg-[#...]`, `style={{color}}`), nem token de superfície
   (`bg-background`/`bg-card`) colado em campo/botão.

## Como evoluir o design system

1. **Token** (`globals.css`) → 2. **Componente** (`ui/`) → 3. **Receita** (padrão que se repete:
   footer de modal, filtro, lista) → 4. **Documente aqui**. Destile tokens usando o `/dev/style-guide`
   e o `/dev/painel` como tela-laboratório.

> 🔧 **ADAPTAR — receitas:** documente aqui os padrões repetidos DESTE projeto conforme surgirem.

## Vem do acervo

Base + arquivos prontos em `github.com/Jonathanmkt/playbook`:
`ui/theme-system`, `ui/components`, `ui/page-style-guide`, `ui/page-painel`, e esta skill em
`skills/design-system`. Clone, copie, adapte os pontos `🔧 ADAPTAR`. Complementa `ui-foundations` (global).
