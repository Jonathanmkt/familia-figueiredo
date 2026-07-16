/** Ciclo de vida da palavra no banco, derivado do card ligado no Anki. */
export type WordStatus = 'disponivel' | 'estudando' | 'concluida';

/** Intervalo (dias) a partir do qual a palavra é considerada "Concluída" (~8 meses). */
export const CONCLUIDA_DIAS = 240;

/**
 * Deriva o status a partir do card ligado (não destrutivo — o card segue vivo):
 * - sem card → Disponível
 * - card com intervalo < 240d → Estudando
 * - card com intervalo ≥ 240d → Concluída
 */
export function deriveStatus(scheduledDays: number | null | undefined): WordStatus {
  if (scheduledDays == null) return 'disponivel';
  return scheduledDays >= CONCLUIDA_DIAS ? 'concluida' : 'estudando';
}
