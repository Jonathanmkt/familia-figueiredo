# APIs GRATUITAS de Música: Busca/Autocomplete (A) + Letra (B) — Análise Comparativa Aprofundada

## TL;DR
- **Não existe hoje uma única API 100% gratuita E legal que resolva, ao mesmo tempo, busca de qualidade + letra completa.** As letras são obra protegida por direito autoral e o licenciamento (Musixmatch pago, LyricFind) é caro e B2B; por isso a arquitetura correta é **separar metadados (grátis) de letras (LRCLIB)** — sua intuição inicial está certa.
- **Melhor stack gratuita hoje:** **iTunes Search API** (autocomplete de metadados, sem chave, catálogo Apple grande/atualizado, retorna título+artista+álbum+duração+trackId) **ou Deezer API pública** (que ainda retorna **ISRC**) para a busca **(A)**, combinada com o **LRCLIB** para a letra sincronizada em LRC **(B)**. Tudo grátis e sem chave; iTunes/Deezer exigem um proxy/backend por causa de CORS.
- **Alerta jurídico:** o LRCLIB é crowdsourced e **não licencia os direitos autorais** das letras. Para uso familiar/educacional privado o risco é baixo, mas num produto comercial futuro exibir letras sem licença adequada é risco real de infração do **direito de reprodução** (Lei 9.610/98) — e isso **não** é coberto pela licença do ECAD (que trata de execução pública, não de exibição do texto).

## Key Findings

### Grupo 1 — APIs de METADADOS / BUSCA (não fornecem letra)
| Ponto | Resumo |
|---|---|
| **iTunes Search API** | Grátis, sem chave, sem OAuth. ~20 chamadas/min. Sem CORS (precisa proxy). Retorna trackName, artistName, collectionName (álbum), trackTimeMillis (duração), trackId — **não retorna ISRC**. |
| **Deezer API** | Busca pública sem auth; tem endpoint de autocomplete. Sem CORS (JSONP ou proxy). **Retorna ISRC**. OAuth só p/ dados de usuário. |
| **MusicBrainz** | Grátis, sem chave, exige User-Agent. **1 req/s por IP** → inadequado para autocomplete. Retorna ISRC + MBID. |
| **Last.fm** | Grátis não-comercial, exige chave. track.search existe. Uso comercial exige acordo. Cap de 100 MB de dados armazenados. |
| **Spotify** | Exige OAuth (client credentials); segredo não vai ao browser (precisa backend). Dev Mode agora exige Premium e é não-comercial. ISRC só em get-track, não no search. Termos restringem armazenamento e uso comercial. |
| **TheAudioDB** | Chave grátis pública "123" muito limitada; publicar app exige Patreon US$ 8/mês. |

### Grupo 2 — APIs de LETRA
| Ponto | Resumo |
|---|---|
| **LRCLIB** | 100% grátis, sem chave, **sem rate limit declarado**. Retorna plainLyrics + syncedLyrics (LRC). Crowdsourced (~3 mi de letras). Não licencia direitos autorais. |
| **Musixmatch** | Freemium. Grátis retorna só **~30% da letra** (preview). Letra completa + synced + **uso comercial exigem plano pago/licenciado**. Obriga exibir copyright + tracking script. |
| **Genius** | API pública **NÃO retorna a letra completa** — só metadados/anotações e a URL da página. Obter a letra exige scraping (contra os termos). |
| **LyricFind** | Inteiramente **B2B licenciado**; sem tier grátis. 65.000+ catálogos. |
| **Happi.dev** | Tier grátis de 8.000 chamadas/mês com chave; letras "só para uso pessoal". |
| **AudD** | Reconhecimento de áudio + `findLyrics` (reverse lyric search). 300 requests grátis, depois pago (US$ 2–5/1000). |

---

## Tabela Comparativa Completa

| API | Grátis? | Auth (tipo/fluxo) | Rate limit | CORS/browser direto | Qualidade busca/autocomplete | Reverse lyric search | Fornece letra? | Catálogo | Campos p/ matching | Termos/uso comercial |
|---|---|---|---|---|---|---|---|---|---|---|
| **iTunes Search** | Sim | Nenhuma | ~20/min; Retry-After ~29s | **Não** (sem headers CORS → proxy) | Boa; prefixo ok, typo fraco | Não | Não | Apple, grande e atualizado | trackName, artistName, collectionName, trackTimeMillis, trackId, previewUrl, artwork (**sem ISRC**) | iTunes Affiliate/Search; promover com link p/ loja; pede caching; nada de uso "independente" de previews/artwork |
| **Deezer** | Sim (busca) | Nenhuma p/ busca; OAuth2 só p/ user | Quota por app (não numérica); busca sem limite rígido documentado | **Não** ("Deezer does not have CORS support"); usar output=jsonp ou proxy | Boa; endpoint autocomplete dedicado | Não | Não | ~90M+ faixas | id, title, artist, album, duration, **ISRC** | Sem licença/certificação p/ uso comercial ou não; whitelist só com acordo; imagens não podem ser armazenadas |
| **MusicBrainz** | Sim | Nenhuma p/ leitura (User-Agent obrigatório) | **1 req/s por IP** → 503; IP bloqueado se abusar | Sim (mas 1 req/s inviabiliza type-ahead) | Boa p/ matching canônico; ruim ao vivo | Não | Não | Enorme, colaborativo | MBID, **ISRC**, título, artista, álbum, duração | Dados sob CC0; livre inclusive comercial |
| **Last.fm** | Sim (não-comercial) | API key (leitura) | ~5 req/s por IP; erro 29 | Sim, mas key exposta | track.search razoável | Não | Não | Grande | name, artist, mbid, listeners (sem ISRC/duração confiável) | **Não-comercial**; comercial exige acordo (partners@last.fm); cap 100 MB; atribuição "powered by AudioScrobbler" |
| **Spotify** | Sim (com limites) | **OAuth (client credentials)**; secret no backend | Janela móvel 30s (número não publicado); 429 + Retry-After | **Não** (secret + política) | Search muito boa (máx 10/página) | Não | Não | Enorme, atualizadíssimo | id, name, artists, album, duration_ms; ISRC só em get-track | Proíbe revender/reempacotar dados; Dev Mode não-comercial (Premium, 5 users); deletar dados ao encerrar |
| **TheAudioDB** | Parcial | Header X-API-KEY (grátis "123") | Métodos restritos no free | Sim | Fraca p/ autocomplete | Não | Não | Comunitário | id, artista, álbum, faixa, MBID | Não pode publicar em appstore sem Patreon US$8; sem revenda |
| **LRCLIB** | **Sim (100%)** | **Nenhuma** | **Nenhum declarado** | Sim (endpoints públicos) | Search por keyword (máx 20, sem paginação) | Sim, por keyword (`/api/search`) | **Sim: completa + sincronizada (LRC)** — grátis | ~3 mi (crowdsourced) | id, trackName, artistName, albumName, duration, plainLyrics, syncedLyrics | MIT/open source; **não licencia direito autoral** da composição |
| **Musixmatch** | Freemium | API key (query param) | Free ~alguns milhares/dia | Não (key server-side) | track.search + matcher.track.get | Sim (matcher; letra completa só no pago) | **Parcial no grátis (~30%)**; completa/synced só pago/licenciado | 100% licenciado, enorme | trackId, título, artista, álbum, flags has_lyrics/has_synced | **Uso comercial = plano pago licenciado**; obriga copyright + tracking script; caching de letra restrito |
| **Genius** | Sim (metadados) | OAuth token | Não publicado | Não (token) | search bom (song/lyric/artist) | Parcial (busca por trecho retorna hits, não letra) | **Não** (só anotações + URL; letra exige scraping) | Enorme (foco lírico) | id, title, primary_artist, album, url | Termos proíbem uso não autorizado; scraping da página é risco |
| **LyricFind** | **Não** | Contrato B2B | Contratual | — | — | Sim (produto licenciado) | Sim, **totalmente licenciado**, pago | 65.000+ catálogos | Conforme contrato | 100% B2B; caminho "limpo" porém caro |
| **Happi.dev** | Sim (free tier) | API key | 8.000 chamadas/mês | Não (key) | Busca de faixa por texto | Lyrics Search API (beta) | Sim, mas **"só uso pessoal"** | Agregado | ids de artista/álbum/faixa | Letras não cobrem uso comercial |
| **AudD** | 300 grátis, depois pago | api_token | Por plano | Sim (token) | Recon. por áudio | **Sim** (`findLyrics?q=trecho`) | Retorna letra no recon (não fonte contínua grátis) | 80–160M songs | title, artist, **ISRC**, UPC, links Spotify/Apple/Deezer/MB | Pago p/ produção (US$ 2–5/1000) |

---

## Details

### (A) BUSCA / AUTOCOMPLETE

**iTunes Search API** — `https://itunes.apple.com/search?term=...&entity=song`. Sem chave, sem OAuth. A documentação oficial da Apple afirma: *"The Search API is limited to approximately 20 calls per minute (subject to change)"* e recomenda *"Large websites should set up caching logic"*. Ao exceder, retorna erro com header `Retry-After` (~29s). **Não envia headers CORS** — precisa de proxy/backend. Busca por prefixo funciona razoavelmente; tolerância a typo é limitada. Retorna trackName, artistName, collectionName (álbum), trackTimeMillis (duração), trackId, previewUrl, artwork — **não retorna ISRC**. Catálogo Apple grande e atualizado com hits em inglês. Os termos são do programa de afiliados iTunes: previews/artwork só podem ser usados para promover conteúdo com link "Download on iTunes", nunca para "independent entertainment value" — mas usar os campos de texto (título/artista/álbum) para casar com o LRCLIB é uso comum e de baixo atrito.

**Deezer API** — `https://api.deezer.com/search?q=...` funciona **sem autenticação**, e existe endpoint de autocomplete (`/search/track/autocomplete`). OAuth2 só é necessário para dados privados de usuário. A FAQ oficial confirma: *"Deezer does not have CORS support"* e recomenda formato JSONP (`output=jsonp`) — na prática, para um app, um proxy é mais limpo. Retorna id, title, artist, album, duration e **ISRC** no objeto track — vantagem decisiva sobre o iTunes se você quer ISRC. ~90M+ faixas. Query é obrigatória (não busca só por ordenação). Termos: Deezer não concede licença/certificação para uso comercial ou não-comercial via API/SDK, e whitelisting só com acordo comercial; imagens não podem ser armazenadas por razões legais.

**MusicBrainz** — grátis, sem chave, mas a regra oficial é **1 requisição/segundo por IP** (HTTP 503 ao exceder; IP pode ser bloqueado) — o que **inviabiliza type-ahead** com múltiplas chamadas por segundo. Exige User-Agent identificável (nome do app + contato). Retorna MBID, **ISRC**, título, artista, álbum, duração. Papel ideal: enriquecimento/canonização por ISRC **no momento de gravar no cache**, nunca no autocomplete ao vivo. Dados sob CC0 (livre, inclusive comercial).

**Last.fm** — exige chave (grátis não-comercial). track.search retorna name, artist, mbid, listeners. Limite documentado: *"You will not make more than 5 requests per originating IP address per second"*. Os Termos são explícitos: *"You are permitted to use the Last.fm Data solely for non-commercial purposes... If at any time you wish to use the Last.fm Data for commercial purposes, you must apply for a commercial use agreement"*, com "Reasonable Usage Cap" de 100 MB de dados armazenados e obrigação de exibir botão "powered by AudioScrobbler". Não é a melhor escolha para autocomplete (sem ISRC/duração confiáveis) nem para produto comercial.

**Spotify Web API** — o search é excelente, mas **exige OAuth (client credentials)** com client secret que **não pode ser exposto no browser** → obriga backend/proxy. O rate limit é calculado numa "rolling 30 second window" e a Spotify **não publica o número absoluto**; ao exceder retorna 429 com Retry-After. A migração de fevereiro/2026 reduziu o Dev Mode: passa a exigir **conta Premium**, 1 Client ID por dev, até 5 usuários autorizados, subconjunto menor de endpoints e search limitado a **10 resultados por página** — e é explicitamente para uso **não-comercial**. Combinado com termos restritivos de armazenamento/uso comercial, o Spotify é a pior escolha para este caso de uso apesar da qualidade do catálogo.

### (B) LETRA

**LRCLIB** — a documentação oficial (lrclib.net/docs) é inequívoca: *"This API has no rate limiting in place and is openly accessible to all users and applications. There is no need for an API key or any kind of registering!"* — recomenda (não obriga) enviar User-Agent com nome/versão/link do app. Endpoints principais: `/api/get` (por track_name + artist_name + album_name + duration), `/api/search` (por keyword, **máx. 20 resultados, sem paginação** — serve como reverse lyric search rudimentar por trecho) e `/api/get/{id}`. Retorna **plainLyrics** (texto puro) e **syncedLyrics** (formato LRC com timestamps `[mm:ss.xx]`), além de id, trackName, artistName, albumName, duration, instrumental. É open source (MIT), sem fins lucrativos, com base crowdsourced de aproximadamente 3 milhões de letras (não deduplicadas). **Implicação legal:** as letras são contribuídas por usuários e o LRCLIB **não detém nem licencia os direitos autorais** das composições — a licitude de reexibi-las num produto comercial depende de você.

**Musixmatch** — Freemium. O plano grátis/community retorna apenas cerca de **30% da letra** (preview), não o texto completo. **Letra completa, versão sincronizada (richsync/LRC) e uso comercial exigem plano pago/licenciado.** A doc oficial descreve o fluxo padrão: track.search/matcher.track.get → track.lyrics.get, e a resposta de lyrics inclui um **aviso de copyright** e um **tracking script** que devem ser exibidos/executados. O próprio Musixmatch se posiciona como *"the fastest, most powerful and legal way to display lyrics"* — ou seja, a legalidade vem justamente do licenciamento pago. Recente mudança de política passou a exigir que artistas assinem Musixmatch Pro para ter letras distribuídas nas plataformas parceiras (Spotify etc.), o que ilustra o quão controlado/comercial é o ecossistema. **NB:** existem wrappers que usam uma "community API key" de engenharia reversa para obter letras completas grátis — isso viola os termos e não deve ser usado em produto.

**Genius** — a API pública **não retorna a letra completa**; entrega metadados de música/artista/álbum, anotações (referents) e a URL da página em genius.com. Como resume a especificação OpenAPI da comunidade: *"The API does NOT serve raw lyric text directly (those must be scraped from the public song page)"*. Fazer scraping da página para extrair a letra é contra os termos e juridicamente arriscado. Genius é ótimo para metadados/descoberta e anotações, mas **inútil como fonte legal de letra completa via API**.

**LyricFind** — 100% B2B licenciado; **não há tier gratuito para desenvolvedores**. Licencia mais de 65.000 catálogos de editoras/PROs e serve Google, Amazon, YouTube, Deezer e Pandora. É o caminho "legalmente limpo" para letras, mas caro e por contrato — reservado para quando o produto for comercial e tiver orçamento.

**Happi.dev** — Tier grátis com chave, 8.000 chamadas/mês, com Lyrics Search API (marcada como beta). As letras são disponibilizadas para **uso pessoal** — não cobre uso comercial, então serve apenas para o cenário hobby.

**AudD** — foco em **reconhecimento de música por áudio** (como o Shazam), mas oferece `findLyrics` para **reverse lyric search** (`https://api.audd.io/findLyrics?q=trecho&api_token=...`). São 300 requests grátis, depois pago (US$ 2–5/1000). O recognize retorna title, artist, ISRC, UPC e links (Spotify/Apple/Deezer/MusicBrainz). Útil se você quiser especificamente reverse lyric search ou "que música está tocando", mas não é fonte gratuita de letra completa contínua.

### TERMOS DE USO — pontos críticos

**Spotify Developer Terms/Policy:** proíbem expressamente *"Repackaging data that you've gathered from the API and selling it to businesses"* e *"Selling ... merchandise featuring artwork or metadata that you obtained using our developer tools"*. Non-Streaming SDAs só admitem uso comercial limitado (venda de publicidade/patrocínio ou de acesso ao próprio app). Ao encerrar/violar, é preciso **deletar todo o Spotify Content** (incluindo metadados). Também há proibição de treinar modelos de ML/IA com conteúdo Spotify. Conclusão: usar Spotify para busca e depois exibir letra de outra fonte é área cinzenta, e o Dev Mode explicitamente **não é base para escalar um negócio**.

**Apple / iTunes Search API terms:** voltados ao programa de afiliados. Previews de áudio e artwork têm regras estritas (só para promover conteúdo, com link para a loja, sem download/cache dos previews, com atribuição "provided courtesy of iTunes"). Usar os **campos de texto de metadados** (título/artista/álbum/duração) para casar com o LRCLIB é uso comum e de baixo risco; o cuidado é com previews/artwork.

**Contexto legal brasileiro (direito autoral + LGPD):** A letra de música é obra literária protegida pela **Lei 9.610/98**. O **ECAD arrecada por execução pública** (tocar a gravação/fonograma em ambiente público) — modelo de licença por tipo de uso, sobre receita ou UDAs. Mas a **reprodução/exibição do texto escrito da letra** é exercício do **direito de reprodução** do autor/editora, que **não é coberto pela licença do ECAD**. Ou seja: mesmo pagando ECAD (que nem se aplica ao seu caso), exibir letras exigiria autorização dos titulares de reprodução — na prática, uma licença como as da Musixmatch/LyricFind. Sob **LGPD**, cachear metadados públicos no Supabase é de baixo risco; já dados dos usuários (o que pesquisam, quais músicas estudam) exigem base legal, finalidade e política de privacidade.

---

## Recommendations

### (i) Melhor stack SEPARANDO metadados (A) + letra (B)
**Recomendação: iTunes Search API (ou Deezer, se quiser ISRC) para o autocomplete + LRCLIB para a letra.**

**Passo a passo (estágio hobby/família de hoje):**
1. Frontend → **seu backend/proxy leve** (obrigatório por causa do CORS do iTunes/Deezer) → iTunes Search para o type-ahead.
2. Aplique **debounce (~250–300 ms)** e só dispare a busca a partir de ~3 caracteres, para respeitar as ~20 req/min do iTunes. Se preferir sem esse limite, use **Deezer** (sem limite rígido documentado e com autocomplete dedicado).
3. **Cacheie no Supabase** o resultado escolhido (título, artista, álbum, duração, trackId e, se via Deezer, ISRC). Isso elimina chamadas repetidas — exatamente sua estratégia.
4. Com título+artista+duração, consulte o **LRCLIB** (`/api/get`) e obtenha `syncedLyrics` (LRC) — ideal para um app de estudo de inglês por música (destaque linha a linha no tempo). LRCLIB não tem chave nem rate limit.
5. **Se precisar de ISRC e usou iTunes**, faça um lookup complementar no **MusicBrainz** apenas no momento de gravar no cache (respeitando 1 req/s), nunca no type-ahead.

**Justificativa:** essa combinação é gratuita, sem chave, com catálogo grande de hits em inglês, e o LRCLIB entrega letra **sincronizada** de graça. O único "custo" é manter um proxy simples. Deezer é preferível ao iTunes se ISRC for importante para o matching; iTunes é preferível se você valoriza a robustez/atualização do catálogo Apple e não precisa de ISRC.

### (ii) Existe UMA API única, grátis e legal, que resolva busca + letra completa?
**Não.** Nenhuma opção gratuita entrega, simultaneamente, busca de qualidade **e** letra completa de forma legal:
- **Musixmatch grátis** dá só ~30% da letra e proíbe uso comercial.
- **Genius** não entrega a letra via API (só metadados + URL; a letra completa só por scraping, o que é ilegal/contra os termos).
- **LyricFind** e **Musixmatch pago** entregam tudo, mas são caros e B2B.
- **LRCLIB** entrega letra completa/sincronizada grátis, mas **não faz** busca de catálogo com autocomplete de qualidade **e** não licencia os direitos autorais.

**Conclusão:** o custo de licenciamento de letras é exatamente o que justifica separar metadados (commodity gratuita) de provedor de letra. **Mantenha a arquitetura de duas fontes.**

### Benchmarks/gatilhos que mudariam a recomendação
- **App passa a ter receita/vira produto comercial** → orçar licença de letras (Musixmatch comercial ou LyricFind) **antes** do lançamento; reavaliar termos de iTunes/Deezer/Last.fm (todos mudam de figura com uso comercial).
- **Autocomplete estoura os limites do iTunes** → migrar para Deezer, ou construir um índice de busca próprio no Supabase alimentado pelas buscas já cacheadas (com typo tolerance via `pg_trgm`/full-text search do Postgres).
- **Necessidade de matching robusto por ISRC** → adicionar MusicBrainz ao pipeline de gravação (fora do type-ahead) ou usar Deezer como fonte primária.

---

## Caveats
- **O "grátis" é para hobby, não para produto comercial.** iTunes (afiliados), Deezer (sem licença comercial sem acordo), Last.fm (explicitamente não-comercial) e Spotify (Dev Mode não-comercial) **todos** mudam de regime quando há receita. Planeje a transição contratual antes de monetizar.
- **LRCLIB não resolve o direito autoral da letra.** Para uso familiar/educacional privado o risco prático é baixo; para um produto comercial que exibe letras ao público, há **risco real de infração do direito de reprodução** (não coberto pelo ECAD) — planeje licenciar (Musixmatch/LyricFind) quando comercializar.
- **O que só o plano pago/licenciado libera (exemplos concretos):**
  - *Musixmatch:* letra **completa** e **sincronizada** + **uso comercial** (o grátis = ~30% preview, não-comercial, com copyright+tracking script obrigatórios).
  - *Genius:* a **letra em si nunca** vem pela API pública (nem no pago via API oficial) — só metadados/anotações/URL.
  - *Spotify:* uso comercial e volume exigem **Extended Quota Mode**, e os termos **proíbem revender/reempacotar** dados e exigem deletar tudo ao encerrar.
- **Rate limits opacos:** o Spotify **não publica** o número absoluto (janela de 30s); trate 429/Retry-After defensivamente. MusicBrainz (1 req/s) e iTunes (~20/min) são os gargalos concretos para autocomplete.
- **Verifique sempre as páginas oficiais de pricing/terms antes de decisões comerciais**, pois as políticas mudam com frequência: o Spotify endureceu o Dev Mode em fevereiro/2026 e o Musixmatch alterou recentemente sua política de submissão/distribuição de letras.
- **Nota de método:** algumas confirmações de limites e cláusulas (ex.: quota diária exata do plano grátis Musixmatch e limites por endpoint do Spotify) baseiam-se em documentação secundária/comunidade porque os números não são publicados nas páginas oficiais; onde isso ocorre, tratei o dado como aproximado e recomendo confirmação direta no dashboard de cada serviço antes de qualquer compromisso comercial.