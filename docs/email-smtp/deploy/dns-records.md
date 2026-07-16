# Registros DNS do PoC — Cloudflare (zona `virtuetech.com.br`)

> ⚠️ **Tudo em "DNS only" (nuvem cinza).** Cloudflare não faz proxy de SMTP.
> Não tocar nos registros de e-mail existentes do domínio raiz (Zoho em produção).

## 1) Hostname da infra

| Tipo | Nome | Valor | Proxy | Obs |
|---|---|---|---|---|
| A | `email.virtuetech.com.br` | `89.117.72.133` | **DNS only** | hostname/HELO/PTR e alvo de MX |

**PTR (fora do Cloudflare):** no painel Contabo, rDNS de `89.117.72.133` → `email.virtuetech.com.br`.

## 2) Domínio-cobaia do PoC (`mail-test.virtuetech.com.br`)

| Tipo | Nome | Valor | Proxy | Obs |
|---|---|---|---|---|
| MX | `mail-test.virtuetech.com.br` | `email.virtuetech.com.br` (prio 10) | **DNS only** | recebimento |
| TXT (SPF) | `mail-test.virtuetech.com.br` | `v=spf1 ip4:89.117.72.133 -all` | n/a | autoriza o IP do servidor |
| TXT (DMARC) | `_dmarc.mail-test.virtuetech.com.br` | `v=DMARC1; p=none; rua=mailto:dmarc@mail-test.virtuetech.com.br` | n/a | `p=none` no PoC |
| TXT (DKIM) | `<selector>._domainkey.mail-test.virtuetech.com.br` | _(gerado pelo Stalwart)_ | n/a | copiar o valor da UI após criar o domínio |

## 3) Painel admin (via Traefik)

| Tipo | Nome | Valor | Proxy | Obs |
|---|---|---|---|---|
| A | `mail-admin.virtuetech.com.br` | `89.117.72.133` | proxied OK* | painel HTTPS (Let's Encrypt via Traefik) |

\* Este é HTTP/S puro (só painel), então pode ir proxied (nuvem laranja) se quiser o CDN/WAF do
Cloudflare — mas se usar Let's Encrypt **HTTP-01** no Traefik, deixar **DNS only** durante a
emissão do 1º cert pra não interferir no desafio. Simplificar: **DNS only** no PoC.

## Notas
- **DKIM**: criar o domínio no Stalwart primeiro → ele gera seletor+chave → publicar o TXT aqui.
- **TLSA/DANE**: opcional no PoC; adicionar depois se for endurecer entrega.
- **Cutover do domínio raiz** (`virtuetech.com.br`, hoje no Zoho): **fora do escopo do PoC.**
