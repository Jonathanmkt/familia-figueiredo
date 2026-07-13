import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Família Figueiredo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Tema do brasão: azul dominante, vermelho em contraste.
          </p>
          <div className="flex gap-3">
            <Button>Ação principal</Button>
            <Button variant="brand">Destaque</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
