import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { ReaderClient } from './reader-client';
import type { BookLanguage } from '../actions';

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .schema('leitor')
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();
  if (!book) notFound();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: progress } = await supabase
    .schema('leitor')
    .from('reading_progress')
    .select('location_cfi')
    .eq('book_id', bookId)
    .eq('user_id', userId ?? '')
    .maybeSingle();

  const { data: signed, error: signError } = await supabase.storage
    .from('books')
    .createSignedUrl(book.storage_path, 60 * 60);
  if (signError || !signed) throw new Error('Não foi possível abrir o arquivo do livro.');

  return (
    <ReaderClient
      bookId={book.id}
      title={book.title}
      language={book.language as BookLanguage}
      fileUrl={signed.signedUrl}
      initialCfi={progress?.location_cfi ?? null}
    />
  );
}
