# Prompt para o agente da VPS — teste de ENVIO (outbound) do PoC

> Pré-requisito: o Jonathan cria a caixa `pocsend@mail-test.virtuetech.com.br` no painel do
> Stalwart e te repassa a senha de forma segura (não em chat público). Cert das portas de
> e-mail é self-signed → usar `--tls-no-verify` (esperado no PoC).

## Estado verificado pelo agente de VPS+Cloudflare (2026-07-15)

Ground truth pra você começar sem redescobrir nada:

- **Infra + DNS 100% prontos e verificados.** Stalwart v0.16.13 no ar (`stalwart_stalwart` 1/1, modo normal). A, MX, SPF (`v=spf1 ip4:89.117.72.133 -all`), DMARC (`p=none`), **DKIM publicado** e **PTR/FCrDNS** confirmados (`89.117.72.133 → email.virtuetech.com.br`, ida e volta batem).
- **RECEBIMENTO já validado end-to-end**: Gmail → `admin@mail-test.virtuetech.com.br` chegou na inbox, com SPF/DKIM/DMARC/IPREV = PASS, classificado como ham. Falta só o **ENVIO** (este prompt).
- **Seletores DKIM** (pra você conferir DKIM=pass no destino): `v1-ed25519-20260715` e `v1-rsa-20260715` (ambos em `._domainkey.mail-test.virtuetech.com.br`). O Stalwart assina com os dois.
- **`swaks` JÁ está instalado** na VPS (`/usr/bin/swaks`) — não precisa instalar. `python3` e `dig` também presentes.
- **Destinatário de teste:** `jonathanfigueiredo@gmail.com` (foi de onde veio o teste de recebimento).
- **Submission testado e alcançável:** `email.virtuetech.com.br:465` (TLS implícito, self-signed) e também `127.0.0.1:465` de dentro da VPS. Login SMTP funciona.
- **⚠️ Não perca tempo com a recovery admin pra enviar:** existe `STALWART_RECOVERY_ADMIN=admin:<...>` em `/opt/stalwart/.env` — ela autentica no SMTP, mas o servidor **recusa o MAIL FROM** dela em qualquer `@mail-test` (`5.5.4 not allowed to send from this address`), porque não é dona do endereço. Por isso o pré-requisito é a caixa `pocsend@mail-test` (ou `admin@mail-test`) com senha própria. Tentei criar a `pocsend` via API e não deu (`/api/principal` 404; JMAP em `/jmap/`, `Principal/set` → `notRequest`) — **crie pelo painel** mesmo.
- **DNS é gerido manualmente** pelo agente de VPS+Cloudflare (via `cf_dns.py`). **Não altere DNS** — se precisar de um registro (ex.: MTA-STS, TLS-RPT), peça ao Jonathan repassar pro agente de infra.
- **⚠️ CUIDADO com o auto-ban do Stalwart (já derrubou o painel uma vez):** o Stalwart bane IPs que sondam URLs inexistentes (~30/dia). Se você fizer chamadas de API a caminhos errados **através do Traefik** (`https://mail-admin.virtuetech.com.br/...`), quem leva o ban é o **IP do Traefik** → o painel inteiro cai com **502** pra todos. Regras: (a) o endpoint JMAP de gerência é **`/jmap/`** (não `/api`), com métodos **`x:*`** e capability **`urn:stalwart:jmap`**, auth Basic com a recovery admin; (b) se for explorar/errar endpoints, faça **de dentro da Singanet** direto no `http://stalwart:8080/jmap/` (container efêmero, IP descartável), **nunca** via Traefik. Se banir o Traefik mesmo assim: remover o BlockedIp do IP dele (`x:BlockedIp/query` → `x:BlockedIp/set {destroy:[id]}`) de um container na Singanet **e** reiniciar o Stalwart (`docker service update --force stalwart_stalwart`) — só remover não basta (contador em memória re-bane).

```text
CONTEXTO
Servidor Stalwart já validado no RECEBIMENTO. Falta provar o ENVIO (outbound). Existe uma
caixa dedicada de envio: pocsend@mail-test.virtuetech.com.br (senha te repassada pelo Jonathan).
Submission em email.virtuetech.com.br:465 (TLS implícito, cert self-signed no PoC).

TAREFA 1 — Enviar e-mail de teste
Usar swaks (ou equivalente) a partir da VPS:

  swaks --to jonathanfigueiredo@gmail.com \
        --from pocsend@mail-test.virtuetech.com.br \
        --server email.virtuetech.com.br:465 \
        --tls-on-connect --tls-no-verify \
        --auth LOGIN \
        --auth-user pocsend@mail-test.virtuetech.com.br \
        --auth-password '<SENHA_DA_POCSEND>' \
        --h-Subject "Teste de envio - PoC Stalwart" \
        --body "Se voce leu isto na inbox do Gmail, o envio do servidor funciona. SPF/DKIM/DMARC devem passar."

Reportar: a transação SMTP foi aceita (250)? Colar a saída do swaks.

TAREFA 2 — Confirmar a entrega nos logs do Stalwart
  docker service logs stalwart_stalwart --tail 80
Procurar a entrega outbound para o MX do Gmail (gmail-smtp-in...) e o resultado (250 OK /
aceito). Colar as linhas relevantes.

TAREFA 3 — Checar blocklists do IP (item 3.3 do plano)
Consultar 89.117.72.133 nas principais DNSBLs. Ex.:
  for bl in zen.spamhaus.org bl.spamcop.net b.barracudacentral.org; do
    echo -n "$bl: "; dig +short 133.72.117.89.$bl A || echo "(sem resposta = não listado)";
  done
Reportar: listado em alguma? (esperado: não listado)

TAREFA 4 (opcional) — Score de entregabilidade
Se conseguir obter um endereço do https://www.mail-tester.com (formato test-XXXXX@srv1.mail-tester.com),
enviar o mesmo e-mail pra ele (mesmo comando da Tarefa 1, trocando --to) e reportar o link/nota.

RELATÓRIO: resultado das tarefas 1–4 (saídas cruas). NÃO alterar DNS nem nada pré-existente.
```

**Depois:** o Jonathan confere no Gmail dele — o e-mail caiu na **inbox** (não spam)? Em "Mostrar
original", **SPF/DKIM/DMARC = PASS**? Isso fecha o item 3.2 do plano.
