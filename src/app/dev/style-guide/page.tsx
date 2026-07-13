import { notFound } from 'next/navigation';
import { StyleGuide } from './style-guide';

// Página interna de referência (laboratório de tokens/componentes).
// Fica fora de produção: em build de prod vira 404.
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <StyleGuide />;
}
