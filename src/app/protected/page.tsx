import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookMarked, BookOpen, Library } from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const email = data.claims.email as string | undefined;
  const userId = data.claims.sub as string | undefined;

  // Perfil (roles / permissions / access_level) — criado pelo trigger no cadastro.
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_completo, roles, access_level, status')
    .eq('id', userId ?? '')
    .single();

  const roles = (profile?.roles as string[] | null) ?? [];

  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-brand-foreground">
          F
        </span>
        <span className="text-lg font-semibold">Família Figueiredo</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Você está logado ✓</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="font-medium">{email}</span>
          </div>

          {profile && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Perfil (autorização)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {r}
                  </Badge>
                ))}
                <Badge variant="outline">nível {profile.access_level}</Badge>
                <Badge variant="success">{profile.status}</Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild variant="brand">
              <Link href="/anki">
                <BookOpen /> Anki
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leitor">
                <Library /> Leitor
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/palavras">
                <BookMarked /> Banco de Palavras
              </Link>
            </Button>
          </div>

          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
