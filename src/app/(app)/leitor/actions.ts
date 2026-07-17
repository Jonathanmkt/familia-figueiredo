'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type BookLanguage = 'en-US' | 'pt-BR';

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

/**
 * Traduz VÁRIAS linhas de uma vez (Azure batch) — usado no "traduzir página/música".
 * Preserva o alinhamento por índice; linhas em branco voltam vazias. Sem cache (1 request por lote).
 */
export async function traduzirLinhas(lines: string[], sourceLang: BookLanguage): Promise<string[]> {
  const out: string[] = new Array(lines.length).fill('');
  const idx: number[] = [];
  const payload: { text: string }[] = [];
  lines.forEach((l, i) => {
    if (l.trim()) {
      idx.push(i);
      payload.push({ text: l });
    }
  });
  if (!payload.length) return out;

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error('Tradução indisponível: configure AZURE_TRANSLATOR_KEY e AZURE_TRANSLATOR_REGION.');
  }
  const { from, to } = azurePair(sourceLang);

  // Azure aceita muitos itens por request; lotes de 90 por segurança.
  for (let start = 0; start < payload.length; start += 90) {
    const chunk = payload.slice(start, start + 90);
    const res = await fetch(`${AZURE_ENDPOINT}?api-version=3.0&from=${from}&to=${to}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`Tradução falhou (${res.status})`);
    const data = (await res.json()) as { translations: { text: string }[] }[];
    data.forEach((d, j) => {
      out[idx[start + j]] = d.translations?.[0]?.text ?? '';
    });
  }
  return out;
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
