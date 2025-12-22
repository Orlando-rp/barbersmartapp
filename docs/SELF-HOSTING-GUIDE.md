# BarberSmart - Guia de Self-Hosting

## Visão Geral

Este guia explica como implantar o BarberSmart em sua própria infraestrutura usando Docker e um reverse proxy (Traefik ou Nginx).

## Requisitos

- VPS com Docker e Docker Compose instalados
- Domínio próprio (ex: barbersmart.app)
- Acesso ao painel DNS do seu domínio
- Projeto Supabase configurado

## Passo a Passo

### 1. Configurar DNS

```
# Para o domínio principal
A    @    → IP_DA_SUA_VPS
A    www  → IP_DA_SUA_VPS

# Para wildcard (subdomínios)
A    *    → IP_DA_SUA_VPS
```

### 2. Clonar e Configurar

```bash
git clone <seu-repositorio>
cd barbersmart

# Copiar arquivo de ambiente
cp docker/.env.example .env

# Editar variáveis
nano .env
```

### 3. Configurar Variáveis

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_MAIN_DOMAINS=seudominio.com.br
ACME_EMAIL=seu@email.com
```

### 4. Criar Rede Docker

```bash
docker network create web
```

### 5. Iniciar Serviços

```bash
docker-compose up -d --build
```

### 6. Verificar

```bash
docker-compose logs -f
```

## Arquitetura Multi-Tenant

O sistema detecta automaticamente o tenant pelo hostname:

- `barbersmart.app` → Dashboard/Login
- `barbearia1.barbersmart.app` → Landing page da barbearia1
- `minhabarbearia.com.br` → Landing page (domínio customizado)

## Certificados SSL

O Traefik gerencia automaticamente os certificados via Let's Encrypt.

Para certificados wildcard, configure o DNS Challenge com Cloudflare:

```yaml
# docker-compose.yml
environment:
  - CF_API_EMAIL=seu@email.com
  - CF_DNS_API_TOKEN=seu-token
```

## Troubleshooting

### Domínio não resolve
- Verifique propagação DNS: `dig seudominio.com`
- Aguarde até 48h para propagação

### Certificado SSL não emitido
- Verifique logs: `docker-compose logs traefik`
- Confirme que a porta 80 está acessível

### Tenant não encontrado
- Verifique se o domínio está cadastrado na tabela `barbershop_domains`
- Confirme que o status é `active`
