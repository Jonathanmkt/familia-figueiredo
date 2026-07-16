# Prompt para o agente da VPS/Cloudflare — bloco de infra do PoC de e-mail

> Copiar/colar para o agente. Ele tem token Cloudflare (Zone DNS Edit + Zone Read na zona
> `virtuetech.com.br`) e acesso SSH à VPS Contabo, ambos via scripts.

```text
CONTEXTO
Estamos subindo um servidor de e-mail self-hosted (Stalwart Mail Server v0.16, Community
Edition) na nossa VPS Contabo, para uma PROVA DE CONCEITO. Fatos já levantados por você antes:
- VPS Contabo, IPv4 89.117.72.133, Ubuntu 20.04, Docker 28.1.1, Swarm single-node (nó Singaerj,
  manager), Traefik v2.11.2 (rede overlay "Singanet", entrypoint HTTPS "websecure", certresolver
  "letsencryptresolver" via Let's Encrypt HTTP-01).
- Porta 25 de saída ABERTA. Portas 25/587/465/143/993/4190 LIVRES no host.
- Deploy no padrão da casa: /opt/<app>/ com stack.yml + .env (env_file), docker stack deploy.
- virtuetech.com.br já usa e-mail em produção via Zoho — NÃO TOCAR nos registros MX/SPF/TXT
  existentes do domínio raiz. O PoC usa o subdomínio mail-test.virtuetech.com.br.

Preciso que você faça os 3 blocos abaixo (só criação/adição — nada de apagar/alterar registros
existentes) e me devolva um relatório do resultado.

====================================================================
BLOCO 1 — DNS no Cloudflare (zona virtuetech.com.br) — TODOS "DNS only" (não proxied)
====================================================================
Criar os registros abaixo. Se algum já existir com valor diferente, NÃO sobrescrever — me
avisar. Confirmado antes: email.virtuetech.com.br era NXDOMAIN (livre).

# Hostname da infra
A     email.virtuetech.com.br        -> 89.117.72.133        (DNS only)
A     mail-admin.virtuetech.com.br   -> 89.117.72.133        (DNS only)
TXT   email.virtuetech.com.br        -> "v=spf1 a -all"      (SPF do HELO da infra)

# Domínio-cobaia do PoC (mail-test.virtuetech.com.br)
MX    mail-test.virtuetech.com.br    -> email.virtuetech.com.br   (prioridade 10) (DNS only)
TXT   mail-test.virtuetech.com.br    -> "v=spf1 ip4:89.117.72.133 -all"
TXT   _dmarc.mail-test.virtuetech.com.br -> "v=DMARC1; p=none; rua=mailto:dmarc@mail-test.virtuetech.com.br"

# NÃO criar o DKIM agora — o Stalwart gera a chave depois; publicaremos o TXT dele num 2º passo.

====================================================================
BLOCO 2 — PTR / rDNS na Contabo
====================================================================
No painel/API da Contabo, definir o reverse DNS (PTR) do IP 89.117.72.133 para:
    email.virtuetech.com.br
(hoje está no genérico vmi2034384.contaboserver.net). Se você não tiver acesso ao painel de
rDNS da Contabo via script, me avise que o Jonathan faz manualmente.

====================================================================
BLOCO 3 — Deploy do Stalwart no Swarm
====================================================================
1) Criar o diretório /opt/stalwart/ na VPS.

2) Criar /opt/stalwart/stack.yml com EXATAMENTE este conteúdo:

---8<--- stack.yml ---8<---
version: "3.8"

services:
  stalwart:
    image: ghcr.io/stalwartlabs/stalwart:v0.16
    networks:
      - Singanet
    volumes:
      - stalwart-etc:/etc/stalwart
      - stalwart-data:/var/lib/stalwart
    env_file:
      - /opt/stalwart/.env
    ports:
      - { target: 25,   published: 25,   protocol: tcp, mode: host }
      - { target: 587,  published: 587,  protocol: tcp, mode: host }
      - { target: 465,  published: 465,  protocol: tcp, mode: host }
      - { target: 143,  published: 143,  protocol: tcp, mode: host }
      - { target: 993,  published: 993,  protocol: tcp, mode: host }
      - { target: 4190, published: 4190, protocol: tcp, mode: host }
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: any
      labels:
        - traefik.enable=true
        - traefik.docker.network=Singanet
        - traefik.http.routers.stalwart-admin.rule=Host(`mail-admin.virtuetech.com.br`)
        - traefik.http.routers.stalwart-admin.entrypoints=websecure
        - traefik.http.routers.stalwart-admin.tls.certresolver=letsencryptresolver
        - traefik.http.services.stalwart-admin.loadbalancer.server.port=8080

networks:
  Singanet:
    external: true

volumes:
  stalwart-etc:
  stalwart-data:
---8<--- fim ---8<---

3) Criar /opt/stalwart/.env com:
    STALWART_RECOVERY_ADMIN=admin:<GERAR_SENHA_FORTE_ALEATORIA>
    STALWART_PUBLIC_URL=https://mail-admin.virtuetech.com.br
   - Gerar uma senha forte aleatória para o admin e me informar o usuário/senha de forma segura
     (não em texto puro em canal público). O Jonathan usará isso no primeiro login.

4) Deploy:
    docker stack deploy -c /opt/stalwart/stack.yml stalwart --with-registry-auth --resolve-image always

5) Verificações (colar a saída crua):
   - docker service ls | grep stalwart   (réplica 1/1?)
   - docker service ps stalwart --no-trunc   (subiu sem erro? algum restart em loop?)
   - ss -tlnp | egrep ':25|:587|:465|:143|:993|:4190'   (portas ouvindo no host?)
   - docker service logs stalwart --tail 50   (procurar erros; se houver "bootstrap mode" com
     senha temporária, me mandar)
   - curl -sko /dev/null -w "%{http_code}\n" https://mail-admin.virtuetech.com.br/   (painel
     respondendo via Traefik? Aguardar ~1-2 min pra Traefik emitir o cert Let's Encrypt do
     mail-admin; se der erro de cert, me dizer o erro exato)

====================================================================
RELATÓRIO QUE EU PRECISO DE VOLTA
====================================================================
- Bloco 1: quais registros foram criados (confirmar cada um) e se algum já existia.
- Bloco 2: PTR definido? (ou precisa do Jonathan manual?)
- Bloco 3: serviço up? saída dos comandos de verificação? credencial admin definida?
  Painel https://mail-admin.virtuetech.com.br acessível (com cert válido)?

IMPORTANTE: não apagar/alterar nada pré-existente (Zoho, outras stacks, outras rotas do
Traefik). Tudo aqui é ADIÇÃO. Qualquer conflito inesperado, parar e me perguntar.
```
