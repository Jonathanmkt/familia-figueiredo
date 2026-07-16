# Plano — VirtueTech E-mail (plataforma de e-mail multi-cliente)

> Documento **vivo**. **Reorganizado em 2026-07-16** para refletir o produto real (serviço de
> e-mail para vários clientes), não só o PoC. Base técnica: DR [`docs/drs/smt.md`](../drs/smt.md).
> Infra provada no **Marco 0 (PoC ✅)**.

---

## 🎯 Visão do produto

Um **serviço de e-mail hospedado** que a VirtueTech (software house) opera para seus clientes.
Três camadas, três públicos:

1. **Software house (você, dev/admin):** um **painel de gestão** onde você provisiona clientes,
   cria as caixas e configura o **SMTP de envio** dos apps deles. Só você acessa. Os clientes
   **nunca** veem SMTP/infra.
2. **Cliente (não-dev):** quer duas coisas — **ler os e-mails que chegam** (um **webmail estilo
   Gmail**) e que **o app dele dispare e-mails que chegam de verdade**. Não conhece nem precisa
   conhecer SMTP.
3. **Infra (Stalwart + DNS + entregabilidade):** o que o PoC já provou, agora multiplicado por N
   clientes, com isolamento lógico e reputação cuidada.

**Analogia:** é o "Gmail/Workspace da VirtueTech" — você é o provedor; o cliente só usa a caixa.

---

## 🏛️ Arquitetura de deploy (decisão técnica — 2026-07-16)

Diretriz do Jonathan: **tudo no mesmo repo e na mesma VPS**, serviços se comunicando pela **rede
interna** (overlay), **DB próprio dentro da rede**, nada exposto além do necessário. Claude decide
o técnico; Jonathan decide o negócio; dúvidas de VPS → prompt pro agente.

```
                       Internet
                          │  (só HTTPS, via Traefik)
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   webmail            admin (gestão)     mail-admin (painel Stalwart)
 (apps/webmail)     (apps/admin)              │
        │                 │                   │
        └──────── rede overlay interna ───────┴─── stalwart (25/465/993 no host)
                 │              │
                 ▼              ▼
             postgres        (JMAP http://stalwart:8080/jmap — interno, não público)
           (interno, sem Traefik, sem porta pública)
```

- **DB:** **PostgreSQL** (serviço Swarm, rede interna, volume próprio) + **Drizzle ORM** (TS).
- **Comunicação interna:** apps → Postgres (protocolo pg) e apps → Stalwart JMAP **pela overlay**
  (`stalwart:8080`), não pela URL pública. Só webmail/admin/painel passam pelo Traefik.
- **Deploy:** Swarm + Traefik (padrão da casa), executado pelo agente/Jonathan; Claude entrega os
  stacks/código.

---

## 📡 Status da infra (agente, 2026-07-16)

**Pronto/testado:** Postgres `virtuemail-db` 1/1 healthy, interno, `postgres:5432` na rede
`virtuemail` (testado). Stalwart na `Singanet`, alcançável em `http://stalwart:8080/jmap/`
(testado). Payloads JMAP **todos testados** (Domain/Account query+get+set create+destroy, DKIM).
Padrão de deploy conhecido: GHCR + GitHub Actions → `docker stack deploy /opt/<app>/stack.yml`,
Traefik por labels (`websecure`+`letsencryptresolver`, port 3000), env_file. Apps Next pra espelhar:
familia-figueiredo. ⚠️ GHCR nasce privado → tornar público.

**Pendências (destravam o app):**
- **Migration:** DB está **vazio** — aplicar `packages/db/drizzle/0000_*.sql` (agente roda meu SQL,
  ou migrate-on-deploy).
- **Conta de serviço Stalwart:** por ora usamos a **recovery admin** (dívida técnica: criar conta
  de gestão dedicada antes de produção).
- **⚠️ Token Cloudflare / DNS:** token atual é **só `virtuetech.com.br`**, sem `Zone:Create`. App
  **não cria zonas de cliente** ainda. `cf_dns.py` é a fonte única de DNS do agente → **não escrever
  na API em paralelo**. → **Decisão de política do Jonathan** (ver abaixo).
- **@type do toggle de envio:** ainda não descoberto (não bloqueia onboarding).

## 🧩 Modelo de arquitetura (rascunho — a refinar nas perguntas)

**Hierarquia lógica (o "tenant" vive na nossa automação, não no Stalwart CE):**

```
Cliente (tenant)                      ← entidade de negócio (no NOSSO banco de gestão)
 └── Domínio(s)  ex.: acme.com.br      ← 1+ domínio no Stalwart, DKIM próprio
      ├── Caixa principal  contato@    ← mailbox (lê/envia no webmail)
      ├── Caixas de colaboradores      ← mailboxes extras (lêem/enviam no webmail)
      └── Conta de envio do app  noreply@ / app@  ← mailbox SÓ p/ o app disparar SMTP
                                        (credencial fica COM VOCÊ, no app do cliente)
```

**Superfícies (frontends):**
- **Webmail do cliente** → em `email.virtuetech.com.br` (a construir; Stalwart não traz webmail).
- **Painel de gestão** (software house) → provisiona cliente→domínio→caixas→conta de envio.
  Hoje existe só o **painel admin do Stalwart** (baixo nível); o nosso painel é uma camada acima.

**Envio de e-mail pelos apps dos clientes:**
- Cada app do cliente recebe **credenciais SMTP de uma conta de envio** que **você** configura no
  app dele. O cliente não vê. O toggle de envio por caixa (permissões do Stalwart) liga/desliga.

---

## 🗺️ Roadmap por marcos

### ✅ Marco 0 — PoC (CONCLUÍDO 2026-07-16)
Provado ponta a ponta: **enviar** (Stalwart→Gmail, inbox/250), **receber** (Gmail→caixa, ham),
**round-trip** (resposta, auth pass), **PTR/FCrDNS** e **blocklists** limpos. Stalwart v0.16.13 no
ar (Contabo, Swarm, Traefik). Detalhes no Apêndice A.
- [ ] 0.f **Backup das chaves DKIM** (agente: `tar` do volume `stalwart-data` → `/opt/backups/` + cópia fora da VPS) ⬅️ **fazer já**

### 🔜 Marco 1 — Webmail do cliente (`email.virtuetech.com.br`)
Fork de **root-fr/jmap-webmail** (MIT) falando JMAP com o Stalwart.
- [x] 1.1a Fork trazido pro monorepo em `apps/webmail` (`@virtuetech/webmail`); `.git`/lock removidos,
  husky neutralizado; workspace instala limpo ✅
- [x] 1.1b Descoberto como conecta: env **`JMAP_SERVER_URL`** (runtime) + auto-discovery OAuth via
  `.well-known` — apontar pro nosso Stalwart é trivial ✅
- [ ] 1.1c Rodar local apontando pro Stalwart e logar com caixa de teste (`admin@mail-test`)
- [ ] 1.2 Deploy do frontend em `email.virtuetech.com.br` (Swarm/Traefik)
- [ ] 1.3 Avaliar o que já vem pronto e o gap p/ "estilo Gmail"
- [ ] 1.4 Branding VirtueTech; multi-tenant (cada cliente vê só o dele)
- [ ] 1.5 TLS válido nas portas de e-mail (Marco 3) p/ o cliente JMAP/IMAP não reclamar
- [ ] _pend._ Alinhar versões vitest/vite do webmail (aviso de peer-dep, não bloqueia)

### 🏗️ Marco 1.0 — Fundação: monorepo + core + adaptadores ✅ (2026-07-16)
Repo `C:\Projetos\APPS\virtuetech-email` (pnpm workspaces). "Comecei pela lógica", como pedido.
Estrutura atual:
```
packages/core/       lógica (domínio + portas + Provisionador + fakes) — testes 4/4 ✅
packages/db/         PostgreSQL + Drizzle (RepositorioPostgres) ✅
packages/dns/        CloudflareDns (PortaDns, API v4) ✅
packages/stalwart/   ClienteJmap + AdaptadorStalwartJmap (payloads reais) — zonefile testado ✅
packages/composicao/ criarNucleo() — composition root (liga tudo) ✅
apps/admin/          painel Next.js 16 — onboarding + caixas + migrate-on-deploy — BUILDA ✅
apps/webmail/        fork root-fr (MIT) — BUILDA ✅
deploy/              stacks (postgres/admin/webmail) + Dockerfiles + prompts do agente
.github/workflows/   build-images.yml (GHCR)
```
> Docs canônicas agora no próprio repo: `virtuetech-email/docs/PLANO.md` (cópia) + `README.md`.
- [x] Scaffold + `core` (portas & adaptadores) + testes 4/4 + type-check limpo de todos os pacotes.
- [ ] ⏳ Migrar `PLANO.md`/`docs/` pra este repo (housekeeping; mantido no Família Figueiredo p/ não quebrar o Artifact vivo).

### 🔜 Marco 2 — Provisionamento real + painel de gestão
Ligar a lógica do core na infra real e dar UI.
- [x] 2.1 Modelo de dados de gestão (cliente ↔ domínios ↔ caixas) — no `core` ✅
- [x] 2.4 **Persistência real** `RepositorioGestao` → `packages/db` (**PostgreSQL + Drizzle**);
  schema + `RepositorioPostgres` + **migration gerada** (`drizzle/0000_*.sql`), type-check ok ✅
- [x] **Infra DB (agente)** — Postgres `virtuemail-db` no ar, overlay `virtuemail`, **sem porta
  pública**, conexão psql validada. `DATABASE_URL=postgres://virtuemail:<senha>@postgres:5432/virtuemail` ✅
- [x] 2.2 Adaptador real `PortaStalwart` → `packages/stalwart` com **payloads reais** (captura do
  agente): `x:Domain/set` (DKIM automático), `x:Domain/get`→`dnsZoneFile` (parser DKIM **testado**),
  `x:Account/set` (`@type:"User"`, credentials/domainId), resolver ids, remover, senha. Type-check ok ✅
  - ⏳ **1 pendência não-bloqueante:** `definirEnvioHabilitado` — falta o `@type` do override de
    permissões (o `"Custom"` foi rejeitado). Onboarding (domínio+conta+DKIM) **não** depende disso.
- [x] 2.3 Adaptador real `PortaDns` → `packages/dns`: **CloudflareDns** (API v4, upsert idempotente
  sem clobber, sempre `proxied:false`). Cloudflare direto (produto autossuficiente). Type-check ok ✅
- [x] 2.6 **Composition root** → `packages/composicao`: `criarNucleo(config)` liga core + Postgres +
  Cloudflare + Stalwart (GeradorUuid + RelogioReal). Type-check ok ✅
- [x] 2.5 **Painel `apps/admin`** (Next.js 16) — onboardar cliente/domínio + criar caixas via server
  actions sobre o `Provisionador`. Type-check ok ✅
  - [x] **Deploy-prep (validado por build real):** Dockerfiles de `admin` + `webmail` (Next standalone
    monorepo) — **`pnpm build` dos dois PASSA** ✅. `next.config` standalone, `.dockerignore`, stacks
    (`deploy/admin.stack.yml` c/ basicauth de borda, `deploy/webmail.stack.yml`), **CI** GHCR
    (`.github/workflows/build-images.yml`), **migrate-on-deploy** (admin aplica o schema no boot),
    health endpoint, README. Type-check -r + testes 7/7 ✅
  - [ ] ⏳ **Só falta ops (agente/Jonathan):** token CF amplo+accountId, A record `admin.…`, repo no
    GitHub + CI rodando + **GHCR público**, deploy dos stacks, conta de serviço Stalwart.
  - [ ] TODO conta de serviço Stalwart (hoje = recovery admin) antes de produção; `@type` do toggle de envio.

### 🔜 Marco 3 — Entregabilidade & produção
- [ ] 3.1 **TLS real** nas portas de e-mail (decisão A: Stalwart renova com token próprio × B: agente emite e sincroniza)
- [ ] 3.2 DKIM por domínio de cliente; SPF/DMARC por domínio
- [ ] 3.3 Reputação: IP compartilhado → pool/IP dedicado p/ quem envia muito; rate limits; warm-up
- [ ] 3.4 Monitorar blocklists + Postmaster Tools; runbook de delisting

### 🔜 Marco 4 — Onboarding de clientes reais
- [ ] 4.1 Fluxo de cutover de MX do domínio do cliente (sem derrubar e-mail atual dele)
- [ ] 4.2 LGPD: contratos de operador, retenção, localização
- [ ] 4.3 Planos/limites por cliente (nº de caixas, quota)

---

## ❓ Perguntas em aberto (produto) — resolver 1 a 1

- [x] **P-A — Domínio do cliente:** ✅ **domínio próprio do cliente** (`cliente.com.br`).
- [x] **P-A2 — Controle de DNS do cliente:** ✅ **VirtueTech gerencia o domínio inteiro** (cliente
  delega o domínio → nossa Cloudflare). Automação total via `cf_dns.py`.
- [x] **P-B — Webmail:** ✅ **construir próprio (JMAP), partindo de uma base clonável** (fork/template)
  pra encurtar o dev — não do zero. _(escolher a base → P-B2)_
- [x] **P-B2 — Base clonável:** ✅ **[root-fr/jmap-webmail](https://github.com/root-fr/jmap-webmail)** (MIT,
  Next.js 16 + TS + Tailwind v4 + Zustand). Liberdade comercial total (fecha código). Fork vira a base
  do nosso webmail. _(descartado Bulwark por ser AGPL, apesar de mais maduro.)_
- [x] **P-C — Casa do produto:** ✅ **monorepo** (`apps/webmail` [fork root-fr] + `apps/admin` [painel]
  + `packages/*` [automação/provisionamento]). PLANO.md migra pra lá quando o repo nascer. _(tooling → P-C2)_
- [x] **P-C2 — Tooling do monorepo:** ✅ **pnpm workspaces** (leve; Turborepo opcional depois só p/ cache).
- [ ] **P-D — Login do cliente:** autentica direto na caixa Stalwart (JMAP/IMAP) ou camada de identidade própria?
- [ ] **P-E — Estrutura de cliente:** 1 cliente = 1 domínio? Quantas caixas de colaborador em média? Há "planos"?
- [ ] **P-F — Conta de envio do app:** 1 por app/cliente? Como você injeta as credenciais no app do cliente?
- [x] **P-G — Entregabilidade:** ✅ default da DR — IP compartilhado agora, migrar quem envia muito p/ IP/pool dedicado sob demanda.
- [ ] **P-D — Login do cliente no webmail:** avaliar com a base rodando (root-fr traz OAuth2/OIDC + basic contra o Stalwart). _(decidir após o spike)_
- [ ] **P-E — Estrutura de cliente:** nº médio de caixas de colaborador, planos/limites. _(informativo; refinar depois)_
- [ ] **P-F — Conta de envio do app:** 1 caixa de envio por app; você injeta a credencial SMTP no app do cliente. _(confirmar no Marco 2)_

---

## 🔒 Decisões travadas (histórico)

- **2026-07-15 — Escopo:** plataforma **multi-cliente** (software house VirtueTech).
- **2026-07-15 — Infra:** VPS **Contabo** (`89.117.72.133`), mesmo **Swarm + Traefik**; portas de
  e-mail no host, Traefik só HTTPS. Futuro: possível migração p/ Hostinger (novo IP = re-warm-up).
- **2026-07-15 — Hostname neutro:** `email.virtuetech.com.br` (MX/HELO/PTR de tudo).
- **2026-07-15 — Edição:** Stalwart **CE (AGPL)**; sem modificar o núcleo (webmail/automação são
  programas separados via JMAP/IMAP/SMTP, não herdam AGPL). Tenant = isolamento **lógico** na automação.
- **2026-07-15 — Versão/imagem:** `ghcr.io/stalwartlabs/stalwart:v0.16` (0.16.13). Volumes
  `/etc/stalwart` + `/var/lib/stalwart`. Config via UI/CLI (não TOML).
- **2026-07-15 — PoC em subdomínio:** `virtuetech.com.br` usa **Zoho em produção** → não tocar; PoC
  em `mail-test.virtuetech.com.br`.
- **2026-07-16 — Fato técnico:** Stalwart **não tem webmail de usuário** embutido (WebUI = só admin).
  Webmail do cliente será **construído/plugado**.
- **2026-07-16 — Rumo:** fazer o **escopo completo** do produto; provável frontend próprio de e-mail
  em `email.virtuetech.com.br`.
- **2026-07-16 — Webmail (P-B/B2):** construir próprio a partir de **fork do
  [root-fr/jmap-webmail](https://github.com/root-fr/jmap-webmail)** (MIT; Next.js 16 + TS + Tailwind v4 + Zustand).
- **2026-07-16 — Casa do produto (P-C):** **monorepo** — `apps/webmail`, `apps/admin`, `packages/*`.
- **2026-07-16 — DNS/token (decisão de política):** **ampliar o token** → o **app gerencia as zonas
  dos clientes direto** na API Cloudflare (account-level: Zone Create + Zone Read + DNS Edit). O
  **agente/`cf_dns.py`** continua dono **só de `virtuetech.com.br`** (infra). Zonas diferentes →
  sem conflito de escrita. Jonathan cria o token amplo + passa `accountId`. (Resolve o A3 e o D1.)
- **2026-07-16 — Domínio do cliente (P-A):** cada cliente usa o **próprio domínio**. Implicações:
  (a) **DKIM/SPF/DMARC por domínio** do cliente; (b) **cutover de MX** cuidadoso se o cliente já
  tem e-mail; (c) ⚠️ o DNS desses domínios **não está** na nossa zona `virtuetech.com.br` → o
  `cf_dns.py`/token atuais não alcançam → precisamos definir como controlar o DNS deles (P-A2).
- **2026-07-16 — DNS do cliente (P-A2):** **VirtueTech gerencia o domínio inteiro** — o cliente
  delega o domínio para a **nossa conta Cloudflare**. Implicações:
  (a) **token/automação Cloudflare passa a ser multi-zona** (account-level ou por-zona; não mais só
  `virtuetech.com.br`) — o agente ajusta o escopo do `CF_API_TOKEN`;
  (b) no onboarding, **replicar os registros existentes** do cliente (A do site, etc.) na nova zona
  antes de trocar os nameservers, pra não derrubar o site/serviços dele;
  (c) somos responsáveis por **todo** o DNS do cliente, não só e-mail — mais controle, mais responsabilidade.

---

## 📎 Apêndice A — Estado técnico atual (infra do PoC)

**Servidor:** Stalwart v0.16.13, serviço `stalwart_stalwart` 1/1 no Swarm (nó `Singaerj`).
Painel admin `https://mail-admin.virtuetech.com.br` (Traefik → 8080, **cert Let's Encrypt válido**).
Portas de e-mail no host: 25, 465(TLS), 993(TLS), 995, 4190; **587 e 143 sem listener por padrão**.
Cert das **portas de e-mail** = self-signed (pendência do Marco 3). Config em `/etc/stalwart/config.json`
+ RocksDB em `/var/lib/stalwart`.

**Contas hoje:** `admin@mail-test` (superadmin), `pocsend@mail-test` (envio de app).
Recovery admin em `/opt/stalwart/.env` (autentica, mas não envia como `@mail-test`).

**VPS:** Contabo, 6 vCPU, 16 GB RAM, 194 GB disco (folga ampla). Ubuntu 20.04. **Porta 25 saída
ABERTA**. **PTR/FCrDNS** `89.117.72.133 → email.virtuetech.com.br` ✅.

**Divisão de papéis:**
- **Agente VPS/Cloudflare:** VPS, Swarm, stack, Traefik e **todo o DNS** (via `cf_dns.py`, token
  escopado). Handoff em `C:\Projetos\APPS\vps-manager\docs\handoff-smtp-stalwart.md`.
- **Camada SMTP/app (nós, via Jonathan):** dentro do Stalwart — contas, envio/recebimento, webmail,
  automação. Pedido de DNS → repassar ao agente.

**Artefatos de deploy:** [`deploy/stalwart.stack.yml`](deploy/stalwart.stack.yml) ·
[`deploy/dns-records.md`](deploy/dns-records.md) · [`deploy/stalwart.env.example`](deploy/stalwart.env.example) ·
prompts do agente em `deploy/prompt-agente-*.md`.

---

## ⚠️ Apêndice C — Operação do Stalwart (aprendido na marra)

- **Auto-ban do Stalwart (causou o 502!):** o Stalwart bane IPs que sondam URLs inexistentes
  (~30/dia). Como ele fica **atrás do Traefik**, ele vê o **IP do Traefik** em todas as chamadas
  → sondar caminho errado **via `https://mail-admin.virtuetech.com.br/...`** bane o **Traefik** e
  **derruba o painel (502) pra todos**. Regras:
  - **Nunca** explorar/errar endpoints via Traefik. Código de produção só chama caminhos válidos.
  - Experimentação/descoberta = **de dentro da overlay** direto em `http://stalwart:8080/jmap/`
    (container efêmero, IP descartável).
  - Se o Traefik for banido: de um container na Singanet, `x:BlockedIp/query` →
    `x:BlockedIp/set {destroy:[id]}` **e** reiniciar (`docker service update --force stalwart_stalwart`)
    — só remover não basta (contador em memória re-bane).
- **API de gestão confirmada:** endpoint **`/jmap/`** (não `/api`), métodos **`x:*`** (ex.:
  `x:Principal/*`, `x:BlockedIp/*`), capability **`urn:stalwart:jmap`**, **Basic auth** com a
  recovery admin. Payloads exatos → captura do agente (prompt db-e-jmap).
- **Consequência de arquitetura:** os apps (webmail/admin) falam JMAP com o Stalwart pela **overlay
  interna** (`http://stalwart:8080/jmap/`) para provisionamento/servidor; só o fluxo **OAuth do
  browser** usa a URL pública (inevitável, mas são caminhos válidos → não bane).

---

## 📎 Apêndice B — Cuidados herdados da DR (valem em escala)

- **Traefik ≠ SMTP:** portas de e-mail sempre no host; Traefik só HTTP/HTTPS.
- **Cloudflare "DNS only"** para MX/SPF/DKIM/DMARC/TLSA. Nunca proxied.
- **rDNS/PTR** sempre no hostname neutro da infra, nunca no domínio do cliente.
- **Reputação de IP compartilhado** é o maior risco em escala → pools/IP dedicado, rate limits, warm-up.
- **Backup das chaves DKIM** (por domínio) é inegociável — perdê-las quebra assinatura.
- **Porta 25 de saída** por provedor muda; re-testar ao migrar de VPS.
- **LGPD:** hospedar e-mail de terceiros = ser operador de dados pessoais.
