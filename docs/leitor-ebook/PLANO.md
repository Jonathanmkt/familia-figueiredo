# 📖 Leitor de eBook + Banco de Palavras + Cards por IA

> Plano vivo (modo de planejamento do Jonathan). **✅ Autorizado a codar em 2026-07-14.**
> Documento de trabalho — será excluído ao fim da implementação.

---

## 🗺️ Checklist de execução (MVP — fase 1)

### Etapa 0 — Fundações
- [x] 0.1 Vendorizar `foliate-js` como git submodule (commit `78914ae`, 2026-05-01) em `vendor/foliate-js` + `submodules: true` no workflow CI
- [x] 0.2 Tipos TS mínimos (`src/types/foliate-view.d.ts`) + alias `@vendor/*` no tsconfig
- [x] 0.3 `.env`: `OPENAI_API_KEY` ✅ + `AZURE_TRANSLATOR_KEY`/`AZURE_TRANSLATOR_REGION` ✅ (região `brazilsouth`; testado ao vivo em 2026-07-15)

### Etapa 1 — Backend (Supabase) ✅
- [x] 1.1 Schema `leitor` + tabelas: `books`, `reading_progress`, `word_bank`, `translation_cache` (migration `create_leitor_schema`)
- [x] 1.2 RLS: books select p/ autenticados (altera/remove só uploader); progress/word_bank só do dono; cache select/insert p/ autenticados
- [x] 1.3 Bucket Storage `books` privado + policies (select/insert autenticado; delete só dono)
- [x] 1.4 Schema `leitor` exposto na Data API (`pgrst.db_schemas = 'public, anki, leitor'` + reload)
- [x] 1.5 `database.types.ts` atualizado (bloco manual `leitor`)

### Etapa 2 — Navegação + Biblioteca ✅
- [x] 2.1 Hub `/protected` com módulos: Anki · Leitor · Banco de Palavras
- [x] 2.2 Página `/leitor` (biblioteca): título/autor/idioma + barra de progresso por usuário
- [x] 2.3 Upload de EPUB (dialog): arquivo + título (sugerido do nome) + autor + idioma → Storage + tabela

### Etapa 3 — Leitor
- [x] 3.1 `/leitor/[bookId]` com `<foliate-view>` em Client Component (`dynamic`, `ssr: false`)
- [x] 3.2 Paginação (botões ‹ › + setas do teclado), tipografia serifada, cores do tema injetadas no iframe
- [x] 3.3 Progresso persistido (`relocate` → CFI + fraction, debounce 1,2s) — **verificado no banco**
- [ ] 3.4 CSP anti-scripts de EPUB — *adiado (hardening)*: o foliate-js já **não executa** scripts de EPUB; CSP global de app fica como melhoria futura

### Etapa 4 — Seleção + menu de contexto ✅
- [x] 4.1 Motor de seleção: `selectionchange` (debounce) como caminho único + press-and-hold (550ms) via `caretFromPoint` + `Intl.Segmenter`
- [x] 4.2 Expansão ◀ ▶ palavra a palavra (limite 8) — **verificado**: "buckets" → "down in buckets"
- [x] 4.3 Menu flutuante posicionado pelo Range (coords do iframe traduzidas via `frameElement`)
- [x] 4.4 Ações: Copiar · Ouvir (Web Speech) · Traduzir · Traduzir no contexto · Salvar

### Etapa 5 — Traduções
- [x] 5.1 `traduzir` → Azure Translator + cache em `translation_cache` — **verificado ao vivo**: "call it a day" → "Encerre por hoje", cacheado no banco (2ª consulta não bate na API)
- [x] 5.2 `traduzirNoContexto` → gpt-4o-mini — **verificado ao vivo**: "down in buckets" → "caiu como um dilúvio" + explicação da expressão idiomática

### Etapa 6 — Banco de palavras ✅
- [x] 6.1 Salvar seleção (texto + parágrafo + traduções + CFI + idioma) — **verificado no banco**
- [x] 6.2 Página `/palavras` com traduções, contexto, badges (idioma/livro) e excluir

### Etapa 7 — Validação
- [x] 7.1 `type-check` + `lint` + `next build` limpos
- [x] 7.2 Fluxo completo verificado no navegador (upload real via dialog → ler → selecionar → expandir → traduzir com IA → salvar → conferir em /palavras)
- [ ] 7.3 Entregar pronto pra commit (Jonathan commita/deploya)

### 📌 Pendências pós-MVP (anotadas)
- ~~Criar recurso Azure Translator~~ ✅ feito (2026-07-15). **Falta só**: no próximo deploy, adicionar `AZURE_TRANSLATOR_KEY` + `AZURE_TRANSLATOR_REGION` ao `.env` do **servidor** (VPS, `/opt/familia-figueiredo/.env`), como as demais secrets.
- **Dados de teste criados na validação** (Jonathan decide manter ou apagar): usuário `teste-leitor@familia-figueiredo.test`, livro "the little test book" e 1 entrada no banco de palavras.
- Testar seleção em **celular real** (maior risco apontado pelas DRs).
- Detalhe de UX: após salvar, o menu fecha sem exibir o "Salvo ✓" (corrigida a causa provável — revalidate desnecessário que remontava o leitor —, revalidar no teste mobile).
- Warning de build: `topLevelAwait` no `pdf.js` do vendor (não afeta EPUB); some se elevarmos o target TS/webpack no futuro.

---

## 🎯 Visão geral

Estender o app da Família Figueiredo (que já tem **nosso próprio Anki**, backend Supabase) com um
**ecossistema de aprendizado de idiomas** girando em torno de leitura e música:

```
┌─────────────────┐     ┌─────────────────┐
│  Leitor eBook   │     │  Letras música  │
│  (EPUB)         │     │  (inglês)       │
└────────┬────────┘     └────────┬────────┘
         │  marca palavra/expressão        │
         └───────────────┬─────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Banco de Palavras │  (seleções salvas)
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  IA cria cards      │  (gpt-4o-mini: original + tradução pt-BR)
              └──────────┬──────────┘
                         ▼ (envio via UI, não IA)
              ┌─────────────────────┐
              │   Baralho no Anki   │  (o nosso, Supabase)
              └─────────────────────┘
```

**Já temos:** Anki próprio (schema `anki` no Supabase) · API key OpenAI · Next.js 15 · TTS via
Web Speech API (grátis) · deploy em produção (Docker Swarm/Traefik).

---

## 🧩 Módulos a construir

### 1. Leitor de eBook (EPUB)
- Abrir e ler arquivos **EPUB** no navegador (paginação, capítulos, progresso de leitura).
- Biblioteca de livros do usuário (upload, lista, retomar de onde parou).
- **A pesquisar:** melhor stack de leitor EPUB para React/Next.js.

### 2. Conversão PDF → EPUB
- Usuário envia um **PDF** → sistema converte para **EPUB** para leitura no leitor.
- Provavelmente processamento **no servidor** (backend Node/Docker).
- **A pesquisar:** melhores ferramentas/serviços de conversão (qualidade de texto x layout).

### 3. Seleção de texto (marcar palavras)
- **Clicar e segurar** sobre o texto → marca uma ou mais palavras.
- Opção de **ir ampliando a seleção**, pegando mais palavras adjacentes.
- **A pesquisar:** técnicas de seleção "click-and-hold + expandir" em texto renderizado.

### 4. Menu de contexto da seleção
Ao selecionar, abre um menu com:
- **Copiar**
- **Ouvir** (TTS — reusar a Web Speech API que já temos)
- **Traduzir pt-BR** (tradução "comum", via dicionário)
- **Traduzir no contexto** (IA — recebe o parágrafo inteiro; ver módulo 6)
- **Salvar no banco de palavras**

### 5. Tradução comum (dicionário)
- Tradução direta EN→PT-BR de palavra/expressão, **sem IA**, via serviço de dicionário/tradução.
- **A pesquisar:** APIs de dicionário/tradução gratuitas e **confiáveis**.

### 6. Tradução no contexto (IA — gpt-4o-mini)
- A IA recebe **o parágrafo inteiro** onde a expressão aparece (não só a expressão isolada).
- Retorna a **tradução no contexto** + uma **explicação curta**.
- Modelo: **gpt-4o-mini** (temos a key). É a diferença-chave x tradução comum.

### 7. Banco de Palavras
- Salva cada seleção (texto original, origem: livro/música, contexto do parágrafo, etc.).
- Tela para revisar/gerenciar as seleções salvas.
- Futuro: alimenta a IA que gera cards.

### 8. Letras de música (inglês)
- Buscar/baixar **letras corretas** de músicas em inglês (quase sempre muito famosas).
- Usuário marca palavras/trechos na letra → envia ao **banco de palavras** (mesmo fluxo do leitor).
- **A pesquisar:** fonte **confiável e legal** de letras (precisão + direitos).

### 9. IA cria cards → envio ao baralho
- Na tela do banco de palavras, selecionar textos (às vezes mais de uma palavra).
- **IA gera cards**: frente = texto original · verso = tradução pt-BR.
- Depois de gerados, um **botão envia a lista ao baralho selecionado** — esse envio é **via UI, não IA**.
- **Associação livro ↔ baralho:** ao abrir o banco de palavras de um livro, os cards vão pro baralho associado.

---

## 🧭 Fases (roadmap)

- **Fase 1 — MVP:** biblioteca (upload EPUB compartilhado) → leitor → seleção de palavras/expressões
  → **menu completo** (copiar, ouvir, traduzir pt-BR, traduzir no contexto) → **banco de palavras**
  (com traduções salvas). Depende de **DR-1, DR-3, DR-4**.
- **Fase 2 — Cards por IA:** na tela do banco, IA gera cards (original + tradução pt-BR) → botão
  envia a lista ao **baralho selecionado** (via UI). Associação livro↔baralho.
- **Fase 3 — PDF → EPUB:** upload de PDF convertido no servidor. Depende de **DR-2**.
- **Fase 4 — Música:** letras em inglês → marcar → banco → cards. Depende de **DR-5**.

---

## ❓ Perguntas em aberto (resolvemos uma a uma)

*(preenchido ao longo da conversa)*

- [x] **Escopo do MVP** → **Leitor EPUB + marcar → banco de palavras** (tradução e cards depois).
- [x] **Armazenamento** → **Supabase Storage, biblioteca compartilhada** da família (todos leem os
  mesmos livros). O **banco de palavras é por usuário**.
- [x] **Contexto salvo** → **texto marcado + parágrafo inteiro** (capturado no momento do clique).
- [x] **Traduções** → **salvas junto** no banco (comum e contextual, se o usuário traduziu). Campos
  opcionais; funcionam como cache e adiantam o conteúdo do card.
- [x] **Idioma do livro** → **escolhido no upload** (en-US / pt-BR por ora). Guia o TTS e, depois,
  a direção da tradução e a associação ao baralho.
- [x] **Menu de contexto (MVP completo)** → **Copiar · Ouvir · Traduzir pt-BR (dicionário) ·
  Traduzir no contexto (IA gpt-4o-mini) · Salvar no banco.** (Puxa DR-4 + OpenAI pro MVP.)
- [x] **Navegação** → **módulos separados no menu**: Anki · Leitor (biblioteca) · Banco de Palavras.
- [ ] Música: por busca de título/artista ou colar a letra manualmente? *(fase futura)*
- [ ] Associação livro↔baralho: 1:1 ou 1:N? *(fase futura)*

---

## 🔬 Pesquisas profundas (prompts para o agente de DR do Jonathan)

> O Jonathan roda cada uma no agente de deep research dele e devolve o conteúdo.
> Ver seção detalhada no fim do documento.

- **DR-1** — Leitor EPUB no navegador (React/Next.js) — ✅ **recebido** (confirma `foliate-js`)
- **DR-2** — Conversão PDF → EPUB (backend) — ✅ **recebido**
- **DR-3** — Seleção de texto avançada (click-hold + expandir) — ✅ **recebido**
- **DR-4** — API de dicionário/tradução EN→PT-BR (sem IA) — ✅ **recebido**
- **DR-5** — Fonte confiável e legal de letras de música — ✅ **recebido**

---

## ✅ Decisões registradas

*(com data absoluta, à medida que fecharmos)*

- **2026-07-14** — Skill de planejamento do Jonathan confirmada como global. Início do plano.
- **2026-07-14** — **MVP** = Leitor EPUB + seleção de palavras + **menu de contexto completo**
  (copiar, ouvir, traduzir pt-BR, traduzir no contexto com IA) + salvar no banco.
  **Geração de cards, envio ao baralho, PDF→EPUB e música** ficam para fases seguintes.
- **2026-07-14** — Menu de contexto já entra completo no MVP → tradução comum (DR-4) e contextual
  (gpt-4o-mini) fazem parte do MVP, não da fase 2.
- **2026-07-14** — Banco de palavras guarda **texto marcado + parágrafo de contexto** desde o MVP
  (mesmo sem tradução ainda), para a IA ter contexto na fase seguinte.
- **2026-07-14** — Arquivos EPUB no **Supabase Storage**, **biblioteca compartilhada** da família.
  Banco de palavras permanece **por usuário** (RLS por owner).
- **2026-07-14** — **Idioma-alvo do livro** escolhido no **upload** (en-US / pt-BR por ora), espelhando
  o padrão de áudio do baralho.
- **2026-07-14** — **Navegação**: módulos separados no menu — Anki · Leitor · Banco de Palavras.
- **2026-07-14** — DRs 2/3/4/5 recebidos e sintetizados. **Leitor EPUB = `foliate-js`**. Seleção via
  motor próprio (Selection/Range + `Intl.Segmenter` + CSS Custom Highlight API). Persistir por CFI.
- **2026-07-14** — **Tradução comum = API de MT + cache** (dicionário offline adiado). **Provedor:
  Azure Translator** (2M car./mês grátis). **Tradução contextual = gpt-4o-mini** com o parágrafo.
- **2026-07-14** — **Autorizado a codar.** Checklist de execução montado.

---

## 🔎 Síntese das pesquisas (o que os DRs recomendam)

> Recebidos: **DR-1, DR-2, DR-3, DR-4, DR-5** (em `docs/drs/`). A DR-1 (leitor) e a DR-3 (seleção)
> convergem na mesma recomendação. Resumo com as decisões que puxam:

### Leitor + seleção (DR-1 + DR-3) — MVP-crítico
- **Nenhuma lib pronta** entrega "press-and-hold + expandir por palavra + menu próprio + iframe".
  A arquitetura real = **leitor EPUB (iframe same-origin) + nosso motor de seleção** por cima.
- ✅ **Decidido: `foliate-js`** — a DR-1 recomenda ele como engine de produção. Vantagem decisiva
  pro nosso caso: `text-walker.js` + `Intl.Segmenter` (seleção nativa por palavra/frase → DOM
  Ranges) e `overlayer.js` (SVG de destaque + `.hitTest()`). CFI robusto; alterna scroll↔paginado.
- **Detalhes de implementação (DR-1):**
  - **Sem SSR possível** (iframe/`window`/`DOMParser`): encapsular em Client Component com
    `dynamic(() => import(...), { ssr: false })`. Reader é tela autenticada, sem SEO — ok.
  - **Vendorizar o foliate-js como git submodule** fixando um commit (API instável por design,
    sem release nem tipos oficiais → escrevemos nossos `.d.ts` da superfície usada).
  - **CSP obrigatória** bloqueando scripts do EPUB (`'self'`), já que aceitamos upload de EPUB e o
    sandbox do iframe é furado (WebKit Bug 218086).
  - **Readest** (Next.js + foliate-js, em produção) é ótima **referência de arquitetura** — mas é
    **AGPL-3.0**: só olhar, **não copiar código**.
  - Alternativa de "meio-termo" registrada, se um dia a instabilidade incomodar: **`@likecoin/epub-ts`**
    (linhagem epub.js, TS, mantido em 2026, bundle 57KB).
- **`Intl.Segmenter` (granularity `word`)** é a autoridade de limites de palavra (multi-idioma).
- Render de destaque: **`overlayer.js` (SVG)** e/ou **CSS Custom Highlight API** (fallback DOM).
- Persistir seleção como **CFI + texto + locale**, nunca pixels. Progresso via `fraction` do
  evento `relocate`.
- **Mobile é o maior risco do projeto** (alças nativas x customizadas). Estratégia A (apoiar na
  seleção nativa + menu flutuante) primeiro; alças próprias só na fase 2. Limite de expressão
  ~**8 palavras** (padrão LingQ). Testar em **dispositivo real cedo**.

### Tradução comum, sem IA (DR-4)
- Recomendação "produção séria": **dicionário primeiro (Wiktionary via dumps Kaikki/wiktextract,
  ~23 GB) + MT de fallback (Google Cloud Translation, 500k car./mês grátis)** com cache agressivo.
- ⚠️ Para o **nosso porte** (app familiar/educacional), self-hospedar 23 GB de Wiktionary é pesado
  pro MVP. ✅ **Decidido: só API de MT + cache** no nosso banco; dicionário offline vira otimização
  futura. **Provedor sugerido: Azure Translator** (free tier de 2M car./mês, o maior) ou Google
  (500k/mês) — *a confirmar na implementação*.
- Evitar: Lingva/proxies não-oficiais, Linguee/WordReference (sem API), Glosbe (fora do ar),
  MyMemory (só protótipo).

### PDF → EPUB (DR-2) — fase 3
- Não há conversor "mágico". Pipeline em fases; **MVP da conversão = Calibre `ebook-convert`
  + OCRmyPDF** (Docker, fila BullMQ/Redis, worker separado). Docling (MIT) entra se a qualidade
  saturar em layouts complexos. Confirma que isso é **peso de fase 3**, não do MVP.

### Letras de música (DR-5) — fase 4
- **Exibir letra completa sem licença = risco jurídico** (direito da composição é do
  compositor/editora; NMPA faz enforcement ativo). Provedores licenciados: **LyricFind /
  Musixmatch comercial** (preço sob consulta, B2B).
- Para **MVP/uso familiar**: **LRCLIB** (grátis, sem chave, letras **sincronizadas** LRC) — zona
  cinzenta, aceitável para uso privado/educacional, **não** para produto comercial público.
- Mitigação de risco que combina com o nosso caso: exibir **só trechos marcados pelo usuário**,
  não a letra inteira. ⟵ *a decidir na fase 4*.

---

## 🗃️ Esboço do modelo de dados (schema novo, a validar)

> Provável schema Postgres novo no Supabase (ex.: `leitor`), separado do `anki`. Rascunho — será
> refinado com os resultados das DRs (ex.: se guardamos CFI, formato do EPUB processado, etc.).

- **`books`** (biblioteca compartilhada): `id`, `title`, `author`, `language` (en-US/pt-BR),
  `storage_path` (arquivo no Supabase Storage), `cover_path?`, `uploaded_by`, `created_at`.
- **`reading_progress`** (por usuário): `id`, `book_id`, `user_id`, `location` (CFI/percentual),
  `updated_at`.
- **`word_bank`** (por usuário): `id`, `user_id`, `book_id?`, `source_type` (`book` | `song` …),
  `selected_text`, `paragraph_context`, `translation_common?`, `translation_contextual?`,
  `context_explanation?`, `location_cfi?`, `created_at`.
  - *(fases futuras: `deck_id?` da associação livro↔baralho, flag "virou card")*

---

## 📨 Prompts de deep research (copiar e enviar)

> Contexto comum a todos: app **Next.js 15 (App Router) + React 19 + TypeScript**, backend
> **Supabase (Postgres + Storage)**, deploy em **Docker (VPS, Node 22)**. Preferência por soluções
> **open-source / gratuitas ou de baixo custo**, self-hostáveis, com licença compatível com uso
> comercial. Público: estudo de idiomas (inglês → pt-BR). Já temos **OpenAI API** e **TTS via
> Web Speech API**.

---

### DR-1 — Leitor de EPUB no navegador (React/Next.js)

```
Preciso escolher a melhor stack para um LEITOR DE EPUB rodando no navegador dentro de uma app
React/Next.js 15 (App Router, TypeScript). Faça uma pesquisa comparativa e aprofundada.

Compare as principais bibliotecas open-source de renderização de EPUB no browser — inclua ao
menos: epub.js, react-reader, foliate-js, e quaisquer alternativas modernas relevantes (2024–2025).

Para cada uma, avalie:
- Manutenção/atividade do projeto, licença, tamanho do bundle, compatibilidade com React 19 / Next 15.
- Qualidade de renderização (paginação, colunas, fontes, imagens, EPUB3, mídia).
- Suporte a SELEÇÃO DE TEXTO programática e a "CFI" (EPUB Canonical Fragment Identifier) para
  ancorar/persistir marcações e destaques de forma estável entre sessões.
- Suporte a destaques/anotações (highlights), eventos de seleção, e injeção de menu de contexto próprio.
- Como lidam com o fato de o conteúdo ser renderizado dentro de iframe (impacto em eventos de
  toque/mouse, seleção e estilos).
- Persistência de progresso de leitura (localização/porcentagem).
- Acessibilidade e desempenho em mobile.

Entregue: tabela comparativa + uma RECOMENDAÇÃO final justificada para o nosso caso (leitor com
seleção avançada de palavras e menu de contexto customizado), com riscos e pontos de atenção.
```

---

### DR-2 — Conversão PDF → EPUB (no servidor)

```
Preciso converter arquivos PDF enviados por usuários em EPUB, no servidor (backend Node.js
rodando em Docker/Linux, VPS), para leitura posterior num leitor de EPUB web. Pesquise as melhores
opções, priorizando QUALIDADE do texto extraído (fluxo de leitura correto, sem lixo de layout).

Cubra:
- Ferramentas open-source self-hostáveis: Calibre (ebook-convert), Pandoc, Sigil, pdf2epub e
  quaisquer outras relevantes. Como rodam em Docker (headless), dependências, licença.
- APIs/serviços gerenciados de conversão (com custo) como alternativa — cite preços e limites.
- Diferença de resultado entre PDFs "de texto" (reflowable) e PDFs "escaneados/complexos"
  (multi-coluna, imagens) — quando a conversão dá bom resultado e quando falha.
- Papel de OCR (ex.: Tesseract) para PDFs escaneados, e impacto na precisão.
- Estratégias de pipeline: PDF → (OCR?) → texto/HTML limpo → EPUB. Bibliotecas de apoio.
- Riscos de qualidade e como mitigar (limpeza de hifenização, quebras de linha, cabeçalhos/rodapés).

Entregue: tabela comparativa + recomendação de pipeline para produção em Docker, com trade-offs de
qualidade x complexidade x custo, e um "caminho mínimo viável" para começar.
```

---

### DR-3 — Seleção de texto avançada (click-and-hold + expandir)

```
Numa app web (React), quero uma interação de SELEÇÃO DE TEXTO específica para estudo de idiomas,
sobre texto renderizado (incluindo dentro de um iframe de leitor EPUB):

Comportamento desejado:
- Usuário CLICA E SEGURA (press-and-hold) sobre uma palavra → ela é marcada.
- A partir daí, o usuário pode AMPLIAR a seleção incrementalmente, palavra por palavra
  (para os lados), formando uma expressão de várias palavras — inclusive em mobile (toque).
- Ao soltar/confirmar, abre um menu de contexto customizado (copiar, ouvir, traduzir, salvar).

Pesquise técnicas e bibliotecas para implementar isso na web:
- Selection API / Range API do navegador, e como estender seleção por "palavra" e por "unidade".
- Bibliotecas de highlight/anotação (ex.: rangy, web-highlighter, recogito/annotorious, marker.js,
  ou específicas de EPUB) — quais suportam seleção por toque, expansão e persistência.
- Desafios de seleção dentro de IFRAME (leitor EPUB): eventos, coordenadas, estilos do highlight.
- UX de seleção por toque em mobile (long-press, alças de seleção nativas x customizadas), e como
  conciliar com a seleção nativa do SO.
- Segmentação de palavras (word boundaries) confiável, incluindo Intl.Segmenter.

Entregue: abordagens recomendadas (com prós/contras), bibliotecas viáveis, e um esboço de
arquitetura da interação (desktop + mobile) para o nosso caso.
```

---

### DR-4 — API de dicionário/tradução EN→PT-BR (tradução "comum", sem IA)

```
Preciso de uma tradução RÁPIDA e "de dicionário" de palavras e expressões curtas do INGLÊS para o
PORTUGUÊS DO BRASIL, para exibir ao usuário ao selecionar um termo num leitor. É a tradução
"comum" (SEM IA) — a versão contextual com IA é um caminho separado.

Pesquise e compare fontes/APIs, priorizando GRATUITAS ou de baixo custo, CONFIÁVEIS e com licença
que permita uso comercial:
- APIs de tradução: Google Cloud Translation, DeepL API (free/pro), Microsoft Translator,
  LibreTranslate (self-host), Lingva, MyMemory, Yandex — cobertura EN→PT-BR, qualidade, limites,
  preços, termos de uso.
- Fontes de DICIONÁRIO (definições + traduções), ex.: Wiktionary/Wikcionário (via API/dumps),
  Free Dictionary API, Linguee/DeepL glossário, WordReference (há API oficial?), Glosbe.
- Qualidade específica para EXPRESSÕES e phrasal verbs (não só palavra isolada).
- Diferença prática entre "tradução automática" (translate) e "verbete de dicionário" para o nosso
  uso, e se convém combinar as duas.
- Limites de taxa, necessidade de chave, custo em escala, e se dá para cachear resultados.

Entregue: tabela comparativa + recomendação (talvez uma fonte primária + fallback), com atenção a
custo, confiabilidade e licença.
```

---

### DR-5 — Fonte confiável e legal de letras de música (inglês)

```
Preciso obter as LETRAS CORRETAS de músicas em inglês (geralmente muito famosas) para uma app de
estudo de idiomas, onde o usuário marca palavras/trechos da letra. Preciso de uma fonte CONFIÁVEL
(letra precisa) e LEGALMENTE adequada.

Pesquise a fundo:
- Provedores/APIs de letras: Musixmatch API, Genius API, LRCLIB, Lyrics.ovh, Happi.dev, AZLyrics
  (scraping), entre outros. Para cada um: cobertura de músicas famosas, PRECISÃO da letra,
  licenciamento/direitos, se a API oficial permite EXIBIR a letra ao usuário (e sob quais termos),
  limites e custos.
- A questão dos DIREITOS AUTORAIS de letras: o que é permitido (exibir letra completa vs trechos),
  e quais provedores são devidamente licenciados (ex.: Musixmatch/LyricFind) vs fontes de scraping
  com risco jurídico.
- Suporte a letras SINCRONIZADAS (timestamps/LRC) — útil para leitura acompanhando a música.
- Melhor forma de buscar (por título + artista; matching confiável).
- Recomendação considerando um app pequeno/educacional: a opção mais segura juridicamente e
  confiável em precisão, com plano B.

Entregue: tabela comparativa (cobertura, precisão, licença, custo, sincronização) + recomendação
final e alerta sobre riscos de direitos autorais.
```

---

## 🗺️ Checklist de execução

> Só será montado **depois** do plano fechado e da autorização para codar.
