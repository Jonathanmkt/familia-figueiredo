# Plataforma de E-mail Multi-Tenant Self-Hosted para Software House: Comparativo Aprofundado e Recomendação

## TL;DR
- **Stalwart Mail Server (Community Edition, AGPL-3.0) é a melhor escolha** para um "Titan self-hosted" administrável 100% via API: é o único candidato que oferece nativamente JMAP + IMAP + SMTP num único binário Rust (~100 MB de RAM ocioso), com API de administração completa baseada em JMAP, CLI declarativa (`stalwart-cli`) ideal para automação/agentes, quotas por caixa, toggle de envio por conta via permissões e automação de DNS no Cloudflare — tudo gratuito.
- **Atenção crítica de licenciamento:** a "multi-tenancy" formal da Stalwart (isolamento de tenants, admins e quotas por tenant, branding) é recurso **pago (Enterprise)**. Porém, hospedar múltiplos domínios de clientes, cada um com caixas próprias, chaves DKIM próprias, quota por caixa e envio controlável por conta **é permitido e gratuito** na Community Edition sob AGPL-3.0 — e a AGPL **não proíbe revenda/hospedagem para terceiros**. A obrigação da AGPL só se aplica se você **modificar** o código e oferecê-lo como serviço em rede: nesse caso deve disponibilizar o fonte modificado.
- **O maior risco não é software, é entregabilidade:** um único IP compartilhado entre muitos clientes cria "efeito vizinho ruim" — um cliente com spam/bounces pode derrubar a reputação de todos. Planeje IP dedicado/pools para clientes de alto volume, limites de envio por tenant, monitoramento de blocklists, e confirme que a porta 25 de saída da VPS está liberada. Todos os registros de e-mail no Cloudflare devem ficar em **"DNS only" (nuvem cinza)** — o Cloudflare não faz proxy de SMTP.

## Key Findings

**1. Multi-tenant / multi-domínio (requisito central).** Todos os candidatos hospedam múltiplos domínios com N caixas. A diferença está no *isolamento*:
- **Stalwart CE**: hospeda domínios ilimitados, cada um com caixas e DKIM próprios, quota por caixa (`maxDiskQuota`). Isolamento formal de tenant (admins/quotas por tenant, branding) é Enterprise. O próprio fundador resume: "Stalwart has multiple domain support in core, it's multitenancy (each with their own set of domains) that's in enterprise."
- **mailcow**: multi-domínio maduro, com "domain admins" delegados; isolamento entre domínios no webmail SOGo existe mas exige atenção (`SOGoDomainsVisibility`, isolados por padrão).
- **Modoboa**: papel "Reseller" nativo (admin que cria domínios e delega a domain admins com pools de recursos) — o modelo de revenda mais explícito do conjunto, na edição gratuita.
- **Mailu**: multi-domínio com admins de domínio; isolamento mais simples.
- **docker-mailserver / Maddy**: multi-domínio "flat", sem conceito de tenant/admin delegado.

**2. API/CLI de administração (requisito crítico).**
- **Stalwart**: desde a v0.16 (2026) toda a administração é feita via **JMAP** (objetos `x:Domain`, `x:Account`, `x:AccountPassword`, etc. sob a capability `urn:stalwart:jmap`) no mesmo endpoint `/jmap`; a REST API antiga foi removida ("In v0.16, the REST API is gone. Every configuration and management action is now a JMAP object, reachable through the same /jmap endpoint"). Há `stalwart-cli` schema-driven com comando `apply` declarativo (IaC) — a própria Stalwart posiciona: "This fits naturally with Ansible, Terraform, NixOS... follows the same pattern used by projects like CockroachDB, Consul, Elasticsearch, and HashiCorp Vault", e "The new CLI is also a very pleasant surface for AI agents. Because every operation maps to a well-defined JMAP object with a clear schema, agents can discover capabilities, plan changes, and apply them idempotently." Cobre domínios, contas, senhas, quotas.
- **mailcow**: **REST API** documentada (Apiary/Swagger em demo.mailcow.email), cobre domínios, mailboxes, senhas, quotas, DKIM, aliases, toggles; SDK community `mailcow-api` (npm) e CLI de terceiros `mailcowctl`. É a API REST mais madura e "pronta" do conjunto.
- **Mailu**: **REST API** oficial com Swagger embutido (`/api/v1`), "tudo que se faz na UI se faz na API"; também CLI `flask mailu` e import/export declarativo YAML.
- **Modoboa**: **REST API** (token-based, Swagger em `/api/schema-v2/swagger/`).
- **docker-mailserver**: sem API HTTP; administração via script `setup.sh`/`docker exec` (CLI apenas).
- **Maddy**: sem API HTTP; CLI `maddyctl`/`maddy` (creds + imap-acct), não declarativo.

**3. JMAP vs IMAP para webmail próprio futuro.**
- **Stalwart é o único com JMAP nativo** (RFC 8620/8621), além de IMAP4rev2 e uma API HTTP. É o backend ideal para construir um webmail moderno tipo Gmail. Ecossistema JMAP: bibliotecas cliente `jmap-client-ts` (TypeScript), `jmap-js` (Fastmail), `jmapc` (Python), Rust, e o `jmap-demo-webmail` como base.
- **Todos os demais (mailcow, Mailu, Modoboa, docker-mailserver, Maddy) são IMAP-only** (via Dovecot, exceto Maddy que tem IMAP próprio em beta). Um webmail próprio sobre eles teria de falar IMAP/SMTP no backend — viável, mas sem os ganhos de JMAP (batch, push, JSON).

**4. Webmail embutido (solução interina).**
- **mailcow**: SOGo (groupware completo, ActiveSync) + Roundcube. O mais completo.
- **Mailu**: Roundcube/SnappyMail incluídos.
- **Modoboa**: webmail próprio + Roundcube.
- **Stalwart**: **não traz webmail de usuário embutido** (só o painel de administração web). Precisa plugar Roundcube/SnappyMail via IMAP como interino, ou construir sobre JMAP.
- **Maddy**: nenhum webmail (o setup da comunidade adiciona Roundcube à parte).

**5. Envio SMTP opcional por tenant/caixa.**
- **Stalwart**: controlável por conta via `enabledPermissions`/`disabledPermissions` (permissão de "Send emails"/"Authenticate"); remover a permissão retorna "550 5.7.1 Your account is not authorized to use this service". Grátis na CE. Também há quota `maxEmailSubmissions`.
- **mailcow**: ativar/desativar envio via ACLs/sender_acl, rate limits por domínio e por mailbox, e credenciais SMTP por caixa.
- **Mailu / Modoboa**: controle por usuário (enable/disable send) e limites por domínio.
- **docker-mailserver / Maddy**: controle mais grosso (config), não por conta via API.

**6. Antispam/antivírus inbound.**
- **mailcow**: Rspamd + ClamAV + greylisting + DNSBL + SPF/DKIM/DMARC — o mais completo "de fábrica".
- **Modoboa**: Rspamd ou SpamAssassin + Amavis + ClamAV.
- **Mailu**: Rspamd + ClamAV opcional + greylisting.
- **docker-mailserver**: SpamAssassin/Rspamd + ClamAV + Postgrey + Fail2ban.
- **Stalwart**: classificador estatístico embutido + DNSBL + greylisting + reputação de remetente + proteção anti-phishing, tudo inline (sem daemon separado); ClamAV/Rspamd externos via milter/MTA hooks. Classificador por IA/LLM é Enterprise.
- **Maddy**: SPF/DKIM/DMARC/DANE; antispam via rspamd externo, sem antivírus embutido.

**7. Licenciamento — veredito por candidato:**
- **Stalwart**: dual-license AGPL-3.0 (Community) + SELv2 (Enterprise, proprietária). AGPL permite uso comercial e revenda/hospedagem para terceiros. A obrigação de disclosure de fonte só é acionada se você **modificar** o servidor e oferecê-lo como serviço em rede. A SELv2 (paga, atualizada 29/03/2026) diz no §2.3: "Licensee may install and operate the Software on an unlimited number of servers within its organization, host an unlimited number of domains, and host data for an unlimited number of external organizations (tenants)... However, Licensee is expressly prohibited from reselling, leasing, sublicensing, or otherwise redistributing the Software itself." O tier é "determined solely by the total number of Mailboxes provisioned."
- **mailcow**: código sob licença permissiva/GPL, uso comercial livre; a marca "mailcow" tem termos próprios, mas rodar e revender e-mail é permitido.
- **Mailu**: MIT — sem restrição de uso comercial/revenda.
- **Modoboa**: MIT/ISC — sem restrição; há edição "Pro" paga apenas para add-ons de conveniência (branding/white-label, provisionamento de virtual hosts).
- **docker-mailserver**: MIT — sem restrição.
- **Maddy**: GPL-3.0 — uso comercial livre; sem cláusula de rede (é GPL, não AGPL).

**8. Docker/Swarm + Traefik e footprint.**
- **Atrito conhecido Traefik × SMTP**: a porta 25 é protocolo "server-first" (o servidor fala primeiro), e o roteamento TCP do Traefik depende de ver bytes do cliente (ClientHello TLS para SNI). Em porta 25 sem TLS, o Traefik pode nunca disparar o backend ou bufferizar o banner (documentado em issue do Traefik #11302 e discussões da Stalwart/docker-mailserver). **Recomendação forte: NÃO passar SMTP/IMAP puros pelo Traefik** — publicar as portas de e-mail direto no host (ou usar HAProxy/nginx stream para camada 4, que lidam bem com server-first protocols), e usar o Traefik apenas para o HTTP/HTTPS (webmail, painel, JMAP/API).
- **Footprint**: Stalwart ~100 MB RAM ocioso ("When idle, it maintains a low memory footprint of approximately 100MB"; com cache habilitado o fundador cita ~150 MB, crescendo até o limite dos caches). mailcow ~1,5 GB+ (Postfix+Dovecot+Rspamd+SOGo+MySQL+Redis+etc.). Modoboa ~1 GB (2 GB com ClamAV). Mailu intermediário. Maddy e docker-mailserver leves.

## Details

### Isolamento e o dilema "multi-tenancy" da Stalwart
A Stalwart comercializa "multi-tenancy" (isolamento de tenants, admins/quotas por tenant, branding white-label, backends de diretório por domínio) como recurso **exclusivo Enterprise**. Isso assustou parte da comunidade. Mas, para o cenário de uma software house, a distinção prática importa: **multi-domínio** (hospedar clientA.com, clientB.com, cada um com caixas e DKIM próprios) é **gratuito na Community Edition**; o que é pago é o **modelo formal de tenant** — fronteiras administrativas em que um "cliente-admin" só enxerga o próprio tenant, com quota agregada por tenant e branding por tenant.

Confirmado pela pesquisa (docs oficiais e página Compare): na CE gratuita você tem (a) domínios ilimitados com caixas e DKIM por domínio; (b) quota **por caixa** (`maxDiskQuota`) — só a quota **por tenant** é Enterprise (o objeto `Tenant` em si é Enterprise-only); (c) controle de envio por conta via permissões (`enabledPermissions`/`disabledPermissions`, permissões "Send emails"/"Authenticate"); (d) automação de DNS no Cloudflare; (e) toda a API de administração JMAP + `stalwart-cli`. O que você perde sem pagar: isolamento de tenant, admins delegados por tenant, branding por tenant, backends de diretório por domínio, spam por IA, arquivamento/undelete, telemetria ao vivo/dashboards e read replicas/sharding.

Como a software house administra tudo pelas **suas próprias ferramentas via API** (não entrega painel ao cliente final), a ausência de "admins delegados por tenant" é pouco relevante: o isolamento lógico (cada domínio com suas caixas, senhas e DKIM) é suficiente, e o controle de acesso fica na camada de automação da software house.

### Licenciamento AGPL na prática (ponto não-negociável)
A AGPL-3.0 **não impede** oferecer o software como serviço a clientes pagantes, nem cobra royalties. Rodar o Stalwart *sem modificar* para hospedar e-mail de terceiros **não aciona nenhuma obrigação de disclosure** (a própria Stalwart: "running unmodified Stalwart, or using it internally, does not trigger any source-disclosure requirement"). A cláusula de uso em rede (AGPLv3 §13) só é acionada se você **modificar** o código do servidor e disponibilizar essa versão modificada como serviço em rede — aí você deve oferecer o fonte modificado aos usuários daquele serviço. Implicação: mantenha customizações **fora** do binário do servidor (ex.: seu webmail e sua camada de provisionamento são programas separados que falam JMAP/IMAP/SMTP — esses não são "obra derivada" do servidor e não herdam AGPL). Se precisar modificar o núcleo e não quiser publicar, a saída é a licença Enterprise (SELv2) paga, que também **proíbe revender o software em si** mas libera hospedar dados de organizações externas ilimitadas.

Os demais candidatos (Mailu MIT, Modoboa MIT/ISC, docker-mailserver MIT, Maddy GPL-3.0, mailcow) não têm qualquer trava de revenda/hospedagem para terceiros.

### Entregabilidade multi-domínio num IP compartilhado
- **SPF/DKIM/DMARC**: cada domínio de cliente precisa de SPF (autorizando o IP do servidor), uma chave **DKIM própria por domínio**, e DMARC. Stalwart, mailcow, Mailu e Modoboa geram DKIM por domínio automaticamente.
- **rDNS/PTR**: com um IP servindo muitos domínios, o PTR deve apontar para um **hostname neutro da infraestrutura** (ex.: `mx1.suasoftwarehouse.com`), que também é o HELO/EHLO do servidor — nunca para o domínio de cada cliente. O SPF/forward-confirmed rDNS valida contra esse hostname.
- **Reputação de IP compartilhada — risco central**: mailbox providers (sobretudo Outlook/Microsoft) aplicam a reputação do "pior remetente" ao IP inteiro. Um cliente com listas ruins, spam traps ou bounces altos pode fazer o IP ser listado (Spamhaus etc.), derrubando a entrega de **todos**. Mitigações: (a) **IPs dedicados ou IP pools** por perfil de risco/volume — clientes grandes ou sensíveis em IP próprio; (b) **limites de envio por tenant/caixa** (rate limits) e warm-up; (c) **monitoramento de blocklists** e Postmaster Tools; (d) segregar clientes "novos/arriscados" em pool separado. Como a maioria dos sites de clientes só **recebe** (não envia), o subconjunto que envia via SMTP é pequeno — concentre o cuidado de reputação nele.
- **Porta 25 de saída**: muitos provedores de VPS bloqueiam a 25 de saída por padrão. AWS EC2 bloqueia desde 2020 (sem desbloqueio desde então). A DigitalOcean bloqueia por padrão desde 22/06/2022 ("Our new disabled-by-default SMTP policy goes into effect today, June 22, 2022, for all new accounts"; as portas 25, 465 e 587 são bloqueadas nos Droplets, inclusive via Reserved IP). Azure bloqueia em vários planos. Teste com `telnet alt1.gmail-smtp-in.l.google.com 25` ou `nmap -p25` — se der timeout/"filtered", está bloqueada. Solução: pedir desbloqueio ao provedor (Hetzner/OVH/Contabo costumam liberar; alguns exigem KYC), ou usar relay autenticado na porta 587 (SES, etc.). Note que o **recebimento** (porta 25 de entrada) normalmente não é bloqueado.
- **Cloudflare NÃO faz proxy de SMTP**: registros MX e TXT nunca são proxied (por design). Registros A/CNAME de `mail`, `smtp`, `imap`, `mx` devem ficar em **"DNS only" (nuvem cinza)** — proxied (nuvem laranja) quebra e-mail silenciosamente. O único registro de e-mail que pode ser proxied é o A do webmail (interface HTTPS). O Cloudflare só proxeia HTTP/S; SMTP via Cloudflare exigiria Spectrum (não é o caso).

### Segurança, privacidade e operação
- **TLS**: todos suportam TLS em SMTP/IMAP; Stalwart faz ACME nativo (inclusive DNS-01 no Cloudflare) e atualiza TLSA/DANE automaticamente.
- **Criptografia em repouso**: Stalwart suporta cripto em repouso por caixa com S/MIME ou OpenPGP do usuário (operador com acesso ao disco não lê). Os demais dependem de cripto de disco do host.
- **Backup**: fazer backup das caixas (maildir/blob store), do banco de configuração e, crucialmente, das **chaves DKIM privadas por domínio** — perdê-las quebra assinatura e exige rotação. Na Stalwart v0.16 as chaves DKIM ficam no banco de dados (um backup cobre tudo).
- **LGPD/GDPR**: hospedar e-mail de terceiros significa processar dados pessoais dos clientes dos clientes — a software house é operadora/sub-operadora; contratos de processamento de dados, retenção, cripto e localização (VPS em jurisdição adequada) devem ser tratados.
- **Ponto único de falha / superfície de risco**: concentrar e-mail de muitos clientes num servidor único aumenta o impacto de uma falha ou comprometimento. Considere backups testados, e para escala, o clustering nativo da Stalwart (coordenação P2P ou via Redis/NATS/Kafka; suporte a Docker Swarm/Kubernetes).

### Tabela comparativa

| Critério | **Stalwart CE** | **mailcow** | **Mailu** | **Modoboa** | **docker-mailserver** | **Maddy** |
|---|---|---|---|---|---|---|
| Multi-tenant real (isolamento) | Multi-domínio grátis; tenant formal = Enterprise | Bom (domain admins; isolamento SOGo exige config) | Médio (domain admins) | **Melhor da edição grátis** (papel Reseller nativo) | Flat, sem tenant | Flat, sem tenant |
| API/CLI admin | **JMAP + stalwart-cli declarativo** (ideal p/ automação/IA) | **REST madura** + SDKs + mailcowctl | REST + Swagger + CLI | REST (token) | Só CLI (setup.sh) | Só CLI (maddyctl) |
| JMAP vs IMAP (webmail próprio) | **JMAP nativo + IMAP + API HTTP** | IMAP (Dovecot) | IMAP (Dovecot) | IMAP (Dovecot) | IMAP (Dovecot) | IMAP próprio (beta) |
| Webmail embutido | Não (só painel admin) | **SOGo + Roundcube** | Roundcube/SnappyMail | Webmail próprio + Roundcube | Não | Não |
| Envio SMTP toggleável por caixa/domínio | Sim, por permissões (grátis) | Sim (ACL/rate limit) | Sim (por usuário) | Sim (por usuário) | Grosso (config) | Grosso (config) |
| Antispam/antivírus | Classificador+DNSBL+greylist inline; IA=Enterprise; ClamAV externo | **Rspamd + ClamAV completo** | Rspamd + ClamAV | Rspamd/SA + Amavis + ClamAV | SA/Rspamd + ClamAV | SPF/DKIM/DMARC; rspamd externo |
| Licença / revenda | AGPL-3.0 (revenda OK); Enterprise pago p/ tenant/branding | Permissiva (revenda OK) | **MIT** | **MIT/ISC** | **MIT** | GPL-3.0 |
| Docker/Swarm | Sim (Swarm/K8s nativo) | Docker Compose (Swarm não oficial) | Sim (Swarm/K8s) | Sem Docker oficial (bare-metal) | Sim | Sim (Compose/Swarm) |
| Footprint RAM | **~100 MB ocioso** | ~1,5 GB+ | ~1 GB | ~1–2 GB | Leve | Muito leve |
| Maturidade/atividade | Alta, muito ativa; pré-1.0 (mudanças de schema) | **Muito madura, grande comunidade** | Madura | Madura (desde 2009) | Madura | Jovem; IMAP beta |

## Recommendations

**Fase 0 — Prova de conceito (agora):**
1. **Escolha Stalwart CE** se o objetivo estratégico é o webmail próprio via JMAP e automação por API/agentes — que é exatamente o caso descrito. **Escolha mailcow** se você precisa de webmail pronto (SOGo) hoje, antispam completo de fábrica e a API REST mais madura, e aceita footprint maior. Como a software house prioriza (1) recebimento real, (2) automação total via API e (3) webmail próprio JMAP no futuro, **Stalwart vence**.
2. Provisione uma VPS com **porta 25 de saída liberada** (Hetzner/OVH/Contabo; teste com `nmap -p25`/`telnet`). Configure PTR para hostname neutro (`mx1.infra-suasoftwarehouse.com`).
3. Suba o Stalwart em Docker, publique portas de e-mail **direto no host** (evite Traefik na 25/143/993/587/465); use Traefik só para HTTPS do painel/JMAP/webmail.

**Fase 1 — Provisionamento automatizado:**
4. Construa a camada de automação chamando a **API JMAP** (`urn:stalwart:jmap`) ou `stalwart-cli apply` (declarativo): criar domínio → gerar DKIM → criar caixas com senha e `maxDiskQuota` → definir permissão de envio por caixa.
5. Integre a **automação de DNS no Cloudflare** (nativa na CE): Stalwart publica/sincroniza MX, SPF, DKIM, DMARC, TLSA via API do Cloudflare. Garanta **todos em "DNS only"**.
6. Webmail interino: plugue **Roundcube/SnappyMail** via IMAP enquanto o webmail JMAP próprio não fica pronto.

**Fase 2 — Escala e entregabilidade:**
7. Comece com IP compartilhado; ao passar de ~50 mil e-mails/mês de um cliente, ou para clientes sensíveis, migre-o para **IP dedicado/pool**. Aplique rate limits por caixa/domínio e warm-up.
8. Monitore blocklists (Spamhaus) e Google/Microsoft Postmaster Tools; tenha runbook de delisting.

**Benchmarks que mudam a decisão:**
- Se precisar de **isolamento formal de tenant, admins por cliente e branding white-label** desde já → avalie a **Stalwart Enterprise** (por mailbox) ou **Modoboa** (Reseller grátis) / **mailcow** (domain admins).
- Se **não puder modificar o núcleo sem publicar fonte** e quiser customizar profundamente o servidor → Stalwart **Enterprise (SELv2)** ou um candidato MIT (Mailu/docker-mailserver).
- Se a equipe **não quer construir webmail** e quer groupware pronto (calendário/contatos/ActiveSync) → **mailcow**.

### Esboço de arquitetura proposta (Stalwart CE)

**Modelo de isolamento por cliente/tenant.** Como o isolamento formal de tenant é Enterprise, use isolamento *lógico por domínio* na CE: cada cliente = 1 (ou N) domínio(s) Stalwart, com suas caixas, senhas e chave DKIM. O "tenant" existe na camada de automação da software house (um mapeamento cliente→domínios→caixas no seu banco de dados de gestão), não dentro do Stalwart. O acesso administrativo fica só com a software house (nenhum cliente recebe credencial de admin do servidor).

**Estratégia de domínios e chaves DKIM.** Um único hostname neutro de servidor (`mx1.infra-suasoftwarehouse.com`) serve de MX/HELO/PTR para todos os domínios. Cada domínio de cliente recebe seletor e chave DKIM próprios, gerados e rotacionados automaticamente pelo Stalwart e publicados no Cloudflare. SPF de cada domínio autoriza o IP (ou pool) do servidor; DMARC com `rua` apontando para um endereço de coleta da software house.

**Fluxo de provisionamento automatizado (via API):**
1. Cliente contratado → seu sistema chama a API do Cloudflare (ou delega ao Stalwart) para criar a zona/registros do domínio em "DNS only".
2. Chamada JMAP/`stalwart-cli apply` cria o `x:Domain`, dispara geração de DKIM e sincroniza MX/SPF/DKIM/DMARC/TLSA no Cloudflare.
3. Para cada caixa: cria `x:Account` (endereço = e-mail completo), define `x:AccountPassword`, define `maxDiskQuota`.
4. **Toggle de envio**: caixas de webapps que enviam recebem a permissão "Send emails" habilitada (e, se quiser, credencial/app-password de submissão dedicada na 587/465); caixas de sites que só recebem têm a permissão de envio/autenticação desabilitada — retornam "550 not authorized" se tentarem submeter. Isso permite ligar/desligar envio por caixa (ou por grupo/role para um domínio inteiro) sem tocar em config de arquivo.
5. Verificação: teste de recebimento (envia externo → caixa) e, para caixas de envio, teste de entrega + checagem de blocklist antes de liberar ao cliente.

**Como o envio opcional se encaixa:** o SMTP submission (587/465) é habilitado seletivamente por caixa via permissões; o SMTP de recebimento (25) fica sempre aberto para todos os domínios. Clientes de alto volume de envio podem ser roteados por um IP/pool dedicado (mitigando reputação compartilhada), enquanto os demais ficam no IP padrão — a escolha do IP de saída é parte do fluxo de provisionamento da caixa.

## Caveats
- **Stalwart é pré-1.0**: apesar de "feature complete", houve mudanças de schema disruptivas (ex.: v0.15→v0.16 removeu a REST API em favor de JMAP; a antiga CLI de domínios/contas foi descontinuada). Fixe versões, teste upgrades e leia os guias de UPGRADING.
- A fronteira **CE vs Enterprise** da Stalwart pode mudar; a própria empresa promete "não fazer rug pull" e manter recursos existentes sob AGPL, mas isso é compromisso, não garantia contratual. Valide a página `stalw.art/compare` na data da implantação.
- **Nenhuma ferramenta resolve reputação de IP sozinha** — a entregabilidade num modelo multi-cliente é um problema operacional contínuo, não de configuração inicial.
- O suporte a **Docker Swarm** varia: nativo/anunciado na Stalwart e Mailu; mailcow foca em Docker Compose single-host (Swarm não é oficialmente suportado); Modoboa não tem via Docker oficial (instalação bare-metal com Postfix/Dovecot).
- Detalhes de licença de marca do mailcow e termos exatos de add-ons pagos (Modoboa Pro, ofertas comerciais do mailcow) devem ser confirmados diretamente nos sites oficiais antes de contrato comercial.
- A informação de bloqueio de porta 25 por provedor muda com o tempo e por tipo de conta; confirme a política vigente e teste na sua VPS específica antes de prometer envio a clientes.