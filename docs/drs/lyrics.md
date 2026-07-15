# Fontes e APIs de Letras de Música: Análise Comparativa de Confiabilidade e Adequação Jurídica para um App de Estudo de Idiomas

## TL;DR
- Para um app de estudo de idiomas que exibe letras a usuários finais, **a única forma juridicamente segura de mostrar letra completa é licenciar via um provedor oficialmente licenciado — LyricFind ou Musixmatch (plano comercial)**; todas as opções gratuitas (Genius via scraping, Lyrics.ovh, Happi.dev, LRCLIB, AZLyrics) carregam risco de infração de direitos autorais porque nenhuma delas licencia a você o direito de *exibição pública* da composição.
- **LRCLIB é a melhor opção técnica gratuita** (cobertura ampla, letras sincronizadas em formato LRC, sem chave de API nem rate limit), mas é uma base crowd-sourced sem licenciamento — juridicamente é uma zona cinzenta/de risco, adequada para protótipo/MVP mas não para um produto comercial durável.
- **Recomendação:** comece o MVP com LRCLIB (sincronizadas) enquanto valida o produto; para lançamento comercial, contrate LyricFind (opção mais segura e precisa, usada por Google/Amazon/Deezer) ou o plano comercial do Musixmatch. Evite completamente scraping de Genius/AZLyrics em produto comercial — a NMPA move campanhas ativas de takedown e processos contra apps não licenciados.

## Key Findings

1. **Letra de música é dupla e separadamente protegida.** A letra faz parte da *composição musical* (obra literária/musical), cujos direitos pertencem a compositores e editoras (publishers) — separada do direito sobre a *gravação sonora* (master). Ter licença para tocar/streamar áudio **não** dá o direito de exibir a letra em texto; esse é um direito separado que precisa ser negociado à parte.

2. **Praticamente não existe "fair use" para exibir letra completa.** Exibir a letra inteira é reprodução + exibição pública, ambos direitos exclusivos do titular. Fair use é estreitíssimo para letras; uso educacional pesa a favor mas não é salvo-conduto, e uso comercial afasta a proteção.

3. **A API oficial do Genius NÃO entrega a letra.** Retorna metadados e anotações, mas não o texto da letra; bibliotecas populares obtêm a letra via scraping da página, o que viola os Termos de Serviço do Genius e reproduz obra de terceiros.

4. **Genius perdeu na Justiça (contra Google/LyricFind)** justamente porque *não é dono* dos direitos autorais das letras — apenas as transcreve. No caso *ML Genius Holdings LLC v. Google LLC* (Sup. Ct. nº 22-121; a Suprema Corte recusou o certiorari em 26/06/2023), a Rolling Stone resumiu: "the company didn't have any ownership over the lyrics it shared on its site; those are owned solely by a song's writers and publishers." Isso é a prova definitiva de que hospedar/transcrever letras não confere direitos: o direito é do compositor/editora.

5. **LyricFind e Musixmatch são os únicos provedores verdadeiramente licenciados** com acordos diretos com as grandes editoras (Universal Music Publishing, Sony Music Publishing, Warner Chappell). São os que alimentam Google, Amazon, Apple Music, Spotify, Deezer, etc.

6. **A NMPA (associação das editoras dos EUA) tem campanha ativa e lucrativa de enforcement** contra sites e apps de letras não licenciados, incluindo notificações às lojas Apple/Google.

## Details

### O marco jurídico dos direitos de letras

A letra é protegida como parte da composição musical sob a lei dos EUA (Title 17). Segundo o U.S. Copyright Office, quando você grava uma música cria potencialmente duas obras distintas e separadamente licenciáveis: a "musical work" (composição + letra, normalmente do compositor/editora) e o "sound recording" (a gravação). Os direitos da letra em geral permanecem com compositores e editoras. Fundamental para um app: **não há direito de exibição pública para a gravação sonora, mas há para a composição** — logo, exibir a letra em texto exige autorização do titular da composição, mesmo que você já tenha resolvido o áudio por outro meio.

Sobre fair use: a análise usa quatro fatores (propósito/caráter — comercial vs. educacional; natureza da obra; quantidade usada; efeito no mercado). Guias jurídicos e a própria análise da Wikimedia deixam claro que **exibir a letra completa raramente ou nunca se enquadra em fair use**, e que "não há número específico de palavras, linhas ou notas que possa ser usado com segurança" (U.S. Copyright Office). Uso educacional/sem fins lucrativos pende a favor, mas um app distribuído publicamente — mesmo educacional e gratuito — que reproduz letras completas dificilmente se qualifica, especialmente se houver qualquer monetização.

Quem detém/licencia os direitos: compositores → editoras (publishers) como Universal Music Publishing, Sony Music Publishing, Warner Chappell, Kobalt/BMG. Nos EUA, as PROs (ASCAP, BMI, SESAC) licenciam *performance*; mas exibição de letra em texto é um *print/reproduction/display right* negociado diretamente com editoras ou via agregadores licenciados (LyricFind, Musixmatch). A NMPA (National Music Publishers' Association) coordena o enforcement.

### Precedentes e enforcement (o alerta jurídico)

- **Genius v. Google/LyricFind (2019–2023):** Genius acusou o Google de exibir letras raspadas de seu site (provou com marca d'água em código Morse — "REDHANDED"), pedindo US$50 milhões. O caso foi **rejeitado** porque as reivindicações estaduais (quebra de ToS) foram consideradas preemptadas pela lei federal de direitos autorais — e **Genius não é titular dos direitos das letras** (suas transcrições são "obras derivadas" do titular original). O 2º Circuito confirmou (março/2022) e a Suprema Corte recusou o caso (26/06/2023). Google, na voz do porta-voz José Castañeda: "We license lyrics on Google Search from third parties, and we do not crawl or scrape websites to source lyrics." Lição dupla: (a) transcrever/hospedar letra não gera direito; (b) o motivo de o Google ter vencido é justamente que ele *licenciava* de terceiro (LyricFind).
- **NMPA vs. sites de letras (desde 2013):** notificações de takedown aos 50 maiores sites não licenciados; alguns (incl. RapGenius) obtiveram licença, outros removeram conteúdo, e a NMPA processou sites reincidentes.
- **NMPA — campanha contra apps não licenciados (2022):** em 15/06/2022, David Israelite (NMPA) anunciou processo contra o app de vídeo Vinkle (protocolado no Northern District of California; a queixa lista 55 músicas alegadamente infringidas) e **quase 100 notificações de cease-and-desist** a outros apps, incluindo notificações às lojas de apps de Apple e Google.
- **Retorno financeiro do enforcement da NMPA:** segundo Israelite, a NMPA arrecadou **US$89,774 milhões** para seus membros em 2021 via vitórias judiciais e acordos, e esses esforços legais já trouxeram "quase US$1,126 bilhão" no total. Ou seja, litígio de letras é uma linha de receita ativa e agressiva das editoras.
- **NMPA vs. Spotify (2024–2025):** cease-and-desist alegando exibição de letras não licenciadas em podcasts/vídeos, reforçando que licença de áudio ≠ licença de letra.
- **Caso real de developer:** um desenvolvedor teve app iOS de letras reprovado pela Apple (Guideline 5.2.1) por usar a API do Genius sem autorização documentada para o conteúdo de terceiros — a Apple exige "evidência documentada do direito de usar tal conteúdo".

### Provedor por provedor

**Musixmatch API (oficial).** O maior catálogo de letras do mundo (mais de 12 milhões de músicas, 250+ idiomas). Segundo comunicado da própria empresa (PR Newswire, 15/10/2025), o Musixmatch tem "partnering with over 225,000 publishers and nearly 3 million songwriters" e alimenta serviços como "Spotify, Apple Music, YouTube, Google, Amazon Music, iHeart Radio, and Instagram". Excelente cobertura de música famosa em inglês e alta precisão. Modelo freemium: plano gratuito limitado a cerca de **2.000 chamadas/dia** e retorna **apenas ~30% da letra como preview** — o próprio campo `lyrics_copyright` da API diz "This Lyrics is NOT for Commercial use and only 30% of the lyrics are returned". Letra completa + letra sincronizada + uso comercial exigem **plano comercial/enterprise licenciado** ("acesso ao catálogo completo disponível apenas para parceiros selecionados"), que é **negociado sob medida — sem preço público** ("contact us"). Exige exibir o aviso de copyright retornado e disparar um script/pixel de tracking. Suporta letras sincronizadas (line-synced e word-synced) nos planos pagos. **Nota:** o Musixmatch está envolvido em disputa antitruste movida pela LyricFind (protocolada em 05/03/2025 no Northern District of California contra Musixmatch e sua controladora TPG Growth), que alega que o acordo de exclusividade para sub-licenciar letras da Warner Chappell viola a lei antitruste dos EUA — e um juiz federal já rejeitou grande parte do pedido de arquivamento do Musixmatch. Em out/2025, o Musixmatch também firmou acordos de licenciamento de IA (não-generativa) com Sony, Universal e Warner Chappell, dando acesso a catálogos de 15M+ obras.

**Genius API (oficial).** Fornece metadados, busca e anotações, mas **não retorna o texto da letra** pela API. Bibliotecas como `lyricsgenius` obtêm a letra fazendo scraping da página HTML — o que **viola os ToS do Genius** ("The Service is for your personal use and may not be used for direct commercial endeavors without the express written consent of Genius"). Cobertura ampla e boa, mas precisão variável (crowd-sourced). **Não é adequado para exibir letra completa em app de terceiros** — nem legalmente (Genius não detém os direitos das letras e proíbe uso comercial) nem tecnicamente (a API não entrega a letra). Sem suporte oficial a sincronização.

**LRCLIB (lrclib.net).** Base aberta e gratuita de letras, focada em **letras sincronizadas (LRC, com timestamps)** — ideal para funcionalidade de karaokê/leitura acompanhada. **Sem chave de API, sem registro, sem rate limit.** Retorna `plainLyrics` e `syncedLyrics`, com match por artista+título+álbum+duração (a duração deve bater, com tolerância de ±2s). Boa cobertura, incluindo muitos hits. Descrito pelos próprios usuários como "uma Library Genesis para letras" — ou seja, **é crowd-sourced e não licenciado**; juridicamente é uma zona cinzenta. Wrappers de código são MIT/ISC (licença do *software*, não das letras). Precisão variável (crowd-sourced, sem revisão editorial garantida; letras são permanentes/imutáveis via API). Excelente para MVP/uso pessoal; risco jurídico para produto comercial.

**Lyrics.ovh (não oficial, gratuito).** API simples que busca resultados via Deezer e retorna a letra por artista+título. Gratuita, sem custo. **Cobertura e confiabilidade limitadas e instáveis** (projeto pessoal open-source; frequentemente listada como "dead/deprecated" em agregadores). **Sem licenciamento** — mesmo risco jurídico das demais fontes gratuitas. **Não suporta letras sincronizadas.** Adequada só para experimentos.

**Happi.dev (não oficial, freemium).** API de letras (em Beta) com cobertura de "milhões" de músicas. Modelo de créditos (1 crédito ≈ US$0,008; compra a partir de US$10 ≈ 1.250 créditos). Os próprios plugins que a consomem avisam: **"Lyrics provided are for educational purposes and personal use only. Commercial use is not allowed."** Ou seja, **não autoriza uso comercial**. Oferece endpoint de letras sincronizadas com timestamps (em segundos). Precisão declarada mas não verificada; cobertura menor que Musixmatch/LyricFind.

**AZLyrics e sites de scraping.** AZLyrics, lyrics.az e similares são sites de exibição cujos ToS **proíbem reprodução/redistribuição** (permitem apenas impressão para uso pessoal e não comercial). Fazer scraping deles acumula **três camadas de risco**: (1) infração dos direitos autorais da composição (do compositor/editora); (2) quebra de contrato/ToS do site; (3) possível violação de leis de acesso não autorizado (CFAA) se contornar barreiras técnicas. **Totalmente inadequado para um app.**

**LyricFind (provedor licenciado B2B).** Pioneiro no licenciamento de letras (primeiro acordo em 2005), hoje é "a fonte confiável de licenciamento". Segundo a A2IM (2024, no 20º aniversário da empresa), a LyricFind tem "partnerships with over 60,000 publishers, licenses for over 200,000 publishing catalogues" e clientes incluindo "TikTok, Amazon, Google, Xperi, YouTube, Pandora, Deezer". A própria empresa cita licenças diretas de "Sony Music Publishing, Universal Music Publishing Group, Warner/Chappell" e "more than 100 platforms". Oferece **LyricDisplay** em três modos: estático (bloco), linha-a-linha (sincronizado) e palavra-a-palavra (karaokê/sing-along). **É a opção mais segura juridicamente e a mais precisa** (base revisada/curada, com royalties pagos aos titulares). Contras para um app pequeno: é B2B, direcionado a plataformas maiores; preço sob negociação (não público); pode ter barreira de entrada para desenvolvedor solo.

**Spotify / Apple Music (letras).** Ambas **exibem letras (licenciadas do Musixmatch/LyricFind), mas NÃO expõem uma API pública de letras** para terceiros. A Spotify Web API oficial retorna metadados de faixa (incl. flag `explicit`), **não a letra**. Projetos que "pegam" letras do Spotify/Apple usam endpoints privados/cookies de sessão — **violam os ToS** ("This project is probably against Spotify TOS. Use at your own risks."; a lib de Apple avisa que usar endpoints privilegiados "is likely to violate Apple's terms"). **Não são um caminho viável nem legal.**

### Boas práticas técnicas de matching

- **Prefira identificadores estáveis a texto livre.** O padrão-ouro da indústria é o **ISRC** (código único da gravação); matching por ISRC atinge ~97% de acerto vs. matching por texto, que falha com versões (studio/live/remaster/remix), homônimos e inconsistências de nome. Onde possível, resolva primeiro o ISRC (via MusicBrainz/distribuidor) e use-o como chave.
- **Para APIs baseadas em texto (LRCLIB, Musixmatch matcher):** normalize e envie **artista + título (+ álbum + duração)**. O LRCLIB usa duração com tolerância de ±2s como desempate — envie a duração sempre que tiver.
- **Trate variações de nome de artista** ("The Weeknd" vs "Weeknd", featurings) com string matching aproximado (fuzzy) e normalização (minúsculas, remoção de pontuação/acentos, remoção de sufixos como "(Remastered)", "feat.").
- **Use o fluxo match-then-fetch** (ex.: `matcher.track.get` no Musixmatch) para resolver a faixa certa antes de buscar a letra; nunca assuma sucesso — verifique o status.
- **Mantenha a chave de API no servidor**, faça cache de *metadados* (não das letras além do permitido pela licença) e implemente fallback entre fontes.

## Recommendations

**Estágio 1 — Protótipo/MVP (validação, sem público amplo):**
Use **LRCLIB** como fonte principal — é gratuito, sem chave, sem rate limit, e entrega letras **sincronizadas (LRC)** perfeitas para o recurso de karaokê. Envie artista+título+duração para maximizar acerto. Isso permite construir e testar toda a funcionalidade sem custo. **Entenda que isto é uma zona cinzenta jurídica** e não deve ser a base de um produto comercial lançado publicamente. Mantenha um fallback (ex.: Happi.dev para uso não comercial) apenas em desenvolvimento.

**Estágio 2 — Lançamento comercial/público:**
Migre para uma **fonte oficialmente licenciada**. Duas rotas:
- **LyricFind** — opção mais segura e mais precisa; suporta os três modos de exibição incluindo sincronizado/karaokê; é quem licencia para Google/Amazon/Deezer. Contate para licença comercial. Ideal se você quer máxima segurança jurídica e cobertura curada.
- **Musixmatch plano comercial** — maior catálogo, boa documentação de developer, suporte a sincronização line/word. Requer licença comercial negociada (preço sob consulta) e obriga exibir o aviso de copyright + disparar o script de tracking.

**Plano B se o custo de licenciamento for proibitivo para um app pequeno/educacional:**
1. **Reduza a superfície de risco:** exiba **apenas trechos curtos/marcados pelo usuário** (não a letra completa) — isso *reduz* (mas não elimina) o risco e fortalece um argumento de uso limitado, especialmente em contexto educacional. Não confie em fair use como salvo-conduto.
2. **Peça licença diretamente às editoras** para um repertório reduzido de músicas muito famosas que você realmente usa (blanket/print license) — viável se o catálogo for pequeno e fixo.
3. **Priorize domínio público / Creative Commons** para parte do conteúdo (obras antigas cuja composição já entrou em domínio público, ou artistas que liberam letras sob CC).

**Benchmarks que mudam a recomendação:**
- Se o app passar a **monetizar** (assinatura, anúncios) ou ultrapassar poucos milhares de usuários → migre imediatamente para fonte licenciada; o risco de takedown/processo da NMPA cresce muito (lembre-se: US$89,774M arrecadados só em 2021).
- Se precisar publicar nas **App Store/Play Store** → a Apple pode exigir "evidência documentada" do direito de usar letras (Guideline 5.2.1); tenha o contrato de licença em mãos.
- Se a cobertura do LRCLIB para seu repertório-alvo cair abaixo do aceitável → teste o Musixmatch (matcher) para medir o ganho de cobertura antes de decidir o investimento.

## Tabela Comparativa

| Provedor | Cobertura (hits em inglês) | Precisão da letra | Licenciamento / risco jurídico | Exibe letra completa ao usuário final? | Custo | Sincronização (LRC/timestamps) |
|---|---|---|---|---|---|---|
| **LyricFind** | Excelente (200K+ catálogos, 60K+ editoras, majors) | Alta (curada, royalties pagos) | **Licenciado oficial** (baixo risco) | **Sim, licenciado** (estático/linha/palavra) | Sob negociação (B2B, não público) | **Sim** (linha-a-linha e palavra-a-palavra) |
| **Musixmatch (comercial)** | Excelente (12M+, 250+ idiomas; 225K+ editoras) | Alta | **Licenciado oficial** (baixo risco no plano comercial) | **Sim, no plano comercial**; grátis só ~30% preview e "não comercial" | Grátis (~2.000 chamadas/dia, 30% preview); comercial sob consulta | **Sim** (line e word-synced, planos pagos) |
| **LRCLIB** | Boa/ampla (crowd-sourced) | Variável (crowd-sourced) | **Não licenciado — zona cinzenta/risco** | Tecnicamente sim, mas sem licença = risco | **Gratuito** (sem chave, sem rate limit) | **Sim** (LRC nativo — ponto forte) |
| **Genius (API oficial)** | Excelente (metadados/anotações) | Variável (crowd-sourced) | API não entrega letra; scraping viola ToS; Genius não detém direitos | **Não** (API não retorna letra; scraping proibido p/ uso comercial) | API gratuita | Não |
| **Happi.dev** | Média ("milhões", Beta) | Declarada, não verificada | **Não comercial** (uso pessoal/educacional apenas) | Sim tecnicamente, mas **uso comercial proibido** | Créditos (~US$0,008/crédito) | Sim (timestamps em segundos) |
| **Lyrics.ovh** | Limitada/instável (via Deezer) | Baixa/variável | **Não licenciado — risco**; projeto instável | Sim tecnicamente, mas sem licença = risco | Gratuito | Não |
| **AZLyrics / scraping** | Ampla | Variável | **Alto risco triplo** (copyright + ToS + CFAA) | Não recomendado | "Grátis" (ilegal na prática) | Não |
| **Spotify / Apple (letras)** | Excelente | Alta (via Musixmatch/LyricFind) | **Sem API pública de letras**; endpoints privados violam ToS | Não (não há API oficial de letra) | N/A | (Interno, não exposto) |

## Caveats

- **Isto não é aconselhamento jurídico.** Direitos autorais de letras são complexos e específicos por jurisdição; antes de lançar comercialmente, consulte um advogado de propriedade intelectual e obtenha as licenças por escrito.
- **Preços de LyricFind e do plano comercial do Musixmatch não são públicos** — são negociados caso a caso; a indicação de "sob consulta" reflete a ausência de tabela pública verificável. Números de preço de terceiros (RapidAPI, enciclopédias geradas por IA) não representam o licenciamento oficial e não foram considerados confiáveis.
- **A qualidade de fontes crowd-sourced (LRCLIB, Genius, Happi) varia por música**; para um app de idiomas onde a *correção* do texto é crítica, valide amostralmente as letras do seu repertório-alvo antes de confiar em qualquer fonte.
- **O cenário está em movimento:** disputa antitruste LyricFind × Musixmatch (2025), acordos de IA das majors com o Musixmatch (out/2025) e a campanha contínua da NMPA podem alterar termos, preços e disponibilidade. Reavalie periodicamente.
- **Nenhuma letra real foi reproduzida** nesta pesquisa, conforme solicitado — o foco foi fontes, licenciamento e recomendações.