# PDF (texto real) → EPUB leve em JS/TS para Next.js: pesquisa comparativa e recomendação de stack

## TL;DR
- **É viável e recomendado substituir o Calibre por um pipeline 100% client-side** usando **PDF.js (pdfjs-dist) para extrair texto + fflate para zipar o EPUB montado à mão**, com upload do `.epub` pronto para o Supabase Storage — a pegada de runtime cai de centenas de MB/~1 GB (Calibre) para ~1,5–2 MB de JS/worker no navegador.
- Para PDFs de **texto real** (não escaneados) e leitura **reflowável**, a perda de qualidade frente ao Calibre é **aceitável e em parte compensável** com heurísticas simples (parágrafos por espaçamento vertical, junção de hifenização, remoção de cabeçalho/rodapé repetido, títulos por tamanho de fonte); o que se perde de fato é TOC rica, notas de rodapé bem tratadas e multi-coluna — este último deve ser **detectado e tratado ou o PDF rejeitado**.
- Você já tem **PDF.js e fflate no bundle via foliate-js**, então o custo incremental de infra é praticamente **zero**: reaproveite as mesmas dependências que o leitor já carrega.

## Key Findings

1. **Extração de texto:** `pdfjs-dist` (Apache-2.0) é a escolha certa — roda no navegador e no Node, é a mesma engine do foliate-js, e sua API `getTextContent()` devolve, por item de texto, a string, a matriz `transform` (posição x/y), `width`, `height`, `fontName` e `hasEOL` — exatamente os dados necessários para reconstruir parágrafos, ordem de leitura e títulos. É extremamente popular e ativo: **20.993.023 downloads/semana segundo a página do pacote no Snyk (security.snyk.io); a própria página do npm registra 18.120.387/semana (v6.1.200)**.
2. **Alternativas** (`unpdf`, `pdf-parse`, `pdf.js-extract`, `pdf2json`, `mupdf`) são todas, na prática, wrappers de PDF.js (exceto mupdf, que é WASM). Nenhuma é mais leve que usar PDF.js diretamente quando você **já tem PDF.js no bundle**. `mupdf` dá melhor estrutura (blocos/linhas/spans com fonte e bbox) mas carrega um binário WASM grande e é **AGPL**.
3. **Montagem do EPUB:** montar "na mão" (mimetype + container.xml + OPF + nav.xhtml + capítulos XHTML) e zipar com **fflate** é a opção mais leve e 100% client-side. `epub-gen-memory` e `jepub` funcionam no navegador mas puxam **JSZip** (e o jepub também **EJS**), aumentando o bundle sem ganho essencial.
4. **fflate vs JSZip:** fflate é dramaticamente menor e mais rápido; JSZip é maior. Como o foliate-js **já usa fflate**, não há motivo para introduzir JSZip.
5. **Apps nativos minúsculos** (ex.: ePUBator) fazem exatamente esse pipeline mínimo — e são ainda menores do que se imaginava: **o APK do ePUBator v0.12 tem 1,65 MB, segundo a listagem oficial (APKPure/apk.gold; desenvolvedor Ezio Querini, pacote `it.iiizio.epubator`), não ~8 MB**. A descrição oficial do app confirma o quão enxuto é o escopo: *"ePUBator extracts text (no text from pictures or from raster PDF) ... ePUBator doesn't extract the font size and style ... ePUBator works fine only with single column PDF (worse with multi column or tables)"*. Ou seja, o "segredo" do tamanho pequeno é justamente abrir mão do que o Calibre tenta fazer.

## Details

### 1. Bibliotecas de extração de texto de PDF

Todas as bibliotecas JS de "texto real" abaixo derivam do PDF.js, exceto o mupdf (WASM). Isso é central: **o peso vem quase todo do motor PDF.js ou do WASM**, não do wrapper.

| Biblioteca | Browser / Node | Peso / versão | Qualidade de extração | Mantém coordenadas/fonte? | Licença | Manutenção |
|---|---|---|---|---|---|---|
| **pdfjs-dist** (Mozilla) | Ambos | v6.1.200; **Install Size 32,5 MB (npmx.dev, inclui cmaps/fontes/worker)**; runtime relevante = `pdf.min.mjs` + `pdf.worker` (o worker é a maior parte, historicamente >1 MB minificado) | Boa; itens de texto crus, ordem depende do PDF | **Sim** — `transform` (x/y), `width`, `height`, `fontName`, `hasEOL` | Apache-2.0 | Muito ativa (v6.x em 2026); ~21M downloads/semana (Snyk) |
| **unpdf** (unjs) | Ambos + edge/serverless | v1.6.2; empacota build "serverless" do PDF.js (~1,4 MB minificado), zero deps | Igual ao PDF.js (é wrapper); `extractText` simplifica | Via `getDocumentProxy`/`getTextContent` sim | MIT | Ativa |
| **pdf.js-extract** | **Node** (não browser) | v1.0.1; inclui build própria do pdf.js | Boa; utilitários `pageToLines`, colunas por x | **Sim** (x/y/fonte) | MIT | Moderada |
| **pdf-parse** | Ambos (v2 roda no browser) | v2.4.5; instalado ~19,5 MB, deps pdfjs-dist^5 + canvas | Simples (texto direto); v2 também tabelas/imagens | Parcial (foco em texto) | Apache-2.0 | Ativa (v2 em 2025) |
| **pdf2json** | **Node apenas** | v4.0.3; zero deps desde 3.1.6 | Fraca para blocos de texto (quebra no meio de palavras, espaçamento) | Sim, mas com problemas conhecidos | Apache-2.0 | Saudável mas Node-only |
| **mupdf** (Artifex) | Ambos (WASM) | v1.28.0; binário WASM grande (na casa de vários a ~20 MB, não confirmado exato) | **Melhor estrutura**: `toStructuredText` → blocos/linhas/spans com `font{name,weight,style,size}` e `bbox` | **Sim, e melhor** (nome real da fonte, peso, bbox) | **AGPL-3.0** (ou comercial) | Muito ativa (oficial) |

**Aprofundamento em pdfjs-dist / getTextContent():**
- Fluxo: `getDocument({data}).promise` → `pdf.getPage(n)` → `page.getTextContent()` → `content.items[]`. Cada item tem `str`, `dir`, `transform: [a,b,c,d,e,f]` (com `e`=x, `f`=y no sistema do PDF, origem no canto **inferior**-esquerdo, y cresce para cima), `width`, `height`, `fontName` e `hasEOL`.
- **Armadilhas conhecidas:**
  - Em alguns PDFs `getTextContent()` falha em retornar objetos de texto (issue documentada no repositório do PDF.js).
  - Em Node, PDF.js v5+ usa `Promise.withResolvers` (Node 22+); em versões antigas precisa polyfill. No browser isso não é problema.
  - `cMapUrl`/`standardFontDataUrl` precisam ser resolvidos, senão CJK/fontes-padrão saem em branco ou "mojibake".
  - `fontName` é um identificador interno (ex.: `g_d0_f2`), **não** o nome real da fonte; negrito precisa ser inferido (ver abaixo).
  - Ordem dos itens segue o fluxo de conteúdo do PDF, que **não** é garantidamente a ordem de leitura — daí a necessidade de ordenar por y depois x.

### 2. Reconstrução de estrutura sem ML pesado

Técnicas consolidadas (todas implementáveis com as coordenadas do PDF.js):

- **Agrupar itens em linhas:** ordenar por y (com tolerância, ex.: itens dentro de ~5 unidades de y são a mesma linha), depois por x. `pdf.js-extract` inclui `pageToLines(page, 5)` como referência de implementação.
- **Inferir parágrafos:** usar variação de espaçamento vertical entre linhas. Se o gap vertical entre duas linhas for maior que o gap "normal" (entrelinha modal do corpo), é fim de parágrafo; indentação da primeira linha (x inicial maior) também sinaliza novo parágrafo.
- **Distinguir quebra de layout de fim de parágrafo:** uma linha que termina perto da margem direita (largura ~cheia da coluna) e cuja próxima linha começa na margem esquerda é **continuação** — junta-se com espaço. Linha curta seguida de linha recuada/gap maior = fim real de parágrafo. (É exatamente o que o Calibre chama de *line unwrapping*, com o famoso fator ~0,4.)
- **Títulos/headings:** calcular a estatística de `fontSize` (altura/`transform`) — o tamanho mais frequente é o corpo (BASE). Itens com fonte maior que BASE (ou em negrito) viram `<h1>/<h2>`. Como `fontName` do PDF.js é opaco, detectar negrito por (a) heurística no nome quando disponível ("Bold"), (b) comparação de tamanho, ou (c) usar mupdf que expõe `font.weight` diretamente.
- **Junção de hifenização:** se uma linha termina em `-` e a próxima começa com minúscula, remover o hífen e juntar as duas partes; opcionalmente consultar dicionário para preservar hifens legítimos (compostos). A literatura mostra que simplesmente remover o hífen de fim de linha tem impacto mínimo e alto benefício.
- **Cabeçalhos/rodapés repetidos:** não há marcação no PDF; a heurística robusta é **posicional + de repetição** — coletar o texto normalizado nas faixas superior/inferior (ex.: topo/base 5–10% da altura) de todas as páginas e remover os blocos cujo texto se repete em muitas páginas (com tolerância a número de página variável). Publicações acadêmicas descrevem clustering (DBSCAN) de bounding boxes repetidas, mas para o caso "bom o suficiente" basta contar frequência de strings por zona.
- **Multi-coluna:** detectar analisando a distribuição de x dos inícios de linha / lacunas verticais ("valleys") na página. Se houver uma faixa vertical central consistentemente vazia, há 2 colunas → ou (a) processar coluna esquerda inteira e depois a direita, ou (b), no espírito minimalista, **detectar e avisar/rejeitar** (multi-coluna sem tratamento gera texto fora de ordem). Ordenar cegamente por y depois x embaralha colunas.

### 3. Montagem do EPUB em JS/TS

**Estrutura mínima de um EPUB 3 (montagem manual):**
- `mimetype` — conteúdo exato `application/epub+zip`, **sem newline**, **primeiro arquivo do zip e armazenado sem compressão (STORED)**.
- `META-INF/container.xml` — aponta para o OPF (`OEBPS/content.opf`).
- `OEBPS/content.opf` — `<metadata>` (dc:title, dc:creator, dc:identifier, dc:language, `<meta property="dcterms:modified">`), `<manifest>` (lista todos os XHTML/CSS/nav) e `<spine>` (ordem de leitura).
- `OEBPS/nav.xhtml` — TOC do EPUB 3 (`<nav epub:type="toc">`); opcionalmente `toc.ncx` para compatibilidade EPUB 2.
- `OEBPS/chapter-N.xhtml` — capítulos em XHTML bem-formado.
- CSS opcional.

| Abordagem | Browser? | Peso extra | Facilidade | Licença | Observação |
|---|---|---|---|---|---|
| **Manual + fflate** | **Sim** | ~8 kB (core fflate) — e você **já tem fflate** | Média (você escreve os XML) | fflate MIT | Mais leve; controle total de mimetype STORED e nav.xhtml |
| **epub-gen-memory** | Sim | + **JSZip** (~96 kB min / ~27 kB gzip) | Alta (API de capítulos) | MIT | Depende de JSZip; baixa imagens referenciadas |
| **jepub** | Sim | + **JSZip + EJS** | Alta | ISC | Desde v2 não empacota JSZip/EJS; você instala à parte |

**fflate vs JSZip:** conforme o README oficial do fflate (101arrowz/fflate no GitHub): *"weighs 8kB minified for the core build (3kB for decompression only and 5kB for compression only)"* e *"The maximum bundle size that is possible with fflate is about 31kB (11.5kB gzipped) if you use every single feature"*. JSZip tem pacote de ~762 kB instalado (~96 kB min / ~27 kB gzip). fflate roda descompressão/compressão em worker paralelo e é significativamente mais rápido; JSZip bloqueia mais a main thread. Como o foliate-js já usa fflate, **reaproveitar fflate é a escolha óbvia**.

**Detalhe crítico:** com fflate, para o `mimetype` use nível de compressão 0 (STORED) enquanto o resto pode ser DEFLATE — isso mantém o EPUB válido.

### 4. Cliente vs Servidor

- **Pipeline 100% no navegador é viável** e há provas de conceito públicas: sites de conversão PDF→EPUB que rodam inteiramente no browser usam "PDF.js para extrair o fluxo de texto de cada página" e geram o `.epub` localmente, sem upload do PDF. Gerar EPUB no browser (com JSZip/fflate + FileSaver) é padrão documentado.
- **Limites práticos:** PDF.js é conhecido por consumo alto de memória e lentidão em PDFs muito grandes/complexos (relatos de vários minutos e GB em PDFs enormes; documentos de centenas de páginas com imagens pesam). **Para extração de texto puro** (sem renderizar canvas) o custo é muito menor que renderização, mas ainda assim:
  - Use **Web Worker** (o próprio `pdf.worker` já faz o parsing fora da main thread; faça a reconstrução de parágrafos também em worker para não travar a UI).
  - Processe **página a página**, liberando cada página (`page.cleanup()`), sem acumular todas em memória.
  - Para livros de centenas de páginas, mostre progresso e considere um teto de tamanho.
- **Quando manter no servidor (Node):** PDFs muito grandes onde a memória do dispositivo do usuário é um risco; necessidade de processamento em lote/consistência; ou se quiser usar **mupdf** para melhor estrutura sem entregar um WASM grande ao cliente. Mesmo assim, um container Node com `pdfjs-dist` é ordens de magnitude menor que o Calibre.

### 5. Como os apps nativos minúsculos implementam

- ePUBator (open source) e similares: **extraem só texto** (via iText, no caso do ePUBator), montam um EPUB simples e explicitamente **não extraem tamanho/estilo de fonte**, colocam imagens no fim da página, tentam extrair um TOC ou criam um "dummy TOC" (verbatim: *"ePUBator tries to extract the table of contents if present (or creates a dummy TOC)"*), e **funcionam bem só com PDF de coluna única** (ruim com multi-coluna/tabelas). Podem falhar em PDFs raster (escaneados) e em livros muito grandes. E são realmente minúsculos: **o APK do ePUBator v0.12 tem apenas 1,65 MB** (não ~8 MB) — o que reforça que um pipeline "texto + reflow básico + zip" cabe em pouquíssimo espaço.
- O que cabe em poucos MB é justamente o pipeline mínimo "extrair texto + reflow básico + zipar". O que sacrificam: fidelidade de layout, detecção fina de capítulos, tratamento de cabeçalho/rodapé e multi-coluna, estilos.
- **Implicação para você:** seu alvo de qualidade "bom o suficiente para leitura reflowável" é exatamente o que esses apps entregam — e você pode **superá-los** com as heurísticas da seção 2, mantendo pegada minúscula.

### 6. Qualidade esperada vs Calibre (PDF de texto real)

O que o Calibre faz a mais (e que você perde/precisa reimplementar):
- **Line unwrapping / heurísticas** ("Heuristic processing") para juntar linhas quebradas em parágrafos — reimplementável (seção 2), é a diferença de qualidade mais importante.
- **Detecção de estrutura/capítulos e TOC** via XPath/regex — você faz uma versão simples por tamanho de fonte.
- **Remoção de cabeçalho/rodapé e números de página** — o Calibre exige que o usuário configure padrões/regex; sua heurística posicional+frequência pode até ser mais automática.
- **Notas de rodapé, imagens, tabelas** — Calibre tenta, com resultados imperfeitos; PDF→EPUB de tabelas é notoriamente ruim mesmo no Calibre.
- Importante: **até o Calibre produz EPUBs "bagunçados" de PDF** porque PDF é layout fixo e EPUB é reflowável; a comunidade recomenda sempre pós-edição. Ou seja, você não está abandonando uma solução perfeita.

**Veredito:** para o seu caso (leitor foliate-js, prioridade em peso/infra, PDFs de texto real, leitura reflowável), a diferença de qualidade frente ao Calibre é **aceitável**, desde que você implemente as heurísticas de parágrafo + hifenização + header/footer e trate multi-coluna. Você troca um binário de centenas de MB por ~2 MB de JS que você **já carrega**.

## Recommendations

**Stack mínima recomendada (100% client-side):**
- **Extração:** `pdfjs-dist` (que você já tem via foliate-js) usando `getTextContent()`. Não adicione unpdf/pdf-parse/pdf.js-extract — seriam PDF.js duplicado.
- **Montagem:** **manual** (mimetype/container/OPF/nav.xhtml/capítulos) **+ fflate** (que você já tem). Evite epub-gen-memory/jepub para não puxar JSZip/EJS.

**Pipeline passo a passo:**
1. **Guard de entrada (rejeitar escaneado):** carregar o PDF, somar itens de texto de algumas páginas amostrais; se ~0 texto → é imagem/escaneado → **rejeitar com aviso** (sem OCR).
2. **Detecção de multi-coluna:** analisar distribuição de x/valleys por página; se multi-coluna consistente → tratar por coluna **ou** avisar/rejeitar.
3. **Extração por página** (em Web Worker): coletar itens com `str`, x/y (`transform`), `width`, `height`, `fontName`.
4. **Agrupar em linhas** (ordenar y, depois x; tolerância de y).
5. **Reconstruir parágrafos** (gap vertical + indentação) e **desfazer quebras de layout** (unwrap).
6. **Junção de hifenização** (remover `-` final + próxima minúscula).
7. **Remover cabeçalho/rodapé/número de página** (zona superior/inferior + repetição entre páginas).
8. **Inferir títulos** (fontSize > moda do corpo, ou negrito) → `<h1>/<h2>`; usar para o **nav.xhtml/TOC**.
9. **Gerar XHTML** dos capítulos (dividir por heading detectado; escapar entidades XML).
10. **Montar EPUB** (mimetype STORED + container.xml + content.opf + nav.xhtml + capítulos).
11. **Zipar com fflate** (mimetype sem compressão, resto DEFLATE) → `Blob`.
12. **Upload do `.epub`** pronto para o Supabase Storage.

**Benchmarks/limiares que mudariam a decisão:**
- Se muitos PDFs forem **multi-coluna** ou com **tabelas complexas** → considerar processar no servidor com **mupdf** (melhor `toStructuredText`), aceitando o custo AGPL/binário no servidor (não no cliente).
- Se PDFs de **centenas de páginas** travarem/estourarem memória no navegador de usuários típicos → mover a extração para uma **função server-side Node** com `pdfjs-dist` (ainda leve vs Calibre).
- Se precisar de **estrutura/negrito confiável** e o `fontName` opaco do PDF.js atrapalhar muito → mupdf (server-side) resolve com `font.weight`/`size` reais.

## Caveats
- **Números de tamanho de pacote:** as versões (pdfjs-dist v6.1.200, unpdf 1.6.2, pdf-parse 2.4.5, mupdf 1.28.0, jszip 3.10.1, fflate 0.8.2) foram confirmadas em npm; o Install Size de 32,5 MB do pdfjs-dist vem da npmx.dev e os pesos min/gzip do fflate vêm do README oficial do autor. **Os tamanhos min/min+gzip exatos do Bundlephobia não puderam ser verificados** nesta pesquisa e devem ser tratados como aproximados. O tamanho exato do `pdf.worker` e do binário `.wasm` do mupdf **não foi confirmado** (mupdf é sabidamente grande, na casa de vários a ~20 MB).
- **fontName do PDF.js** não é o nome real da fonte; detecção de negrito/itálico por ele é frágil — por isso a inferência por tamanho é mais confiável no PDF.js puro.
- **Heurísticas são heurísticas:** parágrafos, header/footer e títulos terão erros em PDFs atípicos; o próprio Calibre erra nesses casos. Ofereça revisão/edição pós-conversão se a qualidade for crítica.
- **Multi-coluna e tabelas** são o ponto fraco real de qualquer abordagem leve baseada em coordenadas; trate explicitamente ou rejeite.
- **Licenças:** pdfjs-dist Apache-2.0 e fflate MIT são seguras para uso comercial; **mupdf é AGPL** — evite no cliente/em produto fechado sem licença comercial.
- **EPUB válido:** cuidado com `mimetype` (primeiro, STORED, sem newline) e XHTML bem-formado (escape de `&`, `<`, tags fechadas) — erros aqui quebram a validação (EPUBCheck) e podem falhar em alguns leitores, embora o foliate-js seja tolerante.