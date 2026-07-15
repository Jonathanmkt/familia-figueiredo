# 🎴 Envio ao Anki + Ciclo de vida da palavra (Disponíveis / Estudando / Concluídas)

> Plano vivo (modo de planejamento do Jonathan). **Ainda não é hora de codar.**
> Documento de trabalho — será excluído ao fim da implementação.

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

**Decisão (2026-07-15): "Concluída" = queima automática** (estilo *burned* do WaniKani): quando o
**intervalo** do cartão cruza um **limiar**, o cartão é **suspenso** (sai da revisão) e a palavra
vira **Concluída**.

---

## 🧩 O que essa etapa engloba

1. **Enviar ao Anki** — ao selecionar palavras e clicar **Enviar**, abre um **modal com seletor de
   baralho** (baralhos do usuário). O baralho é escolhido **no envio** (não há associação fixa
   livro↔baralho).
2. **IA monta o card** (gpt-4o-mini): gera uma **frase** contendo a palavra/expressão-alvo, usando
   ao redor as **palavras mais comuns/conhecidas** por estudantes de inglês — assim a única
   dificuldade costuma ser a palavra-alvo. **Frente = frase em inglês (pergunta)**; **verso = frase
   traduzida (resposta)**. Áudio TTS na frente (padrão que já temos).
3. **Processamento 100% no servidor, destacado (fire-and-forget)**: o envio dispara o trabalho e
   **retorna na hora**. A tela só avisa *"em alguns instantes os cards estarão no baralho — você
   receberá um email ao concluir."* **Sem feedback de conclusão na tela** — a conclusão vem por
   **email**.
4. **Link `word_bank ↔ anki.cards`**: pra saber o status (Disponível/Estudando/Concluída) de cada palavra.
5. **Queima automática**: ao revisar, se o FSRS agendar intervalo ≥ ~240 dias, o **card é apagado**
   e a palavra vira **Concluída**.
6. **As 3 abas** em `/palavras`, com envio restrito (Estudando não envia; só Disponíveis/Concluídas).

---

## ❓ Perguntas em aberto (resolvemos uma a uma)

*(preenchido ao longo da conversa)*

- [x] **Geração do cartão** → **IA monta o card** (gpt-4o-mini) com frase de treino.
- [x] **Frente/verso** → frase em inglês (pergunta) / frase traduzida (resposta); palavras de apoio
  são as mais comuns; áudio TTS na frente. Tradução salva **deixa de ser pré-requisito** (a IA gera).
- [x] **Baralho** → escolhido **no envio** via modal (seletor de baralhos). Sem associação fixa.
- [x] **Processamento** → **100% no servidor, destacado**. Tela só avisa que ficará pronto em
  instantes + **email na conclusão**. Sem feedback de conclusão na tela.
- [ ] Onde roda o processamento destacado? (Supabase Edge Function recomendado)
- [ ] Provedor de email + domínio remetente?
- [x] **Limiar de queima** → **intervalo agendado ≥ ~240 dias (8 meses)** → card queima.
- [x] **Card queimado** → **apaga o card** (cascade no `review_log`; histórico descartado por opção).
- [x] **Status** → **materializado no `word_bank`** (`status` + `card_id`); a deleção impede derivar do card.
- [x] **Reenviar Concluída** → cria **card novo** (o antigo foi apagado); volta pra Estudando.

---

## ✅ Decisões registradas

- **2026-07-15** — FSRS não tem estado terminal (confirmado no `ts-fsrs`: New/Learning/Review/Relearning).
- **2026-07-15** — **"Concluída" = queima automática** (intervalo ≥ limiar → cartão suspenso).
- **2026-07-15** — Vamos **planejar primeiro** (este documento) antes de codar.
- **2026-07-15** — O cartão é **montado pela IA** (gpt-4o-mini) a partir da seleção + contexto do banco.
- **2026-07-15** — Card = **frase de treino** com a palavra-alvo; palavras de apoio simples/comuns.
  **Frente = frase EN (pergunta)**, **verso = frase traduzida (resposta)**; áudio TTS na frente.
- **2026-07-15** — **Baralho escolhido no envio** (modal com seletor). Sem associação fixa livro↔baralho.
- **2026-07-15** — Envio processa **100% no servidor, destacado**. Tela só avisa (ficará pronto em
  instantes + email na conclusão); **conclusão só por email**, sem feedback na tela.
- **2026-07-15** — **Queima quando o intervalo agendado ≥ ~240 dias (8 meses)**. Detecção na hora da
  revisão (dentro do `submitReview` — sem trigger).
- **2026-07-15** — Ao queimar, **apaga o card** (cascade no `review_log`). Como o card some, o status
  é **materializado no `word_bank`** (`status` + `card_id`). Reenviar Concluída → **card novo**.

---

## 🗃️ Esboço do modelo de dados (a validar)

- **`leitor.word_bank`** ganha:
  - `status text not null default 'disponivel'` — `'disponivel' | 'estudando' | 'concluida'`.
  - `card_id uuid` (FK → `anki.cards.id`, `on delete set null`) — o card vivo enquanto Estudando.
- **`anki.review_log`**: FK `card_id` passa a ter **`on delete cascade`** (pra apagar o card ao queimar).
- **Transições** (todas em server actions, sem trigger):
  - *Enviar*: cria card no baralho escolhido → `status='estudando'`, `card_id=novo`.
  - *Queimar* (no `submitReview`, intervalo ≥ 240d): apaga o card → `status='concluida'` (`card_id` nula).
  - *Reenviar* (de Disponíveis/Concluídas): cria card novo → `status='estudando'`.
- **Abas** = filtro por `word_bank.status`.

---

## 🗺️ Checklist de execução

> Só será montado **depois** do plano fechado e da autorização para codar.
