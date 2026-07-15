/**
 * Utilitários de limites de palavra para o leitor.
 * `Intl.Segmenter` (granularity 'word') é a autoridade de segmentação — ver DR-3.
 */

function segmenter(locale: string) {
  return new Intl.Segmenter(locale, { granularity: 'word' });
}

/** Conta palavras "de verdade" (isWordLike) de um texto. */
export function countWords(text: string, locale: string): number {
  let count = 0;
  for (const seg of segmenter(locale).segment(text)) {
    if (seg.isWordLike) count++;
  }
  return count;
}

/**
 * Range da palavra que contém o offset dentro de um text node.
 * Retorna null se o offset cai fora de uma palavra (espaço/pontuação).
 */
export function wordRangeAt(node: Node, offset: number, locale: string): Range | null {
  if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return null;
  const text = node.textContent;
  const segments = segmenter(locale).segment(text);
  const seg = segments.containing(Math.min(offset, Math.max(text.length - 1, 0)));
  if (!seg || !seg.isWordLike) return null;

  const range = (node.ownerDocument ?? document).createRange();
  range.setStart(node, seg.index);
  range.setEnd(node, seg.index + seg.segment.length);
  return range;
}

/**
 * Ajusta ("snap") os limites de um range para os limites das palavras que os contêm.
 * Usado para normalizar seleções feitas por arrasto/alças nativas.
 */
export function snapRangeToWords(range: Range, locale: string): Range {
  const snapped = range.cloneRange();

  const { startContainer, startOffset, endContainer, endOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE && startContainer.textContent) {
    const segs = segmenter(locale).segment(startContainer.textContent);
    const seg = segs.containing(startOffset);
    if (seg?.isWordLike) snapped.setStart(startContainer, seg.index);
  }
  if (endContainer.nodeType === Node.TEXT_NODE && endContainer.textContent && endOffset > 0) {
    const segs = segmenter(locale).segment(endContainer.textContent);
    const seg = segs.containing(endOffset - 1);
    if (seg?.isWordLike) snapped.setEnd(endContainer, seg.index + seg.segment.length);
  }
  return snapped;
}

/** Posição de texto (node + offset) sob um ponto do viewport de um documento. */
export function caretFromPoint(doc: Document, x: number, y: number): { node: Node; offset: number } | null {
  // Padrão moderno; fallback WebKit/Blink legado. Sempre no document do próprio iframe (DR-3).
  const docWithCaret = doc as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (typeof docWithCaret.caretPositionFromPoint === 'function') {
    const pos = docWithCaret.caretPositionFromPoint(x, y);
    if (pos) return { node: pos.offsetNode, offset: pos.offset };
  }
  if (typeof docWithCaret.caretRangeFromPoint === 'function') {
    const range = docWithCaret.caretRangeFromPoint(x, y);
    if (range) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

/** Elemento de bloco que contém o range — o "parágrafo" do contexto salvo. */
export function paragraphOf(range: Range): string {
  const node = range.startContainer;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const block = el?.closest('p, li, blockquote, dd, dt, figcaption, h1, h2, h3, h4, h5, h6, div, section');
  return (block?.textContent ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}
