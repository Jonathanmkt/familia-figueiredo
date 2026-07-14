# Deploy — Família Figueiredo

Domínio: **tools.virtuetech.com.br** (Cloudflare → VPS `89.117.72.133`).
Infra: **Docker Swarm + Traefik** (mesmo cluster do Idealis Core), imagem no **GHCR**, deploy via **GitHub Actions → SSH**.

## Arquitetura

```
push main → GitHub Actions
  ├─ build-and-push: build da imagem (Dockerfile standalone) → ghcr.io/jonathanmkt/familia-figueiredo
  └─ deploy: SSH na VPS → docker stack deploy -c /opt/familia-figueiredo/stack.yml
Traefik (rede Singanet) roteia Host(tools.virtuetech.com.br) → serviço :3000 (TLS Let's Encrypt automático)
```

- **`Dockerfile`** — multi-stage, Node 22, `output: standalone`, roda como usuário não-root (`node server.js`).
- **`deploy/stack.yml`** — template da stack Swarm (vai pra `/opt/familia-figueiredo/stack.yml` na VPS). Usa **`env_file`** (mecanismo real em prod, não `${VAR}`).
- **`.github/workflows/build-and-push.yml`** — CI/CD.

## Variáveis e segredos

**GitHub Secrets (repo):**
| Secret | Quem seta | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app | público; build-arg (inlined no client) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app | público; build-arg |
| `VPS_HOST` / `VPS_USER` / `VPS_PORT` / `VPS_SSH_KEY` | agente da VPS | reaproveitados do Idealis (mesma chave de CI) |

**`/opt/familia-figueiredo/.env` (runtime na VPS, gerido pelo agente via SSH) — recebe o `.env` COMPLETO do app:**

| Variável | Tipo | Build-arg? | Runtime (env_file)? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | ✅ (inlined no client) | ✅ (server lê em runtime) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | ✅ | ✅ |
| `SUPABASE_JWKS_URL` | config (server) | ❌ | ✅ |
| `SUPABASE_SECRET_KEY` | **SEGREDO** | ❌ **NUNCA** | ✅ |
| `OPENAI_API_KEY` | **SEGREDO** | ❌ **NUNCA** | ✅ |

**Padrão de segredo (fixo da casa):** o `.env` inteiro do app vai pro `env_file` de runtime na VPS.
Segredos (qualquer coisa **sem** prefixo `NEXT_PUBLIC_`) vão **SÓ** no `env_file` — **nunca** como
build-arg (não entram na imagem Docker), **nunca** commitados (`.env*` no `.gitignore` e no
`.dockerignore`), **nunca** no bundle do cliente. O valor do segredo é passado ao agente da VPS de
forma segura (ele grava direto no `.env` via SSH, sem imprimir); jamais trafega pelo CI ou pela imagem.

## Passos (ordem importa)

1. **App:** setar os 2 secrets `NEXT_PUBLIC_*` no repo (`gh secret set ...`) — **antes** do 1º build, senão a config Supabase do client sai vazia.
2. **Push** na `main` → CI faz build+push (cria o pacote no GHCR) e tenta o deploy.
3. **⚠️ Tornar o pacote GHCR público:** GitHub → perfil → Packages → `familia-figueiredo` → Package settings → Change visibility → **Public**. O pacote nasce **privado** (herda do repo privado) e a VPS puxa a imagem **sem login** (`--with-registry-auth` sem credencial guardada), então o deploy falha com 401/403 até isso. Passo manual único.
4. **Agente da VPS:** cria `/opt/familia-figueiredo/` com `stack.yml` (deste template) + `.env`, e configura os 4 secrets `VPS_*` no repo.
5. **Re-run** o workflow (ou novo push) → deploy sobe. Traefik emite o TLS automático no 1º acesso.

## Melhorias sobre o padrão Idealis (aplicadas aqui)

- **standalone** (imagem leve) em vez de copiar `.next` + `node_modules` inteiros.
- **Node 22** (Idealis usa 18) — exigido por Next 15/React 19.
- **`env_file`** explícito no stack (o `${VAR}` do compose do Idealis não resolve em prod).
- **service/secret key só em runtime** (o Idealis passa como build-arg — não repetir).
