import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Cadastro realizado! 🎉</CardTitle>
        <CardDescription>Falta só confirmar seu email</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para o seu email. Clique nele para ativar a conta e depois
          é só entrar. (Confira também o spam.)
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Ir para entrar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
