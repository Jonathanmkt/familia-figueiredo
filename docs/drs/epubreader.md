# Melhor stack para um leitor de EPUB no navegador (React 19 / Next.js 15 App Router, TypeScript) — com foco em seleção avançada e menu de contexto customizado

## TL;DR
- **Recomendação principal: adote foliate-js (o motor de renderização por trás do app Foliate e do Readest) como engine, não o epub.js.** Ele oferece seleção a nível de palavra/frase via `text-walker.js` + `Intl.Segmenter`, um sistema de overlay extensível (`overlayer.js`) para destaques customizados, CFI robusto e paginação por CSS multi-column — exatamente o que seu caso de uso (seleção precisa + menu de contexto) exige.
- **epub.js / react-reader são o caminho de menor esforço e a opção mais "battle-tested", mas estão essencialmente estagnados** (epub.js travado na 0.3.93, publicada há ~4 anos) e têm bugs conhecidos e não corrigidos de seleção de texto em Mobile Safari dentro do iframe — um risco direto para o seu requisito central.
- **Nenhuma dessas libs renderiza no servidor:** todas dependem de `iframe`, `window`, `DOMParser` e Web APIs, então em Next.js 15 App Router você obrigatoriamente as encapsula em Client Components com `dynamic(() => import(...), { ssr: false })`. Isso é uma restrição arquitetural, não um bug.

## Key Findings

**1. O ecossistema se divide em duas linhagens.** A linhagem "epub.js" (epub.js original, react-reader, react-epub-viewer, epubjs-react-native, e forks TypeScript como @likecoin/epub-ts) e a linhagem "foliate-js" (foliate-js de johnfactotum, Readest, react-ebook, anx-reader). A linhagem foliate-js é a mais moderna e ativamente desenvolvida em 2024–2026.

**2. epub.js está estagnado, mas onipresente.** A última versão npm é a 0.3.93 (publicada há ~4 anos); a última tag de release no GitHub é o merge do PR #280 ("Fix toc and nav for ie"), e o `package.json` no master ainda declara `"version": "0.3.93"` — confirmando a ausência de release estável recente. O branch 0.4 beta nunca virou release. O repositório tem ~6.9k estrelas e ~1.2k forks, mas centenas de issues abertas (incluindo a issue #1268 "Maintenance?" sem resposta do mantenedor). Ainda assim, é a base de praticamente todos os wrappers React prontos. Licença BSD-2-Clause (permissiva). Bundle de **132,8 KB gzip** (medido no benchmark do @likecoin/epub-ts, Apple M4 Pro / Chrome 146 / Node 20).

**3. foliate-js é tecnicamente superior, porém sem release estável e sem tipos TypeScript oficiais.** Licença MIT. É "pure JavaScript", modular, ES modules sem build step, sem dependências pesadas, e não carrega o arquivo inteiro na memória. Suporta EPUB, MOBI, KF8 (AZW3), FB2, CBZ e PDF (experimental). O README avisa, verbatim: *"This library itself is, however, not stable. Expect it to break and the API to change at any time. Use it at your own risk... it is recommended that you include the library as a git submodule."* Tem ~1k estrelas, ~210 forks, ~299 commits e nenhum release publicado.

**4. Para o seu caso de uso específico (seleção a nível de palavra + menu de contexto), foliate-js tem uma vantagem decisiva:** o módulo `text-walker.js` reúne todos os nós de texto de um Range/Document, segmenta-os com `Intl.Segmenter` (segmentação por palavra/frase sensível ao locale) e recupera os resultados como DOM Ranges. O `overlayer.js` renderiza SVG arbitrário sobre o texto (não só highlights: sublinhados ondulados, desenhos à mão livre) e expõe `.hitTest(event)` para detectar cliques em anotações. Isso é feito para o tipo de UX que você descreve.

**5. epub.js também suporta seleção e highlights, mas com atrito conhecido.** Ele emite `rendition.on("selected", (cfiRange, contents) => ...)`, converte a seleção em `cfiRange`, tem `rendition.annotations.highlight/underline/mark`, e permite injetar CSS via `rendition.themes`. Porém, há um bug documentado e não resolvido — issue #904, *"Mobile Safari text selection broken for many ePubs on iOS (iPad)"*, verbatim: *"as soon as you touch one of the drag handles, the drag region contracts to one character and cannot be altered thereafter. This makes text highlighting and selection impossible."* Reprodutível em iPad (iPhone não afetado). Também há bugs de iframe "andando" durante troca de página no Android Chrome/iOS (issue #1067).

**6. Persistência de progresso e ancoragem de marcações:** ambas as libs usam EPUB CFI como identificador canônico e estável entre sessões, tamanhos de tela e fontes. epub.js tem `EpubCFI`, `book.getRange(cfi)`, `rendition.currentLocation()` e o sistema de `Locations` (gera porcentagem de leitura, mas é caro de gerar). foliate-js parseia CFI como estrutura de dados (array/objeto), tem `resolveCFI`, emite `relocate` com `range`, `index` e `fraction` (0–1), e seu paginador ancora a view a um Range mesmo após resize/mudança de fonte — mais preciso que o epub.js.

## Details

### epub.js (futurepress/epub.js)
- **Manutenção:** Travado na 0.3.93 (npm há ~4 anos; última tag no GitHub é o PR #280). Branch 0.4 abandonado como beta. ~6.9k stars, ~1.2k forks, centenas de issues abertas. De facto em manutenção mínima/abandonado pelo autor original (Fred Chasen).
- **Licença:** BSD-2-Clause (Free BSD) — ok para SaaS comercial.
- **Bundle:** 132,8 KB gzip (dependência principal jszip). Pesado.
- **React 19 / Next.js 15:** Funciona apenas client-side. Precisa de `"use client"` + `dynamic(..., { ssr: false })`. Erros clássicos de `window is not defined` / `DOMParser` no SSR se importado no servidor.
- **Renderização:** Paginação via CSS multi-column, colunas, fontes customizadas via `themes`, imagens. EPUB2 sólido; EPUB3 "a maioria funciona", mas com falhas; media overlays e fixed layout têm suporte fraco/incompleto.
- **Seleção/CFI/anotações:** evento `selected`, `EpubCFI`, `annotations.highlight`, injeção de CSS via `themes.default`. Seleção a nível de palavra exige lógica manual (varrer o texto e achar limites de frase) — não há API nativa de segmentação.
- **iframe:** conteúdo em iframe `sandbox="allow-same-origin"`; seleção e eventos cross-iframe funcionam no desktop, mas têm bugs sérios em mobile Safari.
- **Acessibilidade:** depende quase inteiramente da qualidade do XHTML do próprio EPUB; a lib não adiciona ARIA ao conteúdo.

### react-reader (gerhardsletten/react-reader)
- **O que é:** wrapper React fino sobre epub.js (branch 0.3). Componentes `<ReactReader>` e `<EpubView>`.
- **Manutenção:** npm v2.0.15 publicada há ~9 meses (≈ out/2025); 899 stars, 145 forks, apenas 5 issues abertas, 304 commits. Escrito 100% em TypeScript. Sem release em 2026, mas relativamente cuidado para um wrapper.
- **Licença:** `package.json` declara **ISC**; o README/About do GitHub cita Apache-2.0 (discrepância — a fonte autoritativa publicada é ISC). Ambas permissivas.
- **React 19 / Next.js 15:** devDependencies usam react ^19.0.0 e react-dom ^19.0.0 (desenvolvido/testado contra React 19); **não declara peerDependency de react**, então não gera erro de peer-deps no React 19. Herda todas as limitações client-side de epub.js: use em Client Component com import dinâmico e SSR desabilitado.
- **Seleção/menu:** expõe `getRendition` para acessar o rendition do epub.js e registrar `rendition.on('selected', ...)` e `rendition.themes`. É a forma mais rápida de ter seleção + highlight funcionando. **Aviso do README, verbatim:** a prop `swipeable` *"will disable interacting with epub.js iframe content like selection"* — não a ative se precisar de seleção.
- **Limitação de progresso:** como epub.js só renderiza o capítulo atual, você obtém página/total dentro do capítulo, não do livro inteiro, sem gerar `locations` (custoso).

### foliate-js (johnfactotum/foliate-js)
- **O que é:** motor de renderização de e-books usado pelo app Foliate e pelo Readest. Web Component `<foliate-view>`.
- **Manutenção:** ~1k stars, ~210 forks, ~299 commits, sem releases publicados. Desenvolvimento ativo pelo autor (johnfactotum). API instável por design.
- **Licença:** MIT (vendored: zip.js BSD-3, fflate MIT, PDF.js Apache).
- **Renderização:** paginação CSS multi-column (mesma estratégia do epub.js, mesmas limitações de performance), colunas configuráveis (`max-column-count`), alterna scrolled/paginated sem reload (epub.js não consegue), renderer separado para fixed-layout, suporte a RTL, header/foot via `::part()`.
- **Seleção a nível de palavra/frase:** `text-walker.js` + `Intl.Segmenter` — feito exatamente para segmentar por palavra/frase e mapear de volta para DOM Ranges. Vantagem central para o seu caso.
- **Anotações/menu:** `overlayer.js` desenha SVG arbitrário; evento `create-overlayer`; `.hitTest(event)` para detectar toque/click sobre anotação. Você constrói o menu de contexto em React fora do iframe, posicionado pelas coordenadas do Range.
- **CFI:** `epubcfi.js` parseia CFI como estrutura de dados; funciona standalone em Node; suporta ignorar nós injetados (filtro tipo TreeWalker) para não corromper CFIs ao inserir seus próprios elementos — design melhor que o epub.js.
- **iframe/segurança:** conteúdo em iframe via `blob:` no mesmo origin; scripting do EPUB NÃO é suportado; devido ao WebKit Bug 218086 o sandbox é inútil, então o README exige CSP bloqueando todos os scripts exceto `'self'`. O paginator tem lógica específica para evitar interferência do overscroll do iOS.
- **TypeScript:** sem tipos oficiais (é JS puro). Você escreve seus próprios `.d.ts` ou usa via wrapper.
- **Sem release / submodule:** recomendação oficial é vendorizar como git submodule e fixar o commit.

### Readest (readest/readest) — referência de arquitetura
- App de leitura open-source, reescrita moderna do Foliate, construída com **Next.js (16) e Tauri v2**, usando **foliate-js** como engine de renderização. Roda em macOS, Windows, Linux, Android, iOS e Web. Tem anotações (highlights, bookmarks, notes), busca full-text, dicionário/Wikipedia, tradução DeepL/Yandex, TTS, sync entre dispositivos e acessibilidade (VoiceOver, TalkBack, NVDA, Orca). **~22,3k stars** (jul/2026). **Licença AGPL-3.0** — atenção: copyleft forte, inadequado para copiar código diretamente para um SaaS proprietário, mas excelente prova de que foliate-js escala para produção com Next.js.

### Alternativas modernas e forks ativos
- **@likecoin/epub-ts** (fork TypeScript de epub.js 0.3.93): último release **v0.6.6 em 27/mai/2026**, **ativamente mantido** (150 commits, changelog 2026, 970+ testes), licença BSD-2-Clause, **57,5 KB gzip (−56,7% vs epub.js)**, 1 dependência runtime (jszip), API drop-in (troca uma linha de import), suporte a Node via linkedom. Ganho de performance dramático: `locations.generate` para War and Peace (1.7 MB) cai de 42.903 ms para 158,9 ms (−99,6%). Não é lib React, mas é o melhor caminho se você quer ficar na linhagem epub.js com TypeScript moderno e manutenção viva.
- **react-ebook / npm `react-ebookjs`** (lennartkerkvliet, sobre foliate-js): v0.0.5, MIT, apenas 6 stars, 8 commits, early-stage e praticamente inativo; README avisa que depende do foliate-js instável. Não declara React 19. Útil como referência de como envelopar foliate-js em componentes React, não para produção.
- **react-epub-viewer** (altmshfkgudtjr): sobre epub.js 0.3; a versão 0.3.0 modernizou o toolchain — funciona com React 17/18/19, ships ESM+CJS, tipos TS, tem diretiva `"use client"` para App Router e corrige o erro `regeneratorRuntime is not defined`. Boa opção intermediária se quiser um componente React pronto compatível com App Router.
- **Thorium Web / @edrlab/thorium-web** (EDRLab, baseado em Readium): reader web open-source com pacotes `@readium/navigator` etc., integra com React/Next.js (componente `<StatefulReader>`). Foco em conformidade EPUB3, acessibilidade e DRM (LCP). Mais pesado e opinativo; bom se precisar de conformidade Readium/EPUB3 rigorosa, mas curva de adoção maior e problemas conhecidos em iPadOS/Safari (fullscreen desabilitado no iPadOS por bugs).
- **epubjs-react-native** (victorsoares96): apenas React Native (WebView), não serve para web/Next.js, mas mostra API de menu de seleção customizado (`menuItems`, `onSelected`).

### Tabela comparativa

| Critério | epub.js | react-reader | foliate-js | @likecoin/epub-ts | react-epub-viewer | Readium/Thorium Web |
|---|---|---|---|---|---|---|
| **Tipo** | Engine JS | Wrapper React (epub.js) | Engine JS (Web Component) | Engine TS (fork epub.js) | Componente React (epub.js) | Framework/Reader (Readium) |
| **Última release** | 0.3.93 (~4 anos) | 2.0.15 (~out/2025) | Sem release (dev ativo) | v0.6.6 (mai/2026) | 0.3.0 (recente) | Ativo |
| **Manutenção** | Estagnado/abandonado | Cuidado (wrapper) | Ativo (autor) | Ativo (2026) | Ativo | Ativo (EDRLab) |
| **Licença** | BSD-2-Clause | ISC (npm) | MIT | BSD-2-Clause | (verificar) | BSD-3 + LCP |
| **Bundle (gzip)** | 132,8 KB | epub.js + wrapper | Pequeno/modular | 57,5 KB | epub.js + wrapper | Pesado |
| **React 19 / Next 15** | Client-only (ssr:false) | dev-testado c/ React 19; client-only | Client-only; via Web Component | Client-only (não-React) | React 17/18/19; "use client" | React; client-only |
| **Paginação/colunas** | Sim (multi-column) | Sim | Sim (+ scroll↔paginated) | Sim | Sim | Sim |
| **EPUB3 / fixed layout / media overlays** | Parcial/fraco | Parcial | Fixed layout dedicado; sem media overlays | Parcial (como epub.js) | Parcial | Melhor conformidade |
| **CFI** | EpubCFI | via epub.js | epubcfi.js (+ filtro de nós) | EpubCFI (TS) | via epub.js | Readium locators/CFI |
| **Seleção nível de palavra** | Manual | Manual | Nativo (`text-walker`+`Intl.Segmenter`) | Manual | Manual | Via Readium |
| **Highlights/anotações** | annotations API | via rendition | overlayer.js (SVG extensível) | como epub.js | mouseup + cores | Nativo |
| **Menu de contexto custom** | Você constrói | Você constrói (getRendition) | Você constrói (hitTest+Range) | Você constrói | Você constrói | Parcial |
| **Bug seleção mobile Safari** | Sim (#904) | Herda | Melhor (paginator anti-overscroll iOS) | Herda de epub.js | Herda | Bugs iPadOS |
| **TypeScript** | Tipos comunitários | Nativo TS | Sem tipos oficiais | TS first (strict) | Tipos bundled | TS |
| **Acessibilidade** | Depende do EPUB | Depende do EPUB | Depende do EPUB | Depende do EPUB | Depende do EPUB | Referência a11y |

## Recommendations

**Estágio 1 — Prototipar rápido (semana 1):** Se precisa validar o produto já, comece com **react-reader** (ou react-epub-viewer se quiser App Router "use client" pronto) dentro de um Client Component com `dynamic(() => import('./Reader'), { ssr: false })`. Registre `rendition.on('selected', ...)`, capture o `cfiRange`, e renderize seu menu de contexto fora do iframe usando o bounding rect do Range. Isso valida o fluxo highlight/copy/definição em dias. **Não ative a prop `swipeable`** (ela desabilita a seleção no iframe).

**Estágio 2 — Testar o requisito crítico em mobile (semana 1–2):** Antes de commitar a arquitetura, teste seleção de texto no **Mobile Safari (iOS real, não só simulador)** e Android Chrome com epub.js. Se reproduzir o bug de colapso de seleção (#904) ou o iframe "andando" (#1067), esse é o gatilho para migrar para foliate-js.

**Estágio 3 — Arquitetura de produção (recomendada):** Adote **foliate-js** como engine, vendorizado como git submodule fixado num commit conhecido, encapsulado num Web Component `<foliate-view>` montado dentro de um Client Component React (`ssr: false`). Implemente:
- Seleção a nível de palavra/frase com `text-walker.js` + `Intl.Segmenter`.
- Menu de contexto customizado em React, posicionado pelas coordenadas do Range, ouvindo `selectionchange`/`pointerup` dentro do iframe e re-emitindo para o parent.
- Highlights via `overlayer.js` (SVG), persistidos por CFI no seu backend.
- Progresso de leitura persistido pelo `fraction` + CFI do evento `relocate`.
- Escreva seus próprios tipos TypeScript para a superfície de API que você usar.

**Alternativa de "meio-termo" se manutenção/tipos forem prioridade sobre features avançadas de seleção:** use **@likecoin/epub-ts** (linhagem epub.js, TypeScript first, mantido em 2026, bundle 57,5 KB, `locations` ~270× mais rápido) e construa sua própria camada React fina em vez de react-reader.

**Benchmarks/limiares que mudam a decisão:**
- Se o bug de seleção mobile do epub.js **não** reproduzir nos seus EPUBs-alvo e você quer time-to-market mínimo → fique em react-reader/epub-ts.
- Se seleção precisa em iOS/Android for inegociável, ou você precisa de fixed-layout/MOBI/scroll-and-paginated → foliate-js.
- Se precisar de conformidade EPUB3/DRM (LCP) e acessibilidade certificada → avaliar Readium/Thorium.

## Caveats e riscos técnicos

- **SSR é impossível para todas as opções.** iframe + `window` + `DOMParser` são client-only. Mitigação: `dynamic import` com `ssr: false`, guardas `typeof window !== 'undefined'`, e acesso a DOM só em `useEffect`. Consequência: o reader não terá HTML pré-renderizado/SEO — aceitável para um app de leitura autenticado.
- **foliate-js: API instável e sem release nem tipos.** Risco de breaking changes (o próprio README diz "expect it to break"). Mitigação: vendorizar via submodule fixando commit, cobrir com testes de integração, escrever tipos próprios. Você assume o custo de manutenção da camada de integração.
- **Seleção cross-iframe em mobile é o maior risco do projeto inteiro.** Tanto epub.js quanto foliate-js renderizam em iframe; eventos de toque, handles de seleção nativos e `getSelection()` se comportam de forma inconsistente entre Mobile Safari e Chrome Android. Mitigação: testar cedo em dispositivos reais; considerar UI de seleção customizada (tap-to-select-word via `Intl.Segmenter` + Range em vez de depender dos handles nativos), que também é onde foliate-js brilha.
- **Segurança/CSP obrigatória.** EPUBs podem conter scripts; o sandbox do iframe é inútil por causa do WebKit Bug 218086. Aplique CSP bloqueando scripts exceto `'self'`, especialmente se aceitar uploads de EPUB de usuários no SaaS.
- **Licenças:** epub.js (BSD-2), foliate-js (MIT), react-reader (ISC), epub-ts (BSD-2) são todas ok para SaaS proprietário. **Readest é AGPL-3.0** — não copie código dele; use só como referência arquitetural. Readium/Thorium são majoritariamente BSD-3, mas o módulo LCP tem termos de DRM a verificar.
- **Performance em livros grandes.** A paginação por CSS multi-column é lenta em ambas as libs; gerar `locations`/CFIs para o livro inteiro é caro em epub.js (mitigado dramaticamente em @likecoin/epub-ts). Mitigação: gerar sob demanda, cachear no backend, usar o `fraction` por seção do foliate-js para progresso aproximado sem gerar todos os CFIs.
- **Acessibilidade depende do EPUB.** Nenhuma lib injeta ARIA no conteúdo; a a11y do texto vem do XHTML do livro. Você controla apenas a a11y da sua toolbar/menu (ARIA, foco, teclado). Readest é a referência de a11y completa (VoiceOver/TalkBack/NVDA/Orca) e mostra que a stack Next.js + foliate-js consegue chegar lá.