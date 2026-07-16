# Prompt para o agente da VPS — painel do Stalwart caiu (502)

```text
PROBLEMA
O painel https://mail-admin.virtuetech.com.br está retornando 502 Bad Gateway.
O Traefik responde e o cert TLS é válido — o 502 indica que o Traefik NÃO está conseguindo
alcançar o backend do Stalwart (http interno, porta 8080). Precisamos do painel de pé para
criar a caixa pocsend@mail-test (teste de envio do PoC).

DIAGNÓSTICO (colar as saídas)
1) docker service ls | grep stalwart            (réplica está 1/1 ou 0/1?)
2) docker service ps stalwart_stalwart --no-trunc   (task rodando? erro? restart em loop?
   "Rejected"/"Failed"/"Shutdown"? qual a mensagem?)
3) docker service logs stalwart_stalwart --tail 100  (erro recente? panic? falha ao subir o
   listener http/8080? algo sobre ACME/cert?)
4) Conferir o listener http interno:
   docker exec $(docker ps -qf name=stalwart_stalwart) sh -c "ss -tlnp | grep 8080" 2>/dev/null
   (ou testar de dentro: curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/ a
    partir do container / host conforme a rede)
5) Traefik enxerga o serviço? Conferir se o container ainda está na rede overlay "Singanet"
   e se as labels do router "stalwart-admin" continuam ativas:
   docker service inspect stalwart_stalwart --format '{{json .Spec.Labels}}' e
   docker service inspect stalwart_stalwart --format '{{json .Spec.TaskTemplate.Networks}}'

HIPÓTESES COMUNS
- Serviço reiniciou/caiu (OOM? erro de config?) → ver logs.
- O container subiu mas o listener http (8080) não ativou → ver passo 4 e logs.
- Perdeu o vínculo com a rede Singanet ou as labels do Traefik → passo 5.

AÇÃO
Se for algo claro (ex.: serviço parado, precisa `docker service update --force stalwart_stalwart`,
ou um erro de config recente), me diga o que encontrou e, se for seguro, restabeleça o serviço.
NÃO alterar DNS nem o stack sem necessidade. Reportar a causa raiz e o estado após a correção
(painel voltou? curl 200 em https://mail-admin.virtuetech.com.br/?).
```
