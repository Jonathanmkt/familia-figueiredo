import Link from 'next/link';
import { Library } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UploadBookDialog } from './upload-book-dialog';

export default async function LeitorPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  const [{ data: books }, { data: progress }] = await Promise.all([
    supabase
      .schema('leitor')
      .from('books')
      .select('id, title, author, language')
      .order('created_at', { ascending: false }),
    supabase
      .schema('leitor')
      .from('reading_progress')
      .select('book_id, fraction')
      .eq('user_id', userId ?? ''),
  ]);

  const fractionByBook = new Map((progress ?? []).map((p) => [p.book_id, p.fraction]));

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leitor</h1>
          <p className="text-sm text-muted-foreground">Biblioteca da família</p>
        </div>
        <UploadBookDialog />
      </header>

      {!books?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Library className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              A biblioteca está vazia. Adicione o primeiro EPUB para começar a ler.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => {
            const fraction = fractionByBook.get(book.id) ?? 0;
            return (
              <Link key={book.id} href={`/leitor/${book.id}`}>
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="text-lg">{book.title}</CardTitle>
                    {book.author && <CardDescription>{book.author}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <Badge variant="secondary">
                      {book.language === 'en-US' ? 'Inglês (EUA)' : 'Português (BR)'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Progress value={fraction * 100} className="h-1.5" />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.round(fraction * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
