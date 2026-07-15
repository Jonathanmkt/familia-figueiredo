# Seleção de Texto Palavra-a-Palavra em App React de Estudo de Idiomas (incl. iframes de EPUB): Pesquisa de Arquitetura Técnica

## TL;DR
- **Construa sua própria camada de seleção sobre as APIs Selection + Range e use `Intl.Segmenter` (granularity `'word'`) como a fonte de verdade para os limites de palavras**, em vez de depender do não-padronizado `Selection.modify('extend', …, 'word')`. `Intl.Segmenter` é correto por idioma (trata chinês/japonês/tailandês e apóstrofos do francês), é Baseline "newly available" desde 16 de abril de 2024, e é a única forma robusta de segmentar os idiomas difíceis que um app de idiomas precisa suportar.
- **Para o leitor EPUB, use um iframe same-origin (epub.js ou foliate-js) e comande a seleção a partir do próprio `document`/`window` do iframe.** O epub.js já expõe `rendition.on("selected", cfiRange => …)` e a API `annotations.highlight(cfiRange)` com CFIs serializáveis; a comunicação de volta para o shell React é feita via acesso direto ao `contentWindow` (same-origin) ou `postMessage`. O Mobile Safari tem um bug documentado no epub.js onde a seleção por alças colapsa — a maior área de risco do projeto.
- **No mobile, você precisa escolher entre a seleção nativa do SO (duplo-toque/long-press + alças nativas) e uma seleção totalmente customizada com alças próprias.** O caminho pragmático é *apoiar-se na seleção nativa* onde ela funciona e sobrepor um menu de contexto flutuante próprio (via `selectionchange`), desabilitando o callout nativo com `-webkit-touch-callout: none`; um sistema de alças totalmente customizado é muito mais trabalho e deve ser um investimento de fase 2.

## Key Findings

1. **`Selection.modify('extend', direction, 'word')` funciona, mas é explicitamente não-padrão.** A MDN alerta: "This feature is non-standard and is not on a standards track. Do not use it on production sites facing the Web… There may also be large incompatibilities between implementations and the behavior may change in the future." Segundo a caniuse.com ("Selection API: modify", ~96,7% de suporte global), ainda assim é suportado em Chrome/Chromium, Edge 79+, Firefox 4+, Safari desktop 3.1+, Safari iOS 3.2+ e Chrome/Firefox para Android. É utilizável como conveniência, mas não como fundação de correção.

2. **`Intl.Segmenter` é o tokenizador de palavras multi-idioma correto.** Alcançou status Baseline "newly available" em 16 de abril de 2024 — conforme a web.dev ("The Intl.Segmenter object is now part of Baseline"): "This web feature is now available in all three major browser engines, and becomes Baseline Newly available as of April 16, 2024" (a data em que o Firefox 125, o último motor, lançou). Segmenta corretamente idiomas sem espaços (japonês, chinês, tailandês, lao, khmer, birmanês) e trata apóstrofos/hífens (francês `N'est`, `Allons-y`), expondo uma flag `isWordLike` e índices de caractere. Também oferece `.containing(index)` para acesso aleatório — ideal para "qual palavra o usuário tocou?".

3. **O caso EPUB é fundamentalmente um problema de seleção dentro de iframe.** O epub.js renderiza cada capítulo dentro de um `<iframe>`; a seleção precisa ser lida de `contents.window.getSelection()` (a window do iframe), não da window pai. O epub.js fornece `rendition.on("selected", (cfiRange, contents) => …)`, `book.getRange(cfiRange)` e `rendition.annotations.highlight/underline/mark(cfiRange, data, cb)` com strings EpubCFI serializáveis para persistência.

4. **Mobile é a parte difícil, e as alças nativas conflitam com UIs customizadas.** iOS/Android renderizam suas próprias alças de arrasto e o menu callout no long-press; você pode suprimir o callout com `-webkit-touch-callout: none` e a seleção de texto com `user-select: none`, mas são instrumentos brutos. O evento `selectionchange` (que só pode ser vinculado ao `document`) é o sinal cross-platform confiável para "a seleção foi ajustada com as alças."

5. **A renderização de highlights moderna deve preferir a CSS Custom Highlight API onde disponível.** É suportada nos três motores (o Firefox lançou na versão 140, junho de 2025, via bug 1964089 — conforme o Frontend Masters Blog: "Firefox recently started supporting it (Firefox 140, June 2025), which brought support across all the major browsers"); a CSS Script observa que a API requer "Chrome 105+, Safari 17.2+, or Firefox 140+". Ela realça ranges sem mutar o DOM — e é notavelmente mais rápida: conforme o CSS-Tricks, citando um demo de performance de Fernando Fiori (que trabalhou na API): "On my computer, the CSS Custom Highlight API performs on average 5✕ as fast as the DOM-based highlighting." Crucialmente, não quebra offsets de Range nem interfere na seleção viva do usuário.

## Details

### 1. Selection API / Range API — seleção inicial e expansão incremental

**Primitivas centrais.** `window.getSelection()` retorna um `Selection`; `selection.getRangeAt(0)` dá o `Range` vivo. Um `Range` tem `startContainer/startOffset` e `endContainer/endOffset`, além de `setStart()`, `setEnd()`, `collapse()`, `cloneRange()`, `getBoundingClientRect()` (para posicionar seu menu) e `toString()`. O `Selection` também expõe anchor/focus (que, diferentemente de start/end do Range, podem estar invertidos quando o usuário seleciona da direita para a esquerda) e `setBaseAndExtent()`.

**`Selection.modify()` para extensão por palavra.** A linha única `selection.modify("extend", "forward", "word")` estende a seleção até a próxima palavra. A semântica de direção importa para um app multi-idioma (conforme a MDN):
- `"forward"`/`"backward"` são **lógicas** (bidi-aware): movem na ordem de leitura e são corretas para RTL/árabe/hebraico. Verbatim MDN: "You can specify 'forward' or 'backward' to adjust in the appropriate direction based on the language at the selection point."
- `"left"`/`"right"` são direções **físicas/visuais**.
Use `forward`/`backward` para expansão correta na ordem do idioma.

**Quirks documentados de `Selection.modify()` (da MDN):**
- "Firefox does not implement 'sentence', 'paragraph', 'sentenceboundary', 'paragraphboundary', or 'documentboundary'. WebKit and Blink do." (Apenas as granularidades `word`/`character`/`line` são universais.)
- Divergência de espaço final: "Starting in Firefox 5, the 'word' granularity no longer includes the following space… unfortunately they [WebKit] have recently changed their behavior." Ou seja, o extent exato (com/sem o espaço final) difere entre motores — você precisa normalizar.
- Efeito colateral de foco: "Safari and Chrome (unlike Firefox) currently focus the element containing selection when modifying the selection programmatically."

**Estratégia de expansão recomendada (independente de motor).** Em vez de confiar no extent de palavra inconsistente do `modify()`, comande a expansão você mesmo:
1. No press inicial, faça hit-test do ponto tocado para um text node + offset (ver hit-testing de caret abaixo).
2. Rode `Intl.Segmenter({granularity:'word'})` sobre o `textContent` daquele text node; use `segments.containing(offset)` para achar os índices de início/fim da palavra tocada.
3. Construa um `Range` com `setStart`/`setEnd` nesses índices; registre-o (seleção nativa via `selection.removeAllRanges(); selection.addRange(range)`, ou um CSS Custom Highlight).
4. Para expandir esquerda/direita por uma palavra, ande até o segmento `isWordLike` anterior/próximo e estenda o limite do range. Mantenha um índice de limites de palavra por text node para que cada "expandir" seja O(1).

Esta abordagem "segmentar e depois criar o range" é exatamente a que o CodeMirror adotou para seleção de palavra por duplo-clique em CJK: eles abandonaram a seleção de palavra padrão do navegador e usaram `Intl.Segmenter` para "properly extract the selection range", porque "within CJK, the current specifications will give unnatural results". Uma expansão ingênua por regex (`while range.toString()[0].match(/\w/) …`) é o anti-padrão — quebra em CJK, apóstrofos e caracteres acentuados.

**Hit-testing de caret (toque → posição no texto).** Dois métodos:
- `document.caretPositionFromPoint(x, y)` — **padrão** (retorna `{offsetNode, offset}`), suporta Shadow DOM via opção `shadowRoots`. Suporte (caniuse.com): Firefox 20+, Chrome/Edge 128+, Safari ~26.2+.
- `document.caretRangeFromPoint(x, y)` — legado WebKit/Blink (retorna um `Range`). Suporte histórico mais amplo: Chrome/Edge sempre, Safari 5+, e agora Firefox 150+.
Use o padrão feature-detect + fallback (tentar `caretPositionFromPoint`, senão `caretRangeFromPoint`) mostrado no próprio exemplo da MDN. **Ressalva crítica de iframe (MDN):** "Offsets in `<textarea>` and `<iframe>` elements aren't correct" (bugs Mozilla 824965/826069) — então dentro do iframe do EPUB, chame esses métodos no **`document` próprio do iframe**, usando coordenadas relativas ao viewport do iframe, não do pai.

### 2. Bibliotecas — avaliação para este caso de uso

| Biblioteca | Touch/mobile | Expansão incremental por palavra | Persistir/serializar | Funciona em iframe | Veredito |
|---|---|---|---|---|---|
| **epub.js (built-in)** | Parcial; bug documentado de alças no iOS (#904) | Não (dá o Range/CFI cru; você constrói a expansão) | Sim — strings EpubCFI; `annotations.highlight()` | Sim — ele *é* o renderizador iframe | **Use para a superfície EPUB**; construa a lógica de palavra por cima |
| **foliate-js** | Bom; web-components moderno, usa `Intl.Segmenter` internamente para busca/TTS | Não built-in, mas `relocate`/overlayer dão Range + overlay | Sim — CFI + overlayer/`Overlayer.highlight` | Sim — seus renderizadores são iframes | **Alternativa moderna forte** ao epub.js |
| **rangy** (+ módulos highlighter, textrange, serializer) | Legado; touch funciona via botões, não first-class | Sem extensão nativa por palavra; módulo TextRange ajuda | Sim — `serialize()`/`deserialize()`, baseado em offset de caractere; escopável a um elemento DOM | Sim — padrão comprovado (`rangy.init` no `iframe.contentWindow`) | Maduro mas **sem manutenção**; bom para páginas HTML |
| **web-highlighter** (alienzhou) | Sim — "automatically detect… use touch events on mobile" | Não | Sim — `HighlightSource` (meta start/end, JSON-serializável), `fromStore()` | Não first-class (assume um único documento) | Bom para **persistência de highlight em HTML puro** |
| **mark.js** | N/A (marcação de keyword/range, não seleção do usuário) | Não | `markRanges([{start,length}])` | Opção `iframes: true` | Use apenas para realçar termos de busca |
| **Recogito text-annotator** (`@recogito/text-annotator`) | Rewrite moderno; modelo alinhado a W3C com seletores `{quote, start, end}`; tem wrapper React | "Extend an existing annotation by holding Ctrl/Cmd while selecting" (não por palavra) | Sim — modelo W3C Web Annotation, offsets de caractere | Editor respeita dimensões do iframe | Bom se quiser **anotações alinhadas a padrões** |
| **CSS Custom Highlight API** (nativo do browser) | Sim (só renderização) | N/A (você fornece os ranges) | Você serializa os ranges | Sim (por documento) | **Melhor primitiva de renderização**; combine com sua própria lógica |

**Conclusão sobre bibliotecas:** Nenhuma biblioteca pronta oferece press-and-hold + expansão incremental por palavra + menu de TTS/tradução + cross-frame prontos. A arquitetura realista é: **epub.js ou foliate-js para o iframe do leitor + seu próprio motor de seleção/expansão construído sobre Selection/Range + Intl.Segmenter + CSS Custom Highlight API para renderização.** Use a serialização CFI do epub.js (ou os CFIs do foliate-js) para persistir expressões salvas/flashcards.

### 3. Desafios de iframe / cross-frame

- **Same-origin é requisito rígido para a interação desejada.** Com um iframe same-origin você pode ler `iframe.contentWindow.getSelection()`, anexar listeners ao `iframe.contentDocument`, injetar `<style>`/CSS de highlight e traduzir coordenadas. Cross-origin bloqueia tudo isso — você ficaria limitado a `postMessage` e teria que rodar *toda* a lógica de seleção dentro do iframe e mandar resultados serializados para fora. epub.js e foliate-js renderizam o conteúdo do livro same-origin (blob: URLs), que é o que lhes permite comandar a seleção.
- **A seleção vive no realm do iframe.** `window.getSelection()` no pai **não** vê a seleção dentro do iframe. Você precisa usar a `window`/`document` do iframe. O epub.js expõe isso de forma limpa: `rendition.getContents().map(c => c.window.getSelection())`.
- **Tradução de coordenadas para o menu de contexto.** O rect de um Range dentro do iframe é relativo ao viewport do iframe. Some os offsets do `getBoundingClientRect()` do elemento iframe para posicionar seu menu React no espaço de coordenadas do pai — o helper `getRect(target, frame)` do epubjs-tips é o padrão canônico (`rect.left + frameRect.left`, etc.).
- **Injeção de estilos de highlight.** O epub.js usa `rendition.themes.default({...})` e hooks (`rendition.hooks.content.register`) para injetar CSS e rodar código dentro de cada iframe de capítulo após o render. Seus highlights nativos são overlays SVG com `fill: yellow` hardcoded — sobrescrevível via themes/`.epubjs-hl`.
- **Armadilhas de sincronização de estado.** Highlights renderizam errado após resize/mudança de tema; o epubjs-tips recomenda re-renderizar anotações em eventos `rendered` (`view.pane.render()`). CFIs podem "driftar" em resize. Persista expressões como CFIs (EPUB) ou meta de offset de caractere (HTML), nunca como coordenadas de pixel.
- **`selectionchange` só se vincula ao `document`** (não a elementos arbitrários), e seu objeto de evento não tem coordenadas — você precisa ler a Selection API para geometria. Dentro do iframe, vincule-o ao `document` do iframe.

### 4. UX de toque no mobile

**Detecção de long-press.** Implemente com `touchstart` → inicia um timer (~500–800 ms) → se não houver `touchend`/`touchmove` além de um threshold de movimento, dispare sua ação "selecionar palavra" customizada. Existem bibliotecas vanilla minúsculas (`long-press-event` de john-doherty ~1 KB, `web-long-press`, `jquery.longpress`) com `data-long-press-delay` configurável e tolerância de movimento. Uma lição-chave das issues dessas libs: use uma **tolerância de movimento (~5–10 px)** em vez de cancelar em 1 px de movimento (ruim para acessibilidade), e cuidado com disparos durante pinch-zoom/scroll.

**Alças nativas vs alças customizadas — o conflito central.**
- No iOS/Android, o long-press em texto selecionável dispara a seleção de palavra do SO, as alças de arrasto e o menu callout (Copy, Look Up, Translate…). Esses *competem* com uma UI customizada.
- As notas cross-browser de eventos de seleção de Robert Knight documentam a realidade: durante o arrasto das alças, os navegadores mobile disparam **apenas `selectionchange`** — "no further touch events." Ou seja, você não consegue rastrear o arrasto das alças via eventos de touch; você precisa observar `selectionchange`.
- O bug do epub.js no iOS (#904) é um aviso concreto: em muitos EPUBs, "as soon as you touch one of the drag handles, the drag region contracts to one character and cannot be altered" — alças nativas dentro de iframes transformados/paginados são frágeis.

**Duas estratégias viáveis:**
- **(A) Apoiar-se na seleção nativa + menu customizado (recomendado primeiro).** Deixe o SO criar/estender a seleção com suas alças; suprima o callout nativo com `-webkit-touch-callout: none` (e, se necessário, previna `contextmenu`); escute `selectionchange`; quando a seleção se estabilizar, ajuste ("snap") seus limites para fora até limites de palavra inteira usando `Intl.Segmenter`; então mostre seu próprio menu flutuante (Copiar / Ouvir / Traduzir / Salvar) posicionado a partir do `getBoundingClientRect()` do Range. É o caminho de menor esforço e mais robusto. Ressalva: `user-select: none` / `-webkit-touch-callout: none` podem interferir com teclados de input e devem ter escopo restrito apenas à superfície de leitura.
- **(B) Seleção totalmente customizada + alças próprias (fase 2).** Defina `user-select: none` na superfície de leitura, detecte long-press você mesmo, faça hit-test com `caretRangeFromPoint`, renderize seu próprio highlight de seleção (CSS Custom Highlight API) e seus próprios elementos de alça arrastáveis, e expanda palavra-a-palavra no arrasto da alça. Controle total e comportamento idêntico entre plataformas, mas você reimplementa muito do comportamento do SO (lupa/magnifier, acessibilidade, autoscroll). Leitores estilo Kindle efetivamente fazem isso.

**Apps de referência.** O LingQ implementa exatamente a interação-alvo: tocar numa palavra para consultar; e, conforme a página de suporte do LingQ iOS, verbatim: "Or, create your own phrase LingQs up to 8 words long by simply tapping and dragging to select the phrase… Tap and hold an adjacent word or words to extend into a phrase and check its meaning." Isso confirma o padrão de produto (toque único = palavra; press-hold-drag = expressão multi-palavra) e um **limite prático de 8 palavras** que vale adotar (o app tem também um cap documentado de ~9 palavras para frases longas). *(Ressalva de fonte: comportamentos de Readwise Reader e Kindle são inferidos da UX observável — não foram localizadas fontes de engenharia públicas — enquanto o do LingQ é confirmado por sua própria documentação.)*

### 5. Segmentação de palavras multi-idioma confiável

**Use `Intl.Segmenter`.** `new Intl.Segmenter(locale, {granularity:'word'})` → `.segment(text)` produz objetos `{segment, index, isWordLike}`; filtre por `isWordLike` para descartar espaços/pontuação. Ele trata corretamente:
- Scripts sem espaço: japonês `吾輩は猫である。` → `吾輩 | は | 猫 | で | ある`; chinês `你好世界` → `你好 | 世界`; tailandês `สวัสดีครับ` segmentado sem espaços.
- Apóstrofos/hífens: francês `N'est-ce pas`, `Allons-y`; contração inglesa `don't` = uma palavra.
- `.containing(index)` dá o segmento num índice de code-unit — perfeito para mapear um offset tocado a uma palavra.

**Suporte & polyfills.** Baseline newly-available desde 16 de abril de 2024. Números de versão exatos (Web Platform Features Explorer): "Chrome 87 (2020-11-17)… Edge 87 (2020-11-19)… Firefox 125 (2024-04-16)… Safari 14.1 (2021-04-26)… Safari on iOS 14.5 (2021-04-26)"; disponibilidade ampla ("Widely Available") prevista para 2026-10-16; Node 16+. Para motores mais antigos, use polyfill com `@formatjs/intl-segmenter` (tem guard `shouldPolyfill()` e import dinâmico), `intl-segmenter-polyfill` (WASM compilado de ICU4C, embute o dicionário tailandês por padrão; adicione outros via `filters.json`), ou `intl-segmenter-polyfill-rs`. Como a segmentação de CJK baseada em dicionário adiciona peso, carregue o polyfill de forma lazy e, para textos grandes, rode a segmentação num Web Worker (passe a string crua via `postMessage`; a instância do segmenter em si não é transferível).

**Ressalvas.** Mesmo o `Intl.Segmenter` não segmenta CJK *sem* espaços em branco em nível de "palavra" perfeitamente (é baseado em dicionário/regras e imperfeito para compostos); para CJK você pode tratar caracteres/grafemas isolados como a unidade expansível e deixar o usuário expandir para fora. Sempre passe o locale correto do conteúdo (do metadado `dc:language` do EPUB ou de um detector) para obter as regras de quebra corretas (ex.: kinsoku do japonês).

## Recommendations

**Fase 0 — Fundações (fazer primeiro).**
- Padronize `Intl.Segmenter({granularity:'word'})` como a única autoridade de limites de palavra; encapsule numa utilidade `getWordAt(node, offset)` / `expandByWord(range, direction)` com polyfill carregado de forma lazy para Safari/Node antigos. Passe o locale real do documento.
- Escolha o leitor: **epub.js** (maduro, ecossistema enorme, anotações CFI) ou **foliate-js** (moderno, web-components, já usa `Intl.Segmenter`, alterna scroll/paginado). Prototipe o evento "selected" + highlight em *ambos* antes de decidir; foliate-js é a melhor aposta de longo prazo se você é greenfield, epub.js se precisa de estabilidade e exemplos agora.
- Garanta que o iframe do leitor seja **same-origin**.

**Fase 1 — Desktop + "happy path".**
- Implemente press-and-hold (mousedown + timer) → hit-test com `caretPositionFromPoint`/`caretRangeFromPoint` → selecione a palavra tocada via Range + `Intl.Segmenter`.
- Adicione expansão palavra-a-palavra (setas de teclado e/ou arrasto) andando pelos segmentos; renderize com a **CSS Custom Highlight API** (fallback para span-wrapping só onde não houver suporte).
- No confirm/mouseup, mostre o menu de contexto React customizado posicionado a partir de `range.getBoundingClientRect()` (traduzindo coordenadas do iframe com o offset do frame). Ligue Copiar, Ouvir (Web Speech `speechSynthesis`), Traduzir, Salvar.
- No iframe EPUB, comande tudo a partir de `contents.window`/`contents.document`; persista expressões salvas como **EpubCFI** (ou CFI foliate) + o texto cru + locale.

**Fase 2 — Mobile.**
- Comece com a **Estratégia A** (seleção nativa + `selectionchange` + snapping para limites de palavra + menu flutuante customizado; suprima o callout nativo com `-webkit-touch-callout: none` de escopo restrito). Limite expressões multi-palavra (o LingQ usa até 8 palavras) para manter a UX sã.
- Teste o bug de colapso das alças no iOS do epub.js (#904) cedo em dispositivos reais; se ele te bloquear, esse é o gatilho para migrar para a **Estratégia B** (alças customizadas) especificamente na superfície EPUB.

**Fase 3 — Persistência & sync.**
- Armazene expressões/highlights como `{cfiOrOffsetMeta, text, locale, createdAt}` e re-renderize em eventos `rendered`/resize. Nunca armazene coordenadas de pixel.

**Benchmarks / thresholds que mudam o plano:**
- Se você precisar suportar conteúdo de livro **cross-origin** → abandone a seleção direta; rode toda a lógica dentro de um script injetado no iframe e faça `postMessage` de ranges serializados para fora (grande aumento de complexidade).
- Se a cobertura da **CSS Custom Highlight API** nos seus analytics for <~90% → mantenha span-wrapping (rangy/web-highlighter) como renderizador primário.
- Se testes em dispositivos reais mostrarem que as alças nativas são não confiáveis nos seus EPUBs-alvo → comprometa-se com alças customizadas (Estratégia B).
- Se seus analytics mostrarem tráfego relevante em Safari <14.1 ou WebViews Android antigas → envie o polyfill do `Intl.Segmenter` de forma eager em vez de lazy.

## Caveats
- `Selection.modify()` é **não-padrão** e seu extent de palavra (espaço final, suporte a granularidades) difere entre motores e "may change in the future" segundo a MDN — use apenas como conveniência, nunca como fonte de correção.
- Métodos caret-from-point têm **offsets documentadamente incorretos dentro de iframes e textareas** (MDN, bugs Mozilla 824965/826069); sempre opere dentro do document próprio do iframe e valide offsets contra o `Intl.Segmenter`.
- O epub.js tem um **bug aberto e não resolvido de seleção no iOS Safari** (#904) e seu evento "selected" depende de eventos disparando corretamente dentro do iframe (#494); reserve tempo de teste em dispositivos.
- A **CSS Custom Highlight API só alcançou suporte em todos os motores em meados de 2025** (Firefox 140); a web.dev observa que "some issues with the ::highlight pseudo-element make it not quite Baseline yet" — navegadores antigos ainda precisam de highlighting baseado em DOM.
- `Intl.Segmenter` é baseado em dicionário/regras e **imperfeito para palavras compostas em CJK**; trate sua saída como um default forte, não como verdade linguística absoluta, e permita expansão manual.
- Números de versão da caniuse.com incluem builds near-future/preview (Safari 26.x, Chrome 150+); trate os números mais altos como "atual + dev".
- Comportamentos internos de Readwise Reader e Kindle não foram verificados de forma independente (não foram localizadas fontes de engenharia públicas); são inferidos da UX observável, enquanto o do LingQ é confirmado pela sua documentação de suporte oficial.