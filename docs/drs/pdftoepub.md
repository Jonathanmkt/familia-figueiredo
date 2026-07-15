# Relatório Técnico: Conversão de PDF→EPUB em Pipeline Node.js/Docker com Foco em Qualidade de Texto

## TL;DR
- **Não existe conversor PDF→EPUB "mágico" de um passo só que preserve qualidade.** A arquitetura vencedora é em fases: extrair estrutura (nativa ou via OCR) → HTML/Markdown limpo → limpeza/pós-processamento → montar EPUB. Para PDFs nativos de texto simples, Calibre `ebook-convert` headless é o MVP; para layouts complexos e acadêmicos, ferramentas de layout com ML (Docling da IBM, Marker) produzem qualidade muito superior; para escaneados, OCR (OCRmyPDF/Tesseract) é obrigatório antes.
- **A qualidade depende brutalmente do tipo de PDF.** PDF nativo digital = bom com quase qualquer ferramenta; multi-coluna/revista = falha na ordem de leitura em ferramentas ingênuas (Calibre básico, pdftotext puro, PyMuPDF sem `sort`); escaneado = precisa de OCR. **Docling (licença MIT) é a melhor ferramenta OSS de licença permissiva**, com 0,882 no OpenDataLoader Benchmark — 3º lugar geral, atrás do próprio `opendataloader` híbrido (0,907) e do `nutrient` (0,885), mas o mais recomendável para produção livre de restrições comerciais.
- **Self-hosted vence em custo e privacidade para volume; APIs pagas (CloudConvert, Zamzar, ConvertAPI) só compensam para baixo volume/prototipagem.** Adobe PDF Services tem qualidade alta mas mínimo confirmado de US$25.000/ano — inviável para pequeno porte.

## Key Findings

### 1. Ferramentas open-source self-hospedáveis

**Calibre (`ebook-convert`)** — O cavalo de batalha. CLI headless (`ebook-convert entrada.pdf saida.epub`), licença GPL v3. Funciona bem para PDFs nativos de texto simples e reflowable; sofre com PDFs complexos (multi-coluna, layout crítico). A documentação oficial admite: "calibre's conversion system is not a substitute for a full blown e-book editor". Roda em Docker via imagem `linuxserver/calibre` ou mods `linuxserver/mods:universal-calibre` que expõem `/usr/bin/ebook-convert`. Tem opções de "Heuristic Processing" (desabilitado por padrão) para desembrulhar linhas, remover cabeçalhos/rodapés via regex, e o engine PDF próprio tem remoção automática de header/footer (`--pdf-engine calibre`, opções `--pdf-header-skip`/`--pdf-footer-skip` em pixels, `--unwrap-lines`). Limitação conhecida documentada: números de linha em camadas ocultas e rodapés aparecem no meio do texto convertido, tornando o e-book ilegível sem search-and-replace.

**Pandoc** — NÃO lê PDF como formato de entrada de forma útil. O Pandoc é excelente para Markdown/HTML/DOCX → EPUB (tem writer EPUB2/EPUB3 nativo, renderiza matemática em MathML), mas não tem leitor de PDF. Para usar Pandoc num pipeline de PDF é preciso uma etapa intermediária (PDF→HTML/Markdown via outra ferramenta) e então Pandoc monta o EPUB. Licença GPL v2+.

**Sigil** — É um **editor** de EPUB (WYSIWYG + código), NÃO um conversor automático. Não serve para pipeline backend automatizado: exige interação humana. Papel real: correção manual/QA de EPUBs já gerados. Fora do escopo de automação.

**Ferramentas modernas de layout (ML):**
- **Docling (IBM Research, licença MIT)** — Recomendação principal para qualidade OSS permissiva. Faz "advanced PDF understanding incl. page layout, reading order, table structure, code, formulas". Usa modelos DocLayNet (layout) + TableFormer (tabelas). Exporta Markdown/HTML/JSON. Roda 100% local; requer PyTorch (~1 GB); ~0,49 s/página em GPU, ~3,1 s/página em CPU. Pontuação de 0,882 no OpenDataLoader Benchmark (3º geral; melhor entre os OSS de licença permissiva). Suporta PDF, DOCX, PPTX, XLSX, HTML, EPUB, imagens. Tem operador Kubernetes e integrações LangChain/LlamaIndex. Modelo companion Granite-Docling-258M (Apache 2.0) é um VLM compacto para conversão end-to-end.
- **Marker (datalab-to, código GPL-3.0)** — Converte PDF→Markdown/JSON/HTML rápido e com alta precisão; usa Surya OCR. Flag opcional `--use_llm` melhora precisão em layouts difíceis. ATENÇÃO à licença: código GPL-3.0 e pesos sob OpenRAIL-M modificado (grátis abaixo de US$2M receita/funding; acima precisa licença comercial da Datalab). O README oficial afirma: "Marker is significantly faster when running in batch mode, with a projected throughput of 25 pages/second on an H100", com throughput teórico máximo de 122 páginas/s usando 22 processos paralelos.
- **MinerU (AGPL-3.0)** — Forte em CJK/científico, com reconhecimento de tabelas via HTML. Fontes secundárias divergem sobre velocidade (uma cita 0,21 s/página em GPU, mas o OpenDataLoader Benchmark independente mede o pipeline completo do MinerU em ~5,96 s/página); em qualquer caso, a licença AGPL restringe uso comercial e não roda em macOS.
- **PyMuPDF / `pymupdf4llm` (AGPL-3.0 ou licença comercial Artifex)** — Extração de texto nativa mais rápida. A Artifex afirma: "about three times faster than pdftotext (component of XPDF, the base library of Poppler) and 30 to 45 times (!) faster than popular pure Python packages like pdfminer or PyPDF2." `page.get_text(sort=True)` reordena top-left→bottom-right. `pymupdf4llm` extrai Markdown pronto para LLM. Não tem OCR embutido (retorna string vazia em escaneados). CUIDADO com AGPL em produto fechado/SaaS.
- **poppler-utils (`pdftotext`, `pdftohtml`) (GPL)** — Base clássica Linux. `pdftotext -layout` preserva layout; extração ingênua não garante ordem de leitura em multi-coluna.
- **pdf2htmlEX (GPL)** — Converte PDF→HTML preservando layout visual fielmente (fixed-layout), o que é ruim para EPUB reflowable.
- **GROBID (Apache 2.0)** — Especializado em PDFs acadêmicos/científicos → XML/TEI estruturado. Extrai título, autores, afiliações, seções, referências (F1 ~0,87 em PubMed Central, ~0,90 em bioRxiv). Docker: `docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.2`. Cliente Python/Node.js para batch paralelo; o cliente pode converter TEI→Markdown/JSON. Usado em produção por ResearchGate, Semantic Scholar, Internet Archive. Ótimo quando o corpus é papers.
- **ebooklib (Python) / epub-gen (Node.js) / @lesjoursfr/html-to-epub (Node.js)** — Bibliotecas de montagem de EPUB a partir de HTML (ver seção pipeline).

### 2. APIs/serviços gerenciados pagos

**CloudConvert** — Modelo de créditos por minuto de conversão. Assinatura a partir de US$8/mês por 1.000 minutos (US$0,0080/min); pacotes pay-as-you-go a US$0,016/min (500 min por US$8). Grátis: 10–25 conversões/dia. Cada conversão custa no mínimo 1 crédito; PDF→Office custa 4 min base. Tamanho de arquivo ilimitado, conversões concorrentes ilimitadas, ISO 27001, exclui arquivos após processamento. API REST com job builder; SDK Node.js.

**Zamzar** — API dedicada a conversão desde 2006, suporta PDF→EPUB nativamente (`target_format: 'epub'`), SDK Node.js oficial. Modelo de créditos: planos ~US$25/mês (500 créditos, US$0,05/crédito), US$99/mês (2.500), US$299/mês (10.000). Primeiros 50 MB inclusos; a cada 50 MB adicionais o custo em créditos aumenta. Créditos não acumulam. Uptime >99,99%. Falhas de conversão são reembolsadas automaticamente.

**ConvertAPI** — Preço por conversão. Planos mensais: Developer 1.000 conversões, Startup 5.000, Growth 15.000, Business 50.000. Anual dá desconto de 20% (Developer 12.000/ano, Business 600.000/ano, etc.). 250 conversões grátis no signup. SLA 99,95%, ISO 27001/HIPAA/GDPR, SDK Node.js, arquivos deletados após processar, tamanho de arquivo de 200 MB a 1–2 GB conforme plano. Bom para PDF→texto/PDF→formatos estruturados em produção.

**Adobe PDF Services API** — Qualidade alta (PDF Extract, PDF→Markdown com Sensei AI). Free tier de 500 Document Transactions/mês (Extract e PDF→Markdown: 1 transação por até 5 páginas; demais operações 1 por até 50 páginas). SDK Node.js oficial. PROBLEMA: preço pago é opaco e caro. A comunidade oficial da Adobe confirma: "We eventually heard back from Adobe that the minimum cost was $25k per year, so it was far too expensive"; outro usuário reporta "The minimum threshold is 500.000 document transaction per year. 5 cents per call, which is 25.000 per year"; um terceiro cita "$55,000 or more per year... We need ETLA contract." Inviável para pequeno/médio porte; o time de vendas frequentemente não responde.

**Mathpix Convert API** — Especializado em matemática/científico, pay-as-you-go por página de PDF, US$29 de crédito de teste inicial. Bom para STEM.

**PSPDFKit/Nutrient (DWS Processor API)** — API comercial com OCR embutido, preço por crédito/volume, 50 créditos grátis/mês. Alternativa a self-hosted quando a licença AGPL do PyMuPDF é bloqueante.

Nota geral: para conversão PDF→EPUB pura, a maioria dos serviços genéricos usa engines equivalentes a Calibre/LibreOffice internamente — a qualidade em layout complexo NÃO é superior ao self-hosted com Docling/Marker. As APIs vencem em conveniência/escala, não em qualidade de fluxo de leitura.

### 3. Diferença de resultado por tipo de PDF

- **PDF nativo/reflowable (Word/LaTeX exportado):** Texto embutido com CMAP correto. Quase todas as ferramentas funcionam. Calibre, PyMuPDF, pdftotext produzem bom resultado. Docling/Marker são overkill mas dão a melhor estrutura (headings, TOC).
- **PDF multi-coluna/revista/complexo:** Extração ingênua (pdftotext sem `-layout`, PyMuPDF sem `sort`, Calibre básico) MISTURA colunas e produz ordem de leitura errada. A própria doc do PyMuPDF confirma que extração "naive" segue a ordem em que o criador escreveu na página — podendo escrever toda a coluna esquerda e depois a direita, ou pior, começar pela direita numa transição de página. AQUI ferramentas de layout com ML (Docling, Marker, MinerU) são necessárias porque detectam blocos e ordem de leitura.
- **PDF escaneado/imagem:** SEM texto embutido. Qualquer extrator de texto retorna vazio. OCR OBRIGATÓRIO antes (OCRmyPDF/Tesseract, PaddleOCR, ou VLM). Docling e Marker têm OCR integrado (Tesseract/EasyOCR/RapidOCR e Surya, respectivamente).

### 4. Papel do OCR

- **Tesseract OCR 5.x (Apache 2.0):** Engine LSTM, ~100+ idiomas (116 na contagem ampla, 37 scripts). Estudo peer-reviewed de Nazeem, Anitha R, Navaneeth S & Rajeev R.R. (2024, "Open-Source OCR Libraries: A Comprehensive Study for Low Resource Language", ICON/ACL Anthology) mede o Tesseract "achieving accuracy rates of 92% in English, 93% in Hindi, 78% in Tamil, 74% in Arabic, and 93% in Malayalam." ~0,77 s/página em CPU, binário ~10 MB. Fraquezas: não lida com estrutura/tabelas/ordem de leitura sem pré-processamento; degrada muito em scans ruins, skew, ruído e handwriting (~90% teto).
- **OCRmyPDF (MPL-2.0):** Adiciona camada de texto OCR a PDFs escaneados gerando PDF/A pesquisável; envolve o Tesseract. Coloca o texto sob a imagem preservando resolução. Docker `jbarlow83/ocrmypdf`. A imagem inclui inglês, alemão, chinês simplificado, francês, português e espanhol por padrão. Flags úteis: `--deskew`, `--rotate-pages`, `--clean`, `--redo-ocr`, `-l por+eng`. É o ponto de entrada ideal de OCR num pipeline. Herda o tempo do Tesseract (~<1 s/página CPU) + overhead do Ghostscript.
- **PaddleOCR (Apache 2.0), PP-OCRv5:** +13% de acurácia vs versão anterior, melhor em multilíngue, 100+ idiomas. GPU opcional (mais rápido, mas roda em CPU ~1–1,5 s/página). Módulo PP-StructureV3 faz layout + tabelas + ordem de leitura nativamente — vantagem sobre Tesseract puro. Integra ao OCRmyPDF via plugin.
- **OCR por VLM/LLM (2025-2026):** Mistral OCR API (~US$1 por 1.000 páginas na versão original de mar/2025; OCR 4 de jun/2026 é US$4 padrão / US$2 batch), Gemini 2.5 Pro/Flash, GPT-4o. A Mistral reportou "94.89% overall accuracy" em benchmarks internos no lançamento, "outperforming Google Document AI (83.4%) and Azure OCR (89.5%)" — números que a própria empresa qualifica como "directional rather than definitive". Tradeoffs: risco de alucinação (inventar texto ausente — grave para fidelidade verbatim), custo, dependência de nuvem. Para EPUB de leitura, alucinação é perigosa; usar com cautela e validação.
- **Surya OCR (usado pelo Marker):** VLM, 90+ (91) idiomas; código Apache 2.0 mas pesos com OpenRAIL-M modificado (limite US$5M receita; versões antigas eram GPL-3.0). Supera Tesseract, com CER 30–50% menor em layouts complexos.

### 5. Estratégias de pipeline

**Arquitetura recomendada:** `PDF → (detecção de tipo) → [OCR se escaneado] → extração estruturada (HTML/Markdown com ordem de leitura correta) → limpeza/pós-processamento → montagem EPUB → validação (epubcheck)`.

**Orquestração Node.js:**
- **BullMQ + Redis** para filas de jobs. Conversão é CPU-intensiva e longa — NÃO rodar no event loop principal. Workers em processos/containers separados. BullMQ suporta processadores "sandboxed" (child process), concorrência configurável, retries com backoff, e Flows (DAG de jobs pai-filho) — ideal para pipeline multi-etapa (extrair → limpar → montar). Escala horizontal via múltiplos workers coordenados por Redis.
- **child_process/`fork`** para invocar binários (`ebook-convert`, `ocrmypdf`, docling CLI, grobid client) ou pools de workers.
- **Docker:** multi-stage build, usuário não-root, `HEALTHCHECK`, tratar SIGTERM para shutdown gracioso (Docker envia SIGTERM antes de SIGKILL). docker-compose com serviço Redis + serviço worker; usar restart policies e resource limits.

**Bibliotecas de apoio:**
- **Limpeza HTML:** Mozilla Readability (`@mozilla/readability`) + jsdom para extrair só o conteúdo principal removendo cabeçalhos/rodapés/nav; cheerio para manipulação de DOM por seletores; `isProbablyReaderable` para checar se vale processar.
- **Montagem EPUB (Node):** `epub-gen` (clássico, gera EPUB de array de capítulos HTML), `@lesjoursfr/html-to-epub` (fork mantido, EPUB2/3, CSS/fontes custom), `epub-gen-memory` (retorna buffer/blob, sem escrever em disco — bom para serverless). Cada capítulo = `{title, data: '<html>'}`.
- **Python (se worker Python):** ebooklib para EPUB, BeautifulSoup para limpeza, `dehyphen` para dehifenização.

### 6. Riscos de qualidade e mitigação

- **Hifenização quebrada ("infor-\nmação"):** Reunir palavras divididas. Mitigação: Calibre `--unwrap-lines` + análise por dicionário (o próprio documento como dicionário); biblioteca Python `dehyphen` (usa modelos de linguagem char-level Flair, pontua perplexidade para decidir se junta e remove hífen); regex de pós-processamento (cuidado com falsos positivos em nomes/composições como "bem-vindo", "auto-replicação", "VGG-19").
- **Quebras de linha artificiais no meio de frases:** Calibre "Heuristic Processing" → "Unwrap lines" (fator de desembrulho 0,4 padrão, reduzir para 0,1 se poucas linhas). Detecta hard breaks por pistas de pontuação e comprimento de linha.
- **Cabeçalhos/rodapés/numeração inseridos no meio do texto:** Engine PDF do Calibre com remoção automática (`--pdf-header-skip`/`--pdf-footer-skip` em pixels, negativo = auto-detectar). Regex de header/footer (`--search-replace`). Docling marca `content_layer` (body vs header/footer bands) — permite filtrar programaticamente. Readability remove esses elementos no nível HTML.
- **Notas de rodapé misturadas ao texto:** Ferramentas de layout ML (Docling, Marker) classificam blocos como `Footnote`/`PageFooter` separadamente — permite reposicionar ou remover. Extração ingênua não distingue.
- **Colunas fundidas incorretamente:** Usar `sort=True` do PyMuPDF (top-left→bottom-right) resolve casos simples; para robustez usar detecção de layout (Docling/Marker/MinerU) que identifica colunas e ordem. Extração por retângulos (dividir a página em metades e extrair separadamente) é workaround manual documentado do PyMuPDF.

## Details

### Tabela comparativa

| Ferramenta/Serviço | Tipo/Licença | Qualidade texto nativo | Qualidade PDF escaneado | Suporte OCR | Facilidade Docker | Custo | Adequação produção |
|---|---|---|---|---|---|---|---|
| Calibre `ebook-convert` | OSS / GPL v3 | Boa (simples), fraca (complexo) | Nula (sem OCR) | Não | Alta (imagens prontas) | Grátis | Alta p/ nativos simples |
| Pandoc | OSS / GPL v2+ | N/A (não lê PDF) | N/A | Não | Alta | Grátis | Só como montador EPUB de HTML/MD |
| Sigil | OSS / GPL v3 | N/A (editor manual) | N/A | Não | N/A (GUI) | Grátis | Nenhuma (não automatizável) |
| Docling (IBM) | OSS / MIT | Excelente (0,882 benchmark) | Boa (OCR integrado) | Sim (Tesseract/EasyOCR/RapidOCR) | Média (PyTorch ~1GB) | Grátis | **Alta — recomendado** |
| Marker | OSS / GPL-3.0 + OpenRAIL-M pesos | Excelente | Boa (Surya) | Sim (Surya) | Média (GPU ideal) | Grátis <US$2M receita | Alta (atenção licença) |
| MinerU | OSS / AGPL-3.0 | Excelente | Boa | Sim (PaddleOCR) | Média (GPU) | Grátis (AGPL) | Restrita (AGPL) |
| PyMuPDF/pymupdf4llm | OSS / AGPL-3.0 ou comercial | Muito boa (a mais rápida) | Nula (sem OCR) | Não | Alta | Grátis/comercial | Alta (atenção AGPL) |
| poppler (pdftotext) | OSS / GPL | Boa (`-layout`) | Nula | Não | Alta | Grátis | Média (etapa de extração) |
| GROBID | OSS / Apache 2.0 | Excelente (acadêmico) | Limitada | Não (usa texto nativo) | Alta (imagem oficial) | Grátis | Alta p/ papers |
| OCRmyPDF | OSS / MPL-2.0 | N/A (adiciona OCR) | Boa (via Tesseract) | Sim (Tesseract) | Alta (`jbarlow83/ocrmypdf`) | Grátis | **Alta — etapa OCR** |
| Tesseract | OSS / Apache 2.0 | ~92% inglês limpo | Média-boa | É o OCR | Alta | Grátis | Alta (via OCRmyPDF) |
| PaddleOCR | OSS / Apache 2.0 | +13% vs Tesseract | Boa (melhor que Tesseract) | É o OCR | Média (GPU opcional) | Grátis | Alta |
| CloudConvert | SaaS API | Média (engines genéricos) | Depende (OCR opcional) | Parcial | N/A (nuvem) | ~US$0,008-0,016/min | Média (baixo volume) |
| Zamzar | SaaS API | Média | Depende | Sim (OCR) | N/A | ~US$0,05/crédito, US$25-299/mês | Média |
| ConvertAPI | SaaS API | Média | Depende | Sim | N/A | Por conversão, 250 grátis | Média-alta |
| Adobe PDF Services | SaaS API | Alta | Alta | Sim (Sensei) | N/A | Free 500/mês; ~US$25k/ano pago | Baixa (custo proibitivo) |
| Mistral OCR | SaaS API (VLM) | Alta | Alta (~94,89% claim) | É OCR VLM | N/A / self-host | ~US$1-4/1.000 páginas | Média (risco alucinação) |

### Recomendação de pipeline completo para produção (Docker/Node.js)

**Arquitetura em três containers + Redis:**
1. **API container (Node.js/Express):** recebe upload do PDF, salva em storage (S3/volume), enfileira job no BullMQ, responde 202 rápido.
2. **Redis:** backend de fila.
3. **Worker container(s):** processa o pipeline. Pode ser Node.js orquestrando binários via child_process, OU um container Python (Docling) exposto como microserviço chamado pelo worker Node.

**Fluxo com trade-offs explícitos:**
- **Etapa 0 — Detecção de tipo:** usar PyMuPDF/`pdffonts`/`pdftotext` para checar se há texto embutido. Sem texto → rota OCR.
- **Etapa 1 (escaneado) — OCR:** OCRmyPDF (`--deskew --rotate-pages --clean -l por+eng`) gera PDF/A com camada de texto. Trade-off: qualidade vs tempo (~1s/página CPU).
- **Etapa 2 — Extração estruturada:**
  - Qualidade máxima + licença permissiva → **Docling** (MIT) exportando Markdown/HTML com ordem de leitura e estrutura.
  - Corpus acadêmico → **GROBID** → TEI → Markdown.
  - Simples/rápido/CPU → **pymupdf4llm** (atenção AGPL) ou `pdftotext -layout`.
- **Etapa 3 — Limpeza:** dehifenização (`dehyphen`), remoção de header/footer residual, unwrap de linhas, normalização de whitespace/Unicode; se HTML, Readability + cheerio.
- **Etapa 4 — Montagem EPUB:** dividir em capítulos (por heading), gerar via `@lesjoursfr/html-to-epub` (ou Pandoc Markdown→EPUB), aplicar CSS de leitura, metadados, cover.
- **Etapa 5 — Validação:** epubcheck; testar em leitor real.

**Trade-offs qualidade × complexidade × custo:**
- **Máxima qualidade:** Docling + OCRmyPDF + limpeza custom + Pandoc. Complexidade alta (Python+Node, PyTorch, GPU útil), custo de infra maior, licenças permissivas (MIT/MPL/GPL).
- **Equilíbrio:** OCRmyPDF (quando necessário) + pymupdf4llm/pdftotext + limpeza + html-to-epub. Complexidade média, CPU-only viável, atenção AGPL do PyMuPDF (usar pdftotext se produto fechado).
- **Menor esforço:** Calibre ebook-convert direto (só nativos simples) OU API paga (Zamzar/ConvertAPI) para volume baixo. Custo por conversão, sem infra de ML.

### Caminho Mínimo Viável (MVP)

Comece com dois containers e cubra a maioria dos casos:

**Dockerfile (worker) baseado em imagem com Calibre + OCRmyPDF:**
```dockerfile
FROM node:22-bookworm
RUN apt-get update && apt-get install -y \
    calibre ocrmypdf tesseract-ocr-por tesseract-ocr-eng poppler-utils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "worker.js"]
```

**Lógica do worker (pseudo-Node):**
```js
import { Worker } from 'bullmq';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

new Worker('pdf2epub', async (job) => {
  const { input, output } = job.data;
  // 1. Detectar se é escaneado (pdftotext vazio => sem texto embutido)
  const { stdout } = await run('pdftotext', [input, '-']);
  let src = input;
  if (stdout.trim().length < 100) {
    // 2. Escaneado → OCR
    src = input.replace('.pdf', '.ocr.pdf');
    await run('ocrmypdf', ['--deskew','--rotate-pages','-l','por+eng', input, src]);
  }
  // 3. Converter com Calibre + heurísticas + remoção header/footer
  await run('ebook-convert', [src, output,
    '--enable-heuristics',
    '--unwrap-lines',
    '--pdf-engine','calibre']);
  return { output };
}, { connection: { host: 'redis', port: 6379 }, concurrency: 2 });
```

**Comando manual equivalente (teste rápido):**
```bash
# PDF nativo simples
ebook-convert livro.pdf livro.epub --enable-heuristics --unwrap-lines

# PDF escaneado: OCR primeiro
docker run --rm -v "$PWD:/data" jbarlow83/ocrmypdf --deskew --rotate-pages -l por livro.pdf livro.ocr.pdf
ebook-convert livro.ocr.pdf livro.epub --enable-heuristics
```

Quando o MVP saturar em qualidade (layouts complexos, revistas), adicione um container Docling (Python) como microserviço para a etapa de extração estruturada, mantendo o resto do pipeline.

## Recommendations

1. **Comece pelo MVP Calibre+OCRmyPDF** (acima) para validar o fluxo end-to-end e cobrir PDFs nativos simples e escaneados. Benchmark de gatilho: se >20% dos seus PDFs saem com ordem de leitura errada ou lixo de layout, avance para a fase 2.
2. **Fase 2 — Adicione Docling** (MIT, sem GPU obrigatório mas recomendado) como serviço de extração para PDFs complexos/multi-coluna. Gatilho para adotar: presença significativa de multi-coluna, tabelas, ou necessidade de TOC/estrutura fiel.
3. **Para corpus acadêmico**, use GROBID em vez de/além de Docling.
4. **Cuidado com licenças em produto fechado/SaaS:** evite PyMuPDF/MinerU (AGPL) e pesos do Marker/Surya acima do limite de receita sem licença comercial. Prefira Docling (MIT), OCRmyPDF (MPL), Calibre/GROBID/poppler.
5. **Só use API paga** (ConvertAPI ou Zamzar) se volume for baixo (poucos milhares/mês) e você quiser zero infra. NÃO use Adobe PDF Services salvo se já for cliente enterprise — o mínimo confirmado de ~US$25k/ano é proibitivo.
6. **Evite OCR por LLM/VLM para texto de leitura** salvo com validação, devido ao risco de alucinação (inventar texto). Se usar, prefira Mistral OCR (self-host disponível) e valide amostras.
7. **Sempre valide com epubcheck** e reserve um passo opcional de QA humano no Sigil para títulos de alto valor.
8. **Arquitete com BullMQ + workers separados desde o início** — conversão bloqueia o event loop e pode levar minutos.

## Caveats

- **Preços mudam.** Valores de CloudConvert, Zamzar, ConvertAPI e Adobe são de 2025-2026 e devem ser confirmados nas páginas oficiais antes de decisão comercial. O "mínimo de US$25k/ano" da Adobe vem de relatos confirmados de múltiplos usuários na comunidade oficial Adobe, não de tabela pública oficial (a Adobe não publica preço enterprise).
- **Benchmarks de acurácia de OCR e de conversão** (92% Tesseract, 0,882 Docling, 94,89% Mistral) vêm de estudos/fornecedores específicos e variam brutalmente por tipo de documento; a Mistral chama seus próprios números de "directional rather than definitive". No OpenDataLoader Benchmark o Docling é 3º (0,882), atrás de `opendataloader` (0,907) e `nutrient` (0,885). Faça seus próprios testes com seu corpus real.
- **Métricas de velocidade divergem entre fontes** (ex.: MinerU citado em 0,21 s/página por uma fonte, mas ~5,96 s/página no OpenDataLoader Benchmark para o pipeline completo). Meça no seu hardware.
- **Licenças de modelos ML são nuançadas** e mudam entre versões (Surya migrou de GPL para Apache no código mas manteve OpenRAIL-M com limite de US$5M de receita nos pesos; Marker é GPL-3.0 + OpenRAIL-M com limite de US$2M). Verifique a versão exata antes de uso comercial.
- **Qualidade final depende do PDF de origem** mais que da ferramenta. PDF é formato de apresentação, não de origem ideal — quando possível, obtenha o DOCX/fonte original.
- Não existe solução única que resolva todos os tipos de PDF perfeitamente; pipelines em produção usam roteamento por tipo de documento e fallback em cascata.