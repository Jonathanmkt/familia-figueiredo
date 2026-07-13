'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { THEME_PRESETS, DEFAULT_PRESET, type ThemePresetId } from '@/lib/theme';

/**
 * Barra de controle do tema (só páginas /dev): troca de preset + claro/escuro.
 * Escreve `data-theme` e a classe `.dark` no <html> — o CSS (globals.css) faz o resto.
 */
export function ThemeControls() {
  const [preset, setPreset] = useState<ThemePresetId>(DEFAULT_PRESET);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = preset;
  }, [preset]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="surface-glass flex flex-wrap items-center gap-2 rounded-full px-2 py-1.5">
      <span className="px-2 text-xs font-medium text-muted-foreground">Preset:</span>
      {THEME_PRESETS.map((p) => (
        <Button
          key={p.id}
          variant={preset === p.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setPreset(p.id)}
          title={p.hint}
        >
          {p.label}
        </Button>
      ))}
      <div className="mx-1 h-5 w-px bg-border" />
      <Button variant="outline" size="icon-sm" onClick={() => setDark((d) => !d)} title="Claro/Escuro">
        {dark ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}
