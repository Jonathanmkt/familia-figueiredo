// Presets de tema disponíveis. Cada um preenche o MESMO schema de tokens
// (definido em globals.css) com valores diferentes. Trocar de preset = trocar
// `data-theme` no <html>. Para um app novo: adicione um preset aqui + o bloco
// de tokens correspondente no globals.css.
//
// `forceDark`: presets de estética escura (fundo escuro) precisam da classe
// `.dark` no <html> para os `dark:` internos dos componentes shadcn (tabs,
// input, etc.) funcionarem — senão a aba/campo ativo cai no tom claro e fica
// preto sobre o fundo escuro.
export const THEME_PRESETS = [
  { id: 'brasao', label: 'Brasão', hint: 'Azul do brasão + vermelho' },
  { id: 'navy-glass', label: 'Navy Glass', hint: 'Referência Idealis Core (dourado)', forceDark: true },
  { id: 'glass-brasao', label: 'Glass Brasão', hint: 'Vidro navy + vermelho do brasão', forceDark: true },
  { id: 'neutral', label: 'Neutro', hint: 'Base shadcn (do zero)' },
] as const;

export type ThemePresetId = (typeof THEME_PRESETS)[number]['id'];

export const DEFAULT_PRESET: ThemePresetId = 'glass-brasao';

export function presetForcesDark(id: ThemePresetId): boolean {
  return THEME_PRESETS.some((p) => p.id === id && 'forceDark' in p && p.forceDark);
}
