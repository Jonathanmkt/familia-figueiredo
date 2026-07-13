import type { Transition, Variants } from 'framer-motion';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * TOKENS DE MOVIMENTO — fonte da verdade das animações (web).
 * Regra de ouro (igual ao design system): o movimento mora AQUI e nos
 * componentes globais, nunca espalhado tela a tela. Requer `framer-motion`.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Durações padrão (segundos). Curtas de propósito — nada lento. */
export const motionDur = {
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const;

/** Easing "saída suave" (easeOutExpo aproximado) — natural pra entradas. */
export const easeOut = [0.16, 1, 0.3, 1] as const;

/** Mola padrão para deslizes/layout (natural, sem overshoot exagerado). */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Mola mais "seca" para micro-feedback (ex.: tap de botão). */
export const springSnap: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
};

/** Feedback de toque para botões/itens clicáveis (whileTap). */
export const tapFeedback = { scale: 0.97 } as const;

/** Entrada de painel de aba: desliza levemente + fade. */
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: 6 },
  show: { opacity: 1, x: 0, transition: { duration: motionDur.base, ease: easeOut } },
};

/** Lista em cascata — aplicar no CONTAINER. */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

/** Item de lista — aplicar em CADA item (filho do container acima). */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: motionDur.base, ease: easeOut } },
};
