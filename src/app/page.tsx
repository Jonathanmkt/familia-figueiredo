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
            Base pronta: Next.js 15 + Tailwind v4 + shadcn/ui (Radix) + lucide. Bora construir. 🚀
          </p>
          <Button>Começar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
