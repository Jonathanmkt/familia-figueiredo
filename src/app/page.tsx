import { redirect } from 'next/navigation';

// A raiz é um roteador: o middleware manda logado → app e deslogado → login.
// Este redirect é só um fallback caso a rota seja alcançada diretamente.
export default function Home() {
  redirect('/protected');
}
