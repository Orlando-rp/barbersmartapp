# BarberSmart - Guia de Deploy no Portainer

## Visão Geral

Este guia explica como fazer deploy do BarberSmart usando Portainer com Docker Swarm e Docker Hub.

## Pré-requisitos

- Portainer CE/BE instalado e configurado
- Docker Swarm inicializado (`docker swarm init`)
- Conta no Docker Hub
- Domínio configurado apontando para o servidor
- Traefik já rodando na rede `my_network`

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Traefik (já existente em my_network)            │
│  - SSL/TLS automático via Let's Encrypt                      │
│  - Roteamento por hostname                                   │
│  - Load balancing                                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  App Replica │   │  App Replica │   │  App Replica │
│      #1      │   │      #2      │   │      #N      │
└─────────────┘   └─────────────┘   └─────────────┘
```

## Passo 1: Configurar GitHub Secrets

No seu repositório GitHub, vá para **Settings** → **Secrets and variables** → **Actions**.

### Secrets (obrigatórios)

| Nome | Descrição |
|------|-----------|
| `DOCKERHUB_USERNAME` | Seu usuário do Docker Hub |
| `DOCKERHUB_TOKEN` | Token de acesso do Docker Hub (criar em dockerhub.com → Account Settings → Security → New Access Token) |
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `PORTAINER_WEBHOOK_URL` | URL do webhook do Portainer (configurar no passo 4) |

### Variables

| Nome | Descrição |
|------|-----------|
| `VITE_MAIN_DOMAINS` | Domínio principal (ex: `barsmart.app`) |

## Passo 2: Primeiro Build

Faça um commit e push para a branch `main`:

```bash
git add .
git commit -m "Configurar CI/CD com Docker Hub"
git push origin main
```

O GitHub Actions irá:
1. Buildar a imagem
2. Fazer push para Docker Hub
3. A imagem estará disponível em `docker.io/SEU_USUARIO/barbersmartapp:latest`

**Verificar:** Vá em **GitHub** → **Actions** e confirme que o workflow passou.

## Passo 3: Criar o Stack no Portainer

### 3.1 Acessar Stacks

1. No Portainer, vá para **Stacks**
2. Clique em **Add stack**

### 3.2 Configurar o Stack

1. **Name:** `barbersmart`

2. **Build method:** Web editor

3. **Web editor:** Cole o conteúdo abaixo:

```yaml
version: "3.8"

services:
  app:
    image: docker.io/${DOCKERHUB_USERNAME}/barbersmartapp:${IMAGE_TAG:-latest}
    networks:
      - my_network
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M
      labels:
        - "traefik.enable=true"
        - "traefik.docker.network=my_network"
        - "traefik.http.routers.barbersmart-main.rule=Host(`${MAIN_DOMAIN}`) || Host(`www.${MAIN_DOMAIN}`)"
        - "traefik.http.routers.barbersmart-main.entrypoints=websecure"
        - "traefik.http.routers.barbersmart-main.tls.certresolver=letsencrypt"
        - "traefik.http.routers.barbersmart-main.priority=10"
        - "traefik.http.routers.barbersmart-wildcard.rule=HostRegexp(`{subdomain:[a-z0-9-]+}.${MAIN_DOMAIN}`)"
        - "traefik.http.routers.barbersmart-wildcard.entrypoints=websecure"
        - "traefik.http.routers.barbersmart-wildcard.tls.certresolver=letsencrypt"
        - "traefik.http.routers.barbersmart-wildcard.priority=5"
        - "traefik.http.services.barbersmart.loadbalancer.server.port=80"
        - "traefik.http.services.barbersmart.loadbalancer.healthcheck.path=/health"
        - "traefik.http.services.barbersmart.loadbalancer.healthcheck.interval=30s"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  my_network:
    external: true
```

### 3.3 Variáveis de Ambiente

Na seção **Environment variables**, adicione:

| Nome | Valor |
|------|-------|
| `DOCKERHUB_USERNAME` | seu-usuario-dockerhub |
| `MAIN_DOMAIN` | barsmart.app |
| `IMAGE_TAG` | latest |

### 3.4 Deploy

Clique em **Deploy the stack**

## Passo 4: Configurar Auto-Deploy (Webhook)

### 4.1 Habilitar Webhook no Portainer

1. No Portainer, vá para o Stack `barbersmart`
2. Na aba **Webhooks**, habilite o webhook
3. Copie a URL do webhook (algo como `https://portainer.seudominio.com/api/stacks/webhooks/xxx`)

### 4.2 Adicionar Webhook no GitHub

1. No GitHub, vá para **Settings** → **Secrets** → **Actions**
2. Adicione um novo secret:
   - **Name:** `PORTAINER_WEBHOOK_URL`
   - **Value:** URL copiada do Portainer

Agora, cada push na `main` irá automaticamente:
1. ✅ Buildar a imagem
2. ✅ Fazer push para Docker Hub
3. ✅ Chamar webhook do Portainer
4. ✅ Portainer baixa nova imagem e faz rolling update

## Passo 5: Verificar o Deploy

### Via Portainer

1. Vá para **Services**
2. Verifique se `barbersmart_app` está com status **Running**
3. Verifique se as 2 réplicas estão healthy

### Via Terminal

```bash
# Ver status dos serviços
docker service ls

# Ver logs do app
docker service logs barbersmart_app -f

# Ver detalhes do serviço
docker service inspect barbersmart_app
```

### Via Browser

1. Acesse `https://barsmart.app` - deve mostrar o dashboard/login
2. Acesse `https://teste.barsmart.app` - deve mostrar landing ou "tenant não encontrado"

## Comandos Úteis

### Escalar Replicas

```bash
# Via CLI
docker service scale barbersmart_app=3

# Ou no Portainer: Services → barbersmart_app → Scale
```

### Atualizar Imagem Manualmente

```bash
# Force update para puxar nova imagem
docker service update --force barbersmart_app
```

### Rollback

```bash
# Voltar para versão anterior
docker service rollback barbersmart_app
```

### Ver Logs

```bash
# Todos os containers
docker service logs barbersmart_app -f

# Apenas erros
docker service logs barbersmart_app 2>&1 | grep -i error
```

## Troubleshooting

### Serviço não inicia

```bash
# Ver eventos do serviço
docker service ps barbersmart_app --no-trunc

# Verificar se a imagem existe no Docker Hub
docker pull docker.io/seu-usuario/barbersmartapp:latest
```

### Imagem não encontrada

1. Verifique se o workflow do GitHub Actions passou
2. Confirme que a imagem está no Docker Hub: `hub.docker.com/r/seu-usuario/barbersmartapp`
3. Verifique se `DOCKERHUB_USERNAME` está correto no Portainer

### Certificado SSL não emitido

1. Verifique se as portas 80 e 443 estão abertas no firewall
2. Verifique os logs do Traefik:
   ```bash
   docker service logs traefik -f
   ```
3. Confirme que o DNS está propagado:
   ```bash
   dig barsmart.app
   ```

### Health check falhando

```bash
# Testar health check manualmente
docker exec $(docker ps -q -f name=barbersmart_app) curl -f http://localhost/health
```

### Domínio não resolve para o tenant

1. Verifique se o domínio está cadastrado na tabela `barbershop_domains`
2. Confirme que o status é `active`
3. Verifique se `verified_at` não é null

## Estrutura de Arquivos

```
barbersmart/
├── Dockerfile                    # Build da imagem
├── docker-stack.yml              # Stack completo (app + traefik)
├── docker-stack-app-only.yml     # Apenas app (usa traefik existente)
├── docker-compose.yml            # Para desenvolvimento local
├── docker/
│   ├── nginx.conf                # Config do Nginx
│   └── .env.example              # Exemplo de variáveis
└── .github/
    └── workflows/
        └── build-push.yml        # CI/CD automático para Docker Hub
```

## Segurança

### Recomendações

1. **Nunca** exponha o Docker socket sem proteção
2. Use secrets do Portainer para credenciais sensíveis
3. Mantenha o Traefik atualizado
4. Configure rate limiting no Traefik
5. Use certificados SSL em produção

### Tokens Docker Hub

Crie um Access Token em vez de usar sua senha:
1. Acesse `hub.docker.com`
2. Vá para **Account Settings** → **Security**
3. Clique em **New Access Token**
4. Use esse token como `DOCKERHUB_TOKEN` no GitHub

## Suporte

- **Documentação:** `/docs/SELF-HOSTING-GUIDE.md`
- **Arquitetura:** `/docs/MULTI-TENANT-ARCHITECTURE.md`
- **Issues:** GitHub Issues do repositório
