// Conversão PDF (texto real) → EPUB, 100% no navegador. Leve: pdfjs (extrai texto) +
// fflate (monta o EPUB), sem Calibre e sem servidor. Ver docs/drs/pdftoedpublight.md.
import { strToU8, zipSync } from 'fflate';

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Line = { text: string; y: number };

async function extractParagraphs(data: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const paragraphs: string[] = [];
  let totalChars = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const raw = content.items as Array<{ str?: string; transform?: number[] }>;
    const items = raw
      .filter((it) => typeof it.str === 'string' && it.str.length > 0 && Array.isArray(it.transform))
      .map((it) => ({ str: it.str as string, x: (it.transform as number[])[4], y: (it.transform as number[])[5] }));
    // ordena por linha (y de cima pra baixo) e depois x (esquerda→direita)
    items.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));

    // agrupa itens em linhas por y
    const lines: Line[] = [];
    let cur = '';
    let curY: number | null = null;
    for (const it of items) {
      if (curY === null || Math.abs(it.y - curY) <= 2) {
        cur += it.str;
        if (curY === null) curY = it.y;
      } else {
        if (cur.trim()) lines.push({ text: cur, y: curY });
        cur = it.str;
        curY = it.y;
      }
    }
    if (cur.trim() && curY !== null) lines.push({ text: cur, y: curY });

    // gap vertical mediano entre linhas (referência de entrelinha do corpo)
    const gaps: number[] = [];
    for (let i = 1; i < lines.length; i++) gaps.push(lines[i - 1].y - lines[i].y);
    const medianGap =
      gaps.length > 0 ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;

    // linhas → parágrafos: junta linhas (unwrap); parágrafo novo quando o gap é grande;
    // junta palavra hifenizada no fim de linha.
    let para = '';
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].text.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      totalChars += text.length;
      if (!para) {
        para = text;
        continue;
      }
      const gap = lines[i - 1].y - lines[i].y;
      const novoParagrafo = medianGap > 0 && gap > medianGap * 1.6;
      if (novoParagrafo) {
        paragraphs.push(para);
        para = text;
      } else if (/[A-Za-z]-$/.test(para)) {
        para = para.slice(0, -1) + text;
      } else {
        para = para + ' ' + text;
      }
    }
    if (para) paragraphs.push(para);
    page.cleanup();
  }

  // Sem texto suficiente = escaneado/imagem → rejeita (não fazemos OCR).
  if (totalChars < 200) {
    throw new Error(
      'Este PDF parece ser escaneado (imagem, sem texto). Por ora aceitamos apenas PDFs de texto real.'
    );
  }
  return paragraphs;
}

/** Converte um PDF de texto real num EPUB (Blob), pronto para upload ao Storage. */
export async function pdfToEpub(file: File, title: string, author: string): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());
  const paragraphs = await extractParagraphs(data);

  const body = paragraphs.map((p) => `<p>${xmlEscape(p)}</p>`).join('\n');
  const uid = 'urn:uuid:' + crypto.randomUUID();
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const contentXhtml =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><title>${xmlEscape(title)}</title></head>` +
    `<body>${body}</body></html>`;

  const nav =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><title>${xmlEscape(title)}</title></head>` +
    `<body><nav epub:type="toc"><ol><li><a href="content.xhtml">${xmlEscape(title)}</a></li></ol></nav></body></html>`;

  const opf =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">` +
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:identifier id="uid">${uid}</dc:identifier>` +
    `<dc:title>${xmlEscape(title)}</dc:title>` +
    `<dc:language>en</dc:language>` +
    (author ? `<dc:creator>${xmlEscape(author)}</dc:creator>` : '') +
    `<meta property="dcterms:modified">${modified}</meta>` +
    `</metadata>` +
    `<manifest>` +
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>` +
    `<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>` +
    `</manifest>` +
    `<spine><itemref idref="content"/></spine>` +
    `</package>`;

  const container =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
    `<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;

  // mimetype sem compressão (STORED) — exigência do EPUB; resto DEFLATE.
  const zipped = zipSync(
    {
      mimetype: [strToU8('application/epub+zip'), { level: 0 }],
      'META-INF/container.xml': strToU8(container),
      'OEBPS/content.opf': strToU8(opf),
      'OEBPS/nav.xhtml': strToU8(nav),
      'OEBPS/content.xhtml': strToU8(contentXhtml),
    },
    { level: 6 }
  );

  return new Blob([zipped as BlobPart], { type: 'application/epub+zip' });
}
