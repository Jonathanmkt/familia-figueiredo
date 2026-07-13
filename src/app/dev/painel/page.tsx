import { notFound } from 'next/navigation';
import { Painel } from './painel';

// Página matriz (exemplo realista de layout). Interna: 404 em produção.
export default function PainelPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Painel />;
}
