import Link from 'next/link';

// Layout compartilhado das telas de auth: fundo do preset + marca + card centralizado.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-brand-foreground">
            F
          </span>
          <span className="text-lg font-semibold">Família Figueiredo</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
