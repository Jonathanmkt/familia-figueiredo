// Presets de tema disponíveis. Cada um preenche o MESMO schema de tokens
// (definido em globals.css) com valores diferentes. Trocar de preset = trocar
// `data-theme` no <html>. Para um app novo: adicione um preset aqui + o bloco
// de tokens correspondente no globals.css.
export const THEME_PRESETS = [
  { id: 'brasao', label: 'Brasão', hint: 'Azul do brasão + vermelho' },
  { id: 'navy-glass', label: 'Navy Glass', hint: 'Referência Idealis Core (dourado)' },
  { id: 'glass-brasao', label: 'Glass Brasão', hint: 'Vidro navy + vermelho do brasão' },
  { id: 'neutral', label: 'Neutro', hint: 'Base shadcn (do zero)' },
] as const;

export type ThemePresetId = (typeof THEME_PRESETS)[number]['id'];

export const DEFAULT_PRESET: ThemePresetId = 'brasao';
