# 🎴 Envio ao Anki + Ciclo de vida da palavra (Disponíveis / Estudando / Concluídas)

> Plano vivo (modo de planejamento do Jonathan). **✅ Autorizado a codar em 2026-07-15.**
> Documento de trabalho — será excluído ao fim da implementação.

---

## 🗺️ Checklist de execução (SMTP por último)

### Etapa 1 — Backend: link + status derivado ✅
- [x] 1.1 Migration `word_bank_add_card_id`: `card_id uuid` FK → `anki.cards.id` (`on delete set null`) + índice
- [x] 1.2 `database.types.ts` atualizado (bloco `leitor.word_bank` + relação `word_bank_card_id_fkey`)
- [x] 1.3 Status derivado em `status.ts` (`deriveStatus`) + query na `page.tsx` (busca `scheduled_days` dos cards)

### Etapa 2 — UI das 3 abas ✅ (afinar ao vivo)
- [x] 2.1 `word-bank-tabs.tsx` com Tabs animado: **Disponíveis · Estudando · Concluídas** (contadores; padrão=Disponíveis)
- [x] 2.2 Só **Disponíveis** tem checkbox + barra **Enviar / Apagar**
- [x] 2.3 **Estudando** e **Concluídas** = leitura (palavra + ouvir); estados vazios por aba
- [ ] 2.4 Ajuste fino testando ao vivo — **com o Jonathan**

### Etapa 3 — Modal de envio (escolher baralho) ✅
- [x] 3.1 `send-to-deck-dialog.tsx`: seletor com baralhos do usuário (carrega ao abrir)
- [x] 3.2 Ao confirmar → `enviarParaBaralho` + tela de aviso "ficará pronto + email"
- [ ] 3.3 Nuances (filtrar por idioma? criar baralho na hora?) — decidir na prática

### Etapa 4 — Geração dos cards pela IA (Edge Function) ✅
- [x] 4.1 Edge Function `enviar-cards` (Deno): `{ entryIds, deckId }` + JWT; identifica user, service role
- [x] 4.2 Por palavra (1 chamada gpt-4o-mini): frase A1–A2 c/ alvo, JSON `{sentence_en, sentence_pt}` marcado
- [x] 4.3 Validação (`**alvo**` no EN?) + 1 retry; falha → pula (mantém Disponível)
- [x] 4.4 Insere card no baralho (front/back com marcação, campos FSRS) + grava `word_bank.card_id`
- [x] 4.5 Background (`EdgeRuntime.waitUntil`), retorna 202 na hora
- [x] 4.6 **Deploy via MCP** (função `enviar-cards` v1 ACTIVE)
- [x] 4.7 Secret `OPENAI_API_KEY` injetada na função via **Management API** (PAT do `.mcp.json`). Confirmado.

### Etapa 5 — Negrito do alvo no estudo ✅
- [x] 5.1 `rich-text.tsx` (`RichText` + `stripMarks`); estudo renderiza `**...**` em negrito (frente e verso)
- [x] 5.2 Cards normais (sem marcação) seguem iguais; TTS ignora os `**`

### Etapa 6 — Email de conclusão (SMTP) — POR ÚLTIMO
- [ ] 6.1 Na Edge Function, ao terminar, enviar email (SMTP `denomailer`) com resumo (criadas × falhas) — hoje é `console.log` (TODO no código)
- [ ] 6.2 Credenciais SMTP (plataforma de email) em secrets — plugável
- [ ] 6.3 Destinatário = email do usuário logado

### Etapa 7 — Validação
- [x] 7.1 `type-check` + `lint` + `next build` limpos
- [ ] 7.2 Testar fluxo real no navegador — **com o Jonathan** (preferência: ele verifica a UI)
- [ ] 7.3 Entregar pronto pra commit (Jonathan commita/deploya)

---

## 🎯 Visão geral

Conectar o **Banco de Palavras** ao **Anki** (que já temos, backend Supabase) e dar às palavras um
**ciclo de vida** em 3 abas na tela `/palavras`:

```
Disponíveis  ──[enviar ao Anki]──►  Estudando  ──[queima: intervalo ≥ limiar]──►  Concluídas
 (não enviadas)                      (cartão ativo, sendo repetido)               (cartão "queimado"/suspenso)
```

- **Disponíveis** — seleções ainda **não enviadas** ao Anki. Podem ser enviadas.
- **Estudando** — já viraram cartão e estão **ativas** na revisão. **Não podem** ser reenviadas.
- **Concluídas** — o cartão **"queimou"** (intervalo cruzou o limiar → suspenso, sai da rotação).
  Podem ser enviadas de novo (re-estudar).

---

## 🔑 Descoberta que fundamenta tudo (FSRS não conclui sozinho)

O `ts-fsrs` só tem 4 estados — `New`, `Learning`, `Review`, `Relearning`. **Não há estado terminal**:
um cartão em `Review` é reagendado para sempre, com o intervalo só crescendo (teto padrão ~100 anos).
Logo, **"Concluída" não existe naturalmente** — nós a definimos.

**Decisão (2026-07-15, revisada): "Concluída" = RÓTULO, não destrutivo.** Quando o **intervalo** do
cartão cruza um **limiar** (≥ ~240 dias), a palavra **aparece em "Concluídas"**, mas o **cartão
continua vivo** no Anki, recebendo as revisões raras de intervalo longo. É só uma **visão de "já
dominei"** — fiel à repetição espaçada (não perde retenção). **Nada é apagado nem suspenso.**

---

## 🧩 O que essa etapa engloba

1. **Enviar ao Anki** — ao selecionar palavras e clicar **Enviar**, abre um **modal com seletor de
   baralho** (baralhos do usuário). O baralho é escolhido **no envio** (não há associação fixa
   livro↔baralho).
2. **IA monta o card** (gpt-4o-mini): gera uma **frase** contendo a palavra/expressão-alvo, usando
   ao redor as **palavras mais comuns/conhecidas** por estudantes de inglês — assim a única
   dificuldade costuma ser a palavra-alvo. **Frente = frase em inglês (pergunta)**; **verso = frase
   traduzida (resposta)**. Áudio TTS na frente (padrão que já temos).
3. **Processamento numa Supabase Edge Function (Deno), destacado**: o envio chama a function via
   `functions.invoke`, que dispara o trabalho em segundo plano (`EdgeRuntime.waitUntil`) e **retorna
   na hora (202)**. A tela só avisa *"em alguns instantes os cards estarão no baralho — você receberá
   um email ao concluir."* **Sem feedback de conclusão na tela** — a conclusão vem por **email** (SMTP).
4. **Link `word_bank ↔ anki.cards`**: pra saber o status (Disponível/Estudando/Concluída) de cada palavra.
5. **Rótulo Concluída (não destrutivo)**: a palavra é classificada por **derivação** — se o card
   linkado tem intervalo agendado ≥ ~240 dias, ela cai em "Concluídas". O card **continua no baralho**.
6. **As 3 abas** em `/palavras`:
   - **Disponíveis** — única aba com ações: seleção + **Enviar** (modal de baralho) + **Apagar do banco**.
   - **Estudando** e **Concluídas** — **só leitura** (ver a palavra + ouvir); sem seleção/ações (já têm card).

---

## ❓ Perguntas em aberto (resolvemos uma a uma)

*(preenchido ao longo da conversa)*

- [x] **Geração do cartão** → **IA monta o card** (gpt-4o-mini) com frase de treino.
- [x] **Frente/verso** → frase em inglês (pergunta) / frase traduzida (resposta); palavras de apoio
  são as mais comuns; áudio TTS na frente. Tradução salva **deixa de ser pré-requisito** (a IA gera).
- [x] **Baralho** → escolhido **no envio** via modal (seletor de baralhos). Sem associação fixa.
- [x] **Processamento** → **100% no servidor, destacado**. Tela só avisa que ficará pronto em
  instantes + **email na conclusão**. Sem feedback de conclusão na tela.
- [x] **Email** → **SMTP próprio** (nodemailer). Credenciais no `.env` (host/porta/user/senha/from) + no
  `.env` do servidor no deploy. Destinatário = email do usuário logado.
- [x] **Onde processa** → **Supabase Edge Function** (Deno), disparada por `functions.invoke`,
  background via `EdgeRuntime.waitUntil`, retorna 202 na hora.
- [x] **Limiar de Concluída** → **intervalo agendado ≥ ~240 dias (8 meses)**.
- [x] **Concluída = rótulo não destrutivo** → o card **não é apagado nem suspenso**; segue vivo no Anki.
- [x] **Status** → **DERIVADO** do card linkado (sem materializar, sem trigger): sem card = Disponível;
  card com intervalo < 240d = Estudando; card com intervalo ≥ 240d = Concluída.
- [x] **Ações das abas** → só **Disponíveis** age (Enviar + Apagar do banco). **Estudando** e
  **Concluídas** são **só leitura** (ver + ouvir), sem envio nem seleção.

---

## ✅ Decisões registradas

- **2026-07-15** — FSRS não tem estado terminal (confirmado no `ts-fsrs`: New/Learning/Review/Relearning).
- **2026-07-15** — ~~"Concluída" = queima automática (apaga o card)~~ **REVISTO** → **"Concluída" =
  rótulo NÃO destrutivo**: o card continua vivo; a palavra só é *classificada* como Concluída quando o
  intervalo ≥ ~240 dias. Consequências: **status derivado** (não materializado), **sem apagar card**,
  **sem cascade no review_log**, **sem "reenviar cria card novo"**.
- **2026-07-15** — Vamos **planejar primeiro** (este documento) antes de codar.
- **2026-07-15** — O cartão é **montado pela IA** (gpt-4o-mini) a partir da seleção + contexto do banco.
- **2026-07-15** — Card = **frase de treino** com a palavra-alvo; palavras de apoio simples/comuns.
  **Frente = frase EN (pergunta)**, **verso = frase traduzida (resposta)**; áudio TTS na frente.
- **2026-07-15** — **Baralho escolhido no envio** (modal com seletor). Sem associação fixa livro↔baralho.
- **2026-07-15** — Envio processa **100% no servidor, destacado**. Tela só avisa (ficará pronto em
  instantes + email na conclusão); **conclusão só por email**, sem feedback na tela.
- **2026-07-15** — Email por **SMTP próprio**; credenciais em env; destinatário = usuário logado.
- **2026-07-15** — O email cresceu de escopo: será uma **plataforma de email multi-tenant da software
  house** (estilo "Titan self-hosted") na VPS — caixas `@dominiodocliente.com`, webmail próprio futuro,
  SMTP opcional por cliente, administrável por API/automação. **Infra separada deste app** (DR 1ª versão
  send-only em `docs/drs/smtpemailserver.md` recomendou Postal; **nova DR** pedida pra plataforma com
  CAIXA DE ENTRADA — provável Stalwart, a validar). Para o Anki, nada muda: a Edge Function só precisa
  de **credenciais SMTP de envio** de um dos tenants dessa plataforma, entregues como env quando pronto.
- **2026-07-15** — Processamento numa **Supabase Edge Function** (Deno); SMTP em Deno = `denomailer`
  (não nodemailer); background via `EdgeRuntime.waitUntil`.
- **2026-07-15** — **Concluída quando o intervalo agendado ≥ ~240 dias (8 meses)** — apenas um **rótulo
  derivado** do card linkado (sem apagar, sem suspender, sem trigger, sem materializar status).
- **2026-07-15** — **Só a aba Disponíveis tem ações** (Enviar + Apagar do banco). Estudando e Concluídas
  são só leitura (ver + ouvir).
- **2026-07-15** — **Geração do card (detalhes)**: contexto só desambigua; frase de treino NOVA com apoio
  **A1–A2** (alvo é a exceção); **1 card/palavra**; palavra-alvo em **negrito** (frente+verso); **1
  chamada IA por palavra**, saída JSON `{sentence_en, sentence_pt}` com alvo marcado + **1 retry**;
  falha → **pula e mantém Disponível** (email reporta criadas/falhas).

---

## 🤖 Geração do card pela IA — detalhes

- [x] **Papel do contexto** → a IA lê o `paragraph_context` salvo **só pra desambiguar o sentido** da
  palavra/expressão; depois **gera uma frase de treino NOVA e fácil** usando esse sentido.
- [x] **Dificuldade** → palavras de apoio em **nível CEFR A1–A2**, exceto a palavra-alvo (que pode ser
  de qualquer nível). Instrução explícita no prompt.
- [x] **Conteúdo do card** → palavra-alvo em **negrito** na frase (frente EN e verso PT). Verso = só a
  frase traduzida (com o alvo destacado). Sem significado isolado.
  - *Implicação*: a IA marca o trecho-alvo em cada frase (o alvo pode vir flexionado); o card guarda a
    marcação (ex.: `**...**`) e o estudo renderiza em negrito. Toca a UI de estudo do Anki (hoje é texto puro).
- [x] **Cards por palavra** → **1 card (1 frase)** por palavra selecionada.
- [x] **Processamento** → **1 chamada à IA por palavra** (isola erro, retry e validação individuais).
- [x] **Formato de saída** → JSON estruturado `{ sentence_en, sentence_pt }` com a palavra-alvo marcada
  (ex.: `**...**`) nos dois. Validação: o alvo aparece marcado no EN? Se não, **1 retry**.
- [x] **Falha após retry** → **pula a palavra e mantém em Disponíveis** (sem `card_id`, dá pra reenviar
  depois). O email de conclusão informa quantas foram criadas e quantas falharam.

---

## 🖥️ UI — iterar na prática (não pré-especificar)

> Decisão: a interface a gente **afina testando ao vivo**, sem detalhar aqui. Este é o **ponto de
> partida da execução** quando o plano for autorizado. Peças conhecidas:

- **3 abas** em `/palavras`: **Disponíveis · Estudando · Concluídas** (com contadores; padrão =
  Disponíveis; estados vazios amigáveis).
- **Só Disponíveis** tem seleção (checkbox) + barra **Enviar / Apagar** (já existe hoje; passa a viver
  só nessa aba). Estudando e Concluídas = leitura (palavra + ouvir).
- **Modal de seleção de baralho** ao clicar Enviar (baralhos existentes do usuário) — nuances (filtrar
  por idioma? criar na hora?) resolvidas na prática.
- **Aviso pós-envio**: "em alguns instantes os cards estarão no baralho — você receberá um email."
- **Negrito do alvo** renderizado na tela de **estudo** do Anki (e onde mais o card aparecer).

---

## 🗃️ Esboço do modelo de dados (a validar)

- **`leitor.word_bank`** ganha só:
  - `card_id uuid` (FK → `anki.cards.id`, `on delete set null`) — o card gerado a partir da palavra.
- **Sem** coluna `status`, **sem** trigger, **sem** cascade destrutivo — o status é **derivado** por join:
  - `card_id IS NULL` → **Disponível** (nunca enviada, ou o card foi apagado à mão → volta a Disponível).
  - card existe e `scheduled_days < 240` → **Estudando**.
  - card existe e `scheduled_days >= 240` → **Concluída**.
- **Única transição de escrita**: *Enviar* cria o card no baralho escolhido e grava `card_id`. Depois
  disso, a aba muda sozinha conforme o card amadurece (nada a atualizar no `word_bank`).
- **Abas** = query com join em `anki.cards` filtrando por `scheduled_days`.
- **Edge Function** `enviar-cards`: recebe `{ entryIds, deckId }` + JWT do usuário; secrets próprias
  (`OPENAI_API_KEY`, `SMTP_*`, service role) via `supabase secrets set`. SMTP em Deno = `denomailer`.

---

## ⚠️ Cuidados (decididos por consequência)

- ✅ **Modelo não destrutivo elimina o risco anterior**: como nada é apagado/suspenso, cards criados
  direto no baralho (pela tela do Anki) nunca são afetados — eles simplesmente **não têm `word_bank`
  ligado**, então não aparecem em nenhuma aba. O `submitReview` **não muda** (sem lógica de queima).
- **Classificação**: feita na **leitura** das abas (join `word_bank`↔`anki.cards`, comparando
  `scheduled_days` com 240). Nada roda no momento da revisão.
- **Seletor de baralho**: usa os baralhos **existentes** do usuário. Se não houver nenhum, orientar a
  criar um em `/anki` (criar baralho fica fora do escopo desta etapa).
- **Áudio do card**: a frente fala via TTS conforme o `audio_language` do **baralho escolhido** (o
  card é uma frase em inglês → mandar para um baralho com áudio en-US).
- **Segredos** (SMTP + reuso do OpenAI): nunca no client; nas secrets da Edge Function e no `.env`
  do servidor. Seguir o padrão da casa (só runtime, nunca na imagem).

---

## 🗺️ Checklist de execução

> Só será montado **depois** do plano fechado e da autorização para codar.
