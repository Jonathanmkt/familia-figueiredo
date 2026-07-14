import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card } from 'ts-fsrs';

import type { Database } from '@/lib/database.types';

export { Rating, State };

/** As 4 notas que o usuário pode dar numa revisão (exclui `Rating.Manual`, não usada aqui). */
export type ActiveRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

export type CardRow = Database['anki']['Tables']['cards']['Row'];
export type CardInsert = Database['anki']['Tables']['cards']['Insert'];
export type ReviewLogInsert = Database['anki']['Tables']['review_log']['Insert'];

// Instância única com os parâmetros padrão do FSRS (ts-fsrs, MIT — reimplementação
// independente do algoritmo publicado; não é código do Anki).
// enable_fuzz: false — determinístico de propósito: `previewRatings` roda no client
// (inclusive durante o SSR do Client Component), e fuzz usa Math.random() internamente,
// o que causaria mismatch de hidratação entre servidor e cliente.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

/** Campos FSRS de um cartão novo (usar ao inserir uma linha em anki.cards). */
export function newCardFsrsFields() {
  const c = createEmptyCard();
  return {
    state: c.state,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learning_steps,
    last_review: null,
  } satisfies Partial<CardInsert>;
}

/** Converte a linha do banco (strings/ISO) para o `Card` do ts-fsrs (Dates). */
function rowToFsrsCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    learning_steps: row.learning_steps,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/**
 * Prévia das 4 notas possíveis (Again/Hard/Good/Easy) para o cartão agora —
 * usa para rotular os botões da sessão de estudo com o próximo intervalo.
 */
export function previewRatings(row: CardRow, now: Date = new Date()) {
  const card = rowToFsrsCard(row);
  const record = scheduler.repeat(card, now);
  return {
    [Rating.Again]: record[Rating.Again].card,
    [Rating.Hard]: record[Rating.Hard].card,
    [Rating.Good]: record[Rating.Good].card,
    [Rating.Easy]: record[Rating.Easy].card,
  } as Record<ActiveRating, Card>;
}

/**
 * Aplica uma revisão: retorna o UPDATE do cartão + o INSERT do review_log,
 * prontos para persistir via Supabase.
 */
export function applyReview(row: CardRow, rating: ActiveRating, now: Date = new Date()) {
  const card = rowToFsrsCard(row);
  const { card: nextCard, log } = scheduler.next(card, now, rating);

  const cardUpdate = {
    state: nextCard.state,
    due: nextCard.due.toISOString(),
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsed_days: nextCard.elapsed_days,
    scheduled_days: nextCard.scheduled_days,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    learning_steps: nextCard.learning_steps,
    last_review: nextCard.last_review ? nextCard.last_review.toISOString() : now.toISOString(),
  } satisfies Partial<CardInsert>;

  const logInsert = {
    card_id: row.id,
    rating: log.rating,
    state: log.state,
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsed_days: log.elapsed_days,
    scheduled_days: log.scheduled_days,
  } satisfies Omit<ReviewLogInsert, 'reviewed_at' | 'id' | 'owner_id'>;

  return { cardUpdate, logInsert };
}
