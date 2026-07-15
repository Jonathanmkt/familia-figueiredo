/**
 * Rotas "imersivas" (foco total): o leitor e a sessão de estudo do Anki.
 * No mobile elas escondem a bottom bar para maximizar a área útil — cada uma
 * tem a própria navegação de voltar.
 */
export function isImmersiveRoute(pathname: string): boolean {
  return /^\/leitor\/[^/]+/.test(pathname) || /^\/anki\/[^/]+\/estudar/.test(pathname);
}
