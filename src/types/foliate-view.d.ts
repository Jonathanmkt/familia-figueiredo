/**
 * Tipos mínimos do foliate-js (vendor/foliate-js, submodule fixado).
 * A lib é JS puro e sem tipos oficiais — declaramos apenas a superfície que usamos.
 * Referência: vendor/foliate-js/view.js (classe View / <foliate-view>).
 */

/** Item do sumário (TOC) do livro. */
interface FoliateTocItem {
  label: string;
  href: string;
  subitems?: FoliateTocItem[] | null;
}

/** Detalhe do evento `relocate` — posição atual da leitura. */
interface FoliateRelocateDetail {
  /** CFI da posição atual (âncora estável — é o que persistimos). */
  cfi: string;
  /** Progresso 0–1 no livro inteiro. */
  fraction: number;
  tocItem?: FoliateTocItem | null;
  pageItem?: { label: string } | null;
  range?: Range;
}

/** Detalhe do evento `load` — um capítulo (iframe) carregou. */
interface FoliateLoadDetail {
  /** Document de dentro do iframe do capítulo (same-origin). */
  doc: Document;
  index: number;
}

/** Detalhe do evento `draw-annotation` — como desenhar uma anotação. */
interface FoliateDrawAnnotationDetail {
  draw: (fn: unknown, options?: Record<string, unknown>) => void;
  annotation: FoliateAnnotation;
  doc: Document;
  range: Range;
}

interface FoliateAnnotation {
  /** CFI do trecho anotado. */
  value: string;
  color?: string;
  [key: string]: unknown;
}

/** Metadados do livro (EPUB dc:*). */
interface FoliateBookMetadata {
  title?: string | { [lang: string]: string };
  author?: unknown;
  language?: string | string[];
}

interface FoliateBook {
  metadata?: FoliateBookMetadata;
  toc?: FoliateTocItem[];
  getCover?: () => Promise<Blob | null>;
}

/** Renderer (foliate-paginator). Atributos: flow, gap, margin, max-column-count, max-inline-size, max-block-size. */
interface FoliateRenderer extends HTMLElement {
  getContents(): { doc: Document; index: number; overlayer?: unknown }[];
  setStyles(styles: string | [string, string]): void;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
}

/** O web component `<foliate-view>` (registrado ao importar view.js). */
interface FoliateView extends HTMLElement {
  /** Aceita URL (string), File/Blob ou um book já montado (makeBook). */
  open(book: string | File | Blob | FoliateBook): Promise<void>;
  init(options: { lastLocation?: string | null; showTextStart?: boolean }): Promise<void>;
  close(): void;
  goTo(target: string | number): Promise<unknown>;
  goToFraction(fraction: number): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  goLeft(): Promise<void>;
  goRight(): Promise<void>;
  /** Converte um Range de um capítulo (index) em CFI serializável. */
  getCFI(index: number, range: Range): string;
  addAnnotation(annotation: FoliateAnnotation, remove?: boolean): Promise<unknown>;
  deleteAnnotation(annotation: FoliateAnnotation): Promise<unknown>;
  deselect(): void;
  book: FoliateBook;
  renderer: FoliateRenderer;
  lastLocation?: FoliateRelocateDetail;

  addEventListener(
    type: 'relocate',
    listener: (event: CustomEvent<FoliateRelocateDetail>) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: 'load',
    listener: (event: CustomEvent<FoliateLoadDetail>) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: 'draw-annotation',
    listener: (event: CustomEvent<FoliateDrawAnnotationDetail>) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

/** Import por efeito colateral: registra <foliate-view> no customElements. */
declare module '@vendor/foliate-js/view.js' {
  export {};
}

declare module '@vendor/foliate-js/overlayer.js' {
  /** Desenha SVG sobre o texto (highlights etc.). */
  export class Overlayer {
    static highlight(rects: DOMRect[], options?: Record<string, unknown>): SVGElement;
    static underline(rects: DOMRect[], options?: Record<string, unknown>): SVGElement;
    static squiggly(rects: DOMRect[], options?: Record<string, unknown>): SVGElement;
    hitTest(point: { x: number; y: number }): unknown;
  }
}
