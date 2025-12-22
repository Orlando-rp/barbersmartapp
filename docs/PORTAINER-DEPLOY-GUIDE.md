# BarberSmart - Guia de Deploy no Portainer

## Visão Geral

Este guia explica como fazer deploy do BarberSmart usando Portainer com Docker Swarm.

## Pré-requisitos

- Portainer CE/BE instalado e configurado
- Docker Swarm inicializado (`docker swarm init`)
- Acesso a um registry de imagens (GHCR, Docker Hub, etc.)
- Domínio configurado apontando para o servidor

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik (Reverse Proxy)                   │
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

## Passo 1: Preparar a Imagem Docker

### Opção A: Build Local + Push Manual

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/barbersmart.git
cd barbersmart

# Login no registry
docker login ghcr.io -u SEU_USUARIO

# Build com variáveis de ambiente
docker build \
  --build-arg VITE_SUPABASE_URL="https://xxx.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="sua-anon-key" \
  --build-arg VITE_MAIN_DOMAINS="seudominio.com.br" \
  -t ghcr.io/seu-usuario/barbersmart:latest .

# Push para o registry
docker push ghcr.io/seu-usuario/barbersmart:latest
```

### Opção B: CI/CD Automático (Recomendado)

1. Configure os secrets no GitHub:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Configure a variável:
   - `VITE_MAIN_DOMAINS`

3. Faça push para a branch `main` ou crie uma tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. O GitHub Actions irá buildar e fazer push automaticamente.

## Passo 2: Criar a Rede no Portainer

1. Acesse **Portainer** → **Networks**
2. Clique em **Add network**
3. Configure:
   - **Name:** `web`
   - **Driver:** `overlay`
   - **Attachable:** ✅ Habilitado
4. Clique em **Create the network**

## Passo 3: Criar o Stack

### 3.1 Acessar Stacks

1. No Portainer, vá para **Stacks**
2. Clique em **Add stack**

### 3.2 Configurar o Stack

1. **Name:** `barbersmart`

2. **Build method:** Web editor

3. **Web editor:** Cole o conteúdo do arquivo `docker-stack.yml` ou `docker-stack-app-only.yml`

### 3.3 Variáveis de Ambiente

Na seção **Environment variables**, adicione:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `REGISTRY` | `ghcr.io` | Registry da imagem |
| `IMAGE_NAME` | `seu-usuario/barbersmart` | Nome da imagem |
| `IMAGE_TAG` | `latest` | Tag da imagem |
| `MAIN_DOMAIN` | `seudominio.com.br` | Domínio principal |
| `ACME_EMAIL` | `seu@email.com` | Email para Let's Encrypt |

### 3.4 Deploy

Clique em **Deploy the stack**

## Passo 4: Verificar o Deploy

### Via Portainer

1. Vá para **Services**
2. Verifique se `barbersmart_app` está com status **Running**
3. Verifique se as replicas estão healthy

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

1. Acesse `https://seudominio.com.br` - deve mostrar o dashboard/login
2. Acesse `https://barbearia-teste.seudominio.com.br` - deve mostrar landing ou "não encontrado"

## Passo 5: Configurar Auto-Deploy (Opcional)

### Webhook do Portainer

1. No Portainer, vá para o Stack `barbersmart`
2. Na aba **Webhooks**, habilite o webhook
3. Copie a URL do webhook
4. No GitHub, vá para **Settings** → **Secrets** → **Actions**
5. Adicione um secret:
   - **Name:** `PORTAINER_WEBHOOK_URL`
   - **Value:** URL copiada do Portainer

Agora, cada push na `main` irá:
1. Buildar a imagem
2. Fazer push para o registry
3. Triggerar o webhook do Portainer
4. Portainer atualiza o stack automaticamente

## Comandos Úteis

### Escalar Replicas

```bash
# Via CLI
docker service scale barbersmart_app=3

# Ou no Portainer: Services → barbersmart_app → Scale
```

### Atualizar Imagem

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

# Verificar se a imagem existe
docker pull ghcr.io/seu-usuario/barbersmart:latest
```

### Certificado SSL não emitido

1. Verifique se as portas 80 e 443 estão abertas no firewall
2. Verifique os logs do Traefik:
   ```bash
   docker service logs barbersmart_traefik -f
   ```
3. Confirme que o DNS está propagado:
   ```bash
   dig seudominio.com.br
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
├── Dockerfile              # Build da imagem
├── docker-stack.yml        # Stack completo (app + traefik)
├── docker-stack-app-only.yml # Apenas app (usa traefik existente)
├── docker-compose.yml      # Para desenvolvimento local
├── docker/
│   ├── nginx.conf          # Config do Nginx
│   └── .env.example        # Exemplo de variáveis
└── .github/
    └── workflows/
        └── build-push.yml  # CI/CD automático
```

## Segurança

### Recomendações

1. **Nunca** exponha o Docker socket sem proteção
2. Use secrets do Portainer para credenciais sensíveis
3. Mantenha o Traefik atualizado
4. Configure rate limiting no Traefik
5. Use certificados SSL em produção

### Secrets Sensíveis

Para credenciais sensíveis, use Docker Secrets:

```yaml
secrets:
  supabase_url:
    external: true
  supabase_key:
    external: true
```

```bash
# Criar secrets
echo "https://xxx.supabase.co" | docker secret create supabase_url -
echo "sua-anon-key" | docker secret create supabase_key -
```

## Suporte

- **Documentação:** `/docs/SELF-HOSTING-GUIDE.md`
- **Arquitetura:** `/docs/MULTI-TENANT-ARCHITECTURE.md`
- **Issues:** GitHub Issues do repositório
