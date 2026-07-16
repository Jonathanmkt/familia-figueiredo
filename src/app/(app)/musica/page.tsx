import { MusicClient } from './music-client';

export default function MusicaPage() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Música</h1>
        <p className="text-sm text-muted-foreground">
          Busque a letra, marque palavras ou expressões e salve no banco.
        </p>
      </header>
      <MusicClient />
    </main>
  );
}
