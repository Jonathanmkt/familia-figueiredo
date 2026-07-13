---
description: >-
  Guia de cores e tema da Família Figueiredo (web). Use SEMPRE que criar/alterar qualquer
  coisa de aparência: cor, fundo, borda, botão, campo, badge, estado (hover/foco/disabled),
  ou escolher "qual cor usar aqui". Baseado no brasão da família: azul dominante + vermelho
  de contraste. Complementa a skill global `ui-foundations` (shadcn/lucide) — aqui é o TEMA
  específico do projeto. Regra de ouro: a cor mora no token (globals.css), nunca na tela.
---

# Design System — Família Figueiredo

Tema derivado do **brasão da família**: **azul dominante** com **vermelho de contraste**
(modelo TIM — azul é o *ambiente*, vermelho é a *atenção*). Montado sobre shadcn/ui + Tailwind v4.
Os tokens vivem em `src/app/globals.css` (`:root` = light, `.dark` = dark, mapeados em `@theme inline`).

## Regra de ouro

**A decisão de cor mora no token/componente, NUNCA na tela.** Precisa mudar uma cor? Muda o token
no `globals.css` (propaga pro sistema) ou a variante no componente (`src/components/ui/`). Não cole
`bg-[#...]` nem cor literal numa instância.

**Nomeie por papel, não por cor:** `primary` (não "azul"), `brand` (não "vermelho"). Quando a cor
mudar, o nome continua verdadeiro.

## Paleta crua (fonte)

| Cor | Hex | oklch | Papel |
|---|---|---|---|
| Azul do brasão | `#28245D` | ~`oklch(0.30 0.099 282)` | marca dominante → `--primary` |
| Vermelho do brasão | `#EC0019` | ~`oklch(0.593 0.241 27)` | acento de destaque → `--brand` |
| Neutros | — | cinzas **levemente azulados** (chroma ~0.008–0.02 no hue 282) | 90% da UI |

## Tokens semânticos (o que usar)

- **Marca:** `bg-primary`/`text-primary-foreground` (azul, ação principal) · `bg-brand`/`text-brand-foreground` (vermelho, destaque raro).
- **Neutros:** `background`, `foreground`, `card`, `popover`, `muted`(+`-foreground`), `secondary`, `accent`, `border`, `input`.
- **Foco:** `ring` (azul).
- **Feedback:** `destructive` (perigo), `success` (verde, hue 150), `warning` (âmbar, hue 75),
  `info` (azul-claro, hue 240 — distinto do primary). Todos com `-foreground` pareado.
- **Estados (derivados, não são tokens novos):** hover = cor a 80–90% (`bg-primary/80`);
  foco = `ring`; disabled = `opacity-50`.

Tudo tem versão **light** e **dark**. No dark o `primary` é **clareado** (senão o botão some no
fundo escuro) — contraste é obrigação.

## ⚠️ Disciplina do vermelho (decore)

`--brand` (marca) e `--destructive` (perigo) são a **mesma família de vermelho**, com **papéis
separados por regra**:

- **`brand`** → destaque de marca, CTA especial, selo de destaque. **Raro** e de propósito.
- **`destructive`** → excluir, erro, ação perigosa.
- ❌ **Nunca** use `brand` num botão comum (é isso que mantém o vermelho impactante).

## O que NÃO fazer

❌ Cor literal na tela (`bg-[#28245D]`, `style={{color:...}}`) — use o token.
❌ Nomear token por cor (`--azul`) em vez de papel (`--primary`).
❌ Espalhar `brand`/vermelho pela UI — mata o contraste.
❌ Texto sem par de contraste — sempre a dupla `superfície` + `-foreground`.

## Referências

- Tokens: `src/app/globals.css` · Laboratório visual: **`/dev/style-guide`** (toggle light/dark).
- Método reaproveitável (setup de tema em projeto novo): skill global `ui-foundations` + (futura) `design-system-setup`.
