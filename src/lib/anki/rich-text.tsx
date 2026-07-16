import { Fragment } from 'react';

/** Remove as marcações `**...**` — para TTS e comparações de texto puro. */
export function stripMarks(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/**
 * Renderiza texto com trechos `**assim**` em negrito. Usado nos cards gerados
 * pela IA (a palavra-alvo vem marcada); cards normais (sem marcação) saem iguais.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\*\*([^*]+)\*\*$/);
        return m ? (
          <strong key={i} className="font-bold">
            {m[1]}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}
