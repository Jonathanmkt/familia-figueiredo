import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ops, algo deu errado</CardTitle>
        <CardDescription>Não foi possível completar a ação</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {params?.error
            ? `Erro: ${params.error}`
            : 'Ocorreu um erro não especificado. Tente novamente.'}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Voltar para entrar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
