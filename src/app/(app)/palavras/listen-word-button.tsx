'use client';

import { Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ListenWordButton({ text, language }: { text: string; language: string }) {
  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label="Ouvir"
      title="Ouvir"
      onClick={speak}
    >
      <Volume2 className="size-4" />
    </Button>
  );
}
