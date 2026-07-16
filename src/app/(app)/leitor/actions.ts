'use server';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { MAX_PDF_MB } from './constants';

const run = promisify(execFile);

export type BookLanguage = 'en-US' | 'pt-BR';

/** Abaixo deste total de caracteres (nas 1ªs páginas), tratamos como escaneado/imagem. */
const MIN_TEXT_CHARS = 300;

/** Registra o livro após o upload do EPUB pro Storage (feito no client). */
export async function createBook(input: {
  title: string;
  author: string;
  language: BookLanguage;
  storagePath: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('books').insert({
    title: input.title,
    author: input.author || null,
    language: input.language,
    storage_path: input.storagePath,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/leitor');
}

/**
 * Converte um PDF (de texto real) já enviado para um caminho temporário no Storage:
 * baixa → valida que tem texto (pdftotext) → `ebook-convert` (Calibre) → sobe o EPUB →
 * cria o livro. Roda no container do app (tem os binários). PDFs escaneados são rejeitados.
 */
export async function converterPdf(input: {
  pdfPath: string;
  title: string;
  author: string;
  language: BookLanguage;
}) {
  const supabase = await createClient();

  const { data: blob, error: dlErr } = await supabase.storage.from('books').download(input.pdfPath);
  if (dlErr || !blob) throw new Error('Não foi possível ler o PDF enviado.');
  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.length > MAX_PDF_MB * 1024 * 1024) {
    await supabase.storage.from('books').remove([input.pdfPath]).catch(() => {});
    throw new Error(`PDF muito grande (máx. ${MAX_PDF_MB} MB).`);
  }

  const dir = await mkdtemp(join(tmpdir(), 'pdf2epub-'));
  const pdfFile = join(dir, 'in.pdf');
  const epubFile = join(dir, 'out.epub');
  const cleanup = async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    await supabase.storage.from('books').remove([input.pdfPath]).catch(() => {});
  };

  try {
    await writeFile(pdfFile, buf);

    // Valida: é PDF de texto real? (pdftotext nas primeiras páginas)
    let texto = '';
    try {
      const { stdout } = await run('pdftotext', ['-l', '5', pdfFile, '-'], { maxBuffer: 1024 * 1024 * 16 });
      texto = stdout;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Conversor indisponível no servidor (poppler ausente).');
      }
      throw new Error('Não foi possível analisar o PDF. Envie um PDF de texto (não escaneado).');
    }
    if (texto.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
      throw new Error(
        'Este PDF parece ser escaneado (imagem, sem texto). Por ora aceitamos apenas PDFs de texto real.'
      );
    }

    // Converte com Calibre (heurísticas para desembrulhar linhas/parágrafos).
    try {
      await run('ebook-convert', [pdfFile, epubFile, '--enable-heuristics', '--unwrap-lines'], {
        timeout: 120_000,
        maxBuffer: 1024 * 1024 * 16,
      });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Conversor indisponível no servidor (Calibre ausente).');
      }
      throw new Error('Falha ao converter o PDF para EPUB.');
    }

    // Sobe o EPUB e cria o livro.
    const epub = await readFile(epubFile);
    const storagePath = `${crypto.randomUUID()}.epub`;
    const { error: upErr } = await supabase.storage
      .from('books')
      .upload(storagePath, epub, { contentType: 'application/epub+zip' });
    if (upErr) throw new Error(upErr.message);

    const { error: insErr } = await supabase.schema('leitor').from('books').insert({
      title: input.title,
      author: input.author || null,
      language: input.language,
      storage_path: storagePath,
    });
    if (insErr) throw new Error(insErr.message);

    revalidatePath('/leitor');
  } finally {
    await cleanup();
  }
}

export async function deleteBook(bookId: string, storagePath: string) {
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('books').delete().eq('id', bookId);
  if (error) throw new Error(error.message);
  // Melhor esforço: remove o arquivo; se falhar, o registro já saiu da biblioteca.
  await supabase.storage.from('books').remove([storagePath]);
  revalidatePath('/leitor');
}

/** Salva a posição de leitura do usuário (CFI + fração 0–1). */
export async function saveProgress(bookId: string, locationCfi: string, fraction: number) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return;
  await supabase
    .schema('leitor')
    .from('reading_progress')
    .upsert(
      { book_id: bookId, user_id: userId, location_cfi: locationCfi, fraction },
      { onConflict: 'book_id,user_id' }
    );
}

// ============================================================
// Traduções
// ============================================================

const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate';

/** en-US ↔ pt-BR: traduz sempre pro "outro" idioma do par (no Azure, pt = pt-BR). */
function azurePair(sourceLang: BookLanguage): { from: string; to: string } {
  return sourceLang === 'en-US' ? { from: 'en', to: 'pt' } : { from: 'pt', to: 'en' };
}

/** Tradução comum (Azure Translator) com cache compartilhado no banco. */
export async function traduzir(text: string, sourceLang: BookLanguage): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const { from, to } = azurePair(sourceLang);

  const supabase = await createClient();

  const { data: cached } = await supabase
    .schema('leitor')
    .from('translation_cache')
    .select('translated_text')
    .eq('source_text', trimmed)
    .eq('source_lang', from)
    .eq('target_lang', to)
    .maybeSingle();
  if (cached) return cached.translated_text;

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error('Tradução indisponível: configure AZURE_TRANSLATOR_KEY e AZURE_TRANSLATOR_REGION.');
  }

  const res = await fetch(`${AZURE_ENDPOINT}?api-version=3.0&from=${from}&to=${to}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ text: trimmed }]),
  });
  if (!res.ok) throw new Error(`Tradução falhou (${res.status})`);

  const payload = (await res.json()) as { translations: { text: string }[] }[];
  const translated = payload[0]?.translations?.[0]?.text;
  if (!translated) throw new Error('Tradução falhou: resposta vazia.');

  // Cache é otimização: corrida com outro usuário (23505) não é erro.
  await supabase.schema('leitor').from('translation_cache').insert({
    source_text: trimmed,
    source_lang: from,
    target_lang: to,
    translated_text: translated,
  });

  return translated;
}

export type ContextualTranslation = { traducao: string; explicacao: string };

/** Tradução no contexto: gpt-4o-mini recebe o parágrafo inteiro e explica a expressão nele. */
export async function traduzirNoContexto(
  expression: string,
  paragraph: string,
  sourceLang: BookLanguage
): Promise<ContextualTranslation> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Tradução contextual indisponível: configure OPENAI_API_KEY.');

  const sourceName = sourceLang === 'en-US' ? 'inglês (EUA)' : 'português (BR)';
  const targetName = sourceLang === 'en-US' ? 'português do Brasil' : 'inglês (EUA)';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `Você ajuda estudantes de idiomas. O texto está em ${sourceName}. ` +
            `Traduza a expressão indicada para ${targetName} CONSIDERANDO o sentido dela no parágrafo ` +
            `(não a tradução literal isolada) e dê uma explicação curta (1-2 frases, em português do Brasil) ` +
            `do uso/nuance nesse contexto. Na explicação, ao citar a expressão, cite-a SEMPRE no idioma ` +
            `original (${sourceName}), entre aspas simples — nunca cite a tradução, que já aparece à parte. ` +
            `Responda APENAS em JSON: {"traducao": "...", "explicacao": "..."}`,
        },
        {
          role: 'user',
          content: `Parágrafo:\n"""${paragraph}"""\n\nExpressão: "${expression}"`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Tradução contextual falhou (${res.status})`);

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0]?.message?.content ?? '{}') as Partial<ContextualTranslation>;
  if (!parsed.traducao) throw new Error('Tradução contextual falhou: resposta vazia.');
  return { traducao: parsed.traducao, explicacao: parsed.explicacao ?? '' };
}

// ============================================================
// Banco de palavras
// ============================================================

export async function salvarSelecao(input: {
  bookId: string;
  selectedText: string;
  paragraphContext: string;
  locationCfi: string | null;
  language: BookLanguage;
  translationCommon: string | null;
  translationContextual: string | null;
  contextExplanation: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.schema('leitor').from('word_bank').insert({
    book_id: input.bookId,
    source_type: 'book',
    selected_text: input.selectedText,
    paragraph_context: input.paragraphContext || null,
    location_cfi: input.locationCfi,
    language: input.language,
    translation_common: input.translationCommon,
    translation_contextual: input.translationContextual,
    context_explanation: input.contextExplanation,
  });
  if (error) throw new Error(error.message);
  // Sem revalidatePath aqui: /palavras é dinâmica (busca fresh a cada visita) e
  // revalidar recarregaria a rota atual do leitor (nova signed URL → livro remonta).
}
