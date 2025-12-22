#!/bin/bash

# =====================================================
# BarberSmart - Script de Setup Automatizado
# =====================================================
# Este script configura uma VPS nova para rodar o BarberSmart
# Testado em: Ubuntu 22.04 LTS, Debian 12
# Suporta: Docker Compose e Docker Swarm
# =====================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Banner
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ██████╗  █████╗ ██████╗ ██████╗ ███████╗██████╗        ║"
echo "║   ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗       ║"
echo "║   ██████╔╝███████║██████╔╝██████╔╝█████╗  ██████╔╝       ║"
echo "║   ██╔══██╗██╔══██║██╔══██╗██╔══██╗██╔══╝  ██╔══██╗       ║"
echo "║   ██████╔╝██║  ██║██║  ██║██████╔╝███████╗██║  ██║       ║"
echo "║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝       ║"
echo "║                     SMART                                 ║"
echo "║                                                           ║"
echo "║           Script de Setup para VPS                        ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  log_error "Este script precisa ser executado como root"
  log_info "Execute: sudo bash setup.sh"
  exit 1
fi

# =====================================================
# SELEÇÃO DO MODO DE DEPLOY
# =====================================================

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     Selecione o modo de instalação:          ║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  1) Docker Compose (servidor único)          ║${NC}"
echo -e "${YELLOW}║  2) Docker Swarm (cluster/Portainer)         ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo ""
read -p "Escolha [1/2]: " INSTALL_MODE

case $INSTALL_MODE in
  2)
    DEPLOY_MODE="swarm"
    log_info "Modo selecionado: Docker Swarm"
    ;;
  *)
    DEPLOY_MODE="compose"
    log_info "Modo selecionado: Docker Compose"
    ;;
esac

# =====================================================
# COLETA DE INFORMAÇÕES
# =====================================================

log_info "Coletando informações para configuração..."
echo ""

# Domínio principal
read -p "Digite seu domínio principal (ex: barbersmart.app): " MAIN_DOMAIN
if [ -z "$MAIN_DOMAIN" ]; then
  log_error "Domínio é obrigatório"
  exit 1
fi

# Email para Let's Encrypt
read -p "Digite seu email (para certificados SSL): " ACME_EMAIL
if [ -z "$ACME_EMAIL" ]; then
  log_error "Email é obrigatório"
  exit 1
fi

# Supabase URL
read -p "URL do Supabase (ex: https://xxx.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
  log_error "URL do Supabase é obrigatória"
  exit 1
fi

# Supabase Anon Key
read -p "Anon Key do Supabase: " SUPABASE_ANON_KEY
if [ -z "$SUPABASE_ANON_KEY" ]; then
  log_error "Anon Key do Supabase é obrigatória"
  exit 1
fi

# Docker Registry (apenas para Swarm)
if [ "$DEPLOY_MODE" = "swarm" ]; then
  echo ""
  read -p "Registry da imagem Docker (ex: ghcr.io/seu-usuario/barbersmart): " DOCKER_IMAGE
  if [ -z "$DOCKER_IMAGE" ]; then
    log_error "Registry é obrigatório para Docker Swarm"
    exit 1
  fi
fi

# Diretório de instalação
INSTALL_DIR="/opt/barbersmart"
read -p "Diretório de instalação [$INSTALL_DIR]: " input
INSTALL_DIR="${input:-$INSTALL_DIR}"

echo ""
log_info "Configuração:"
echo "  Modo: $DEPLOY_MODE"
echo "  Domínio: $MAIN_DOMAIN"
echo "  Email: $ACME_EMAIL"
echo "  Supabase: $SUPABASE_URL"
[ -n "$DOCKER_IMAGE" ] && echo "  Imagem: $DOCKER_IMAGE"
echo "  Diretório: $INSTALL_DIR"
echo ""

read -p "Confirma? (s/N): " confirm
if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
  log_warn "Instalação cancelada"
  exit 0
fi

# =====================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# =====================================================

log_info "Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq

log_info "Instalando dependências básicas..."
apt-get install -y -qq \
  curl \
  wget \
  git \
  ca-certificates \
  gnupg \
  lsb-release \
  ufw \
  htop \
  nano

log_success "Dependências básicas instaladas"

# =====================================================
# INSTALAÇÃO DO DOCKER
# =====================================================

if command -v docker &> /dev/null; then
  log_success "Docker já está instalado"
else
  log_info "Instalando Docker..."
  
  # Adicionar chave GPG oficial do Docker
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Adicionar repositório
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Instalar Docker
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  
  # Iniciar e habilitar
  systemctl start docker
  systemctl enable docker
  
  log_success "Docker instalado com sucesso"
fi

# Verificar Docker Compose
if docker compose version &> /dev/null; then
  log_success "Docker Compose disponível"
else
  log_error "Docker Compose não encontrado"
  exit 1
fi

# =====================================================
# CONFIGURAÇÃO DE FIREWALL
# =====================================================

log_info "Configurando firewall..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Portas adicionais para Swarm
if [ "$DEPLOY_MODE" = "swarm" ]; then
  ufw allow 2377/tcp  # Cluster management
  ufw allow 7946/tcp  # Node communication
  ufw allow 7946/udp
  ufw allow 4789/udp  # Overlay network
fi

ufw --force enable

log_success "Firewall configurado (SSH, HTTP, HTTPS liberados)"

# =====================================================
# CONFIGURAR DOCKER SWARM (se selecionado)
# =====================================================

if [ "$DEPLOY_MODE" = "swarm" ]; then
  if docker info 2>/dev/null | grep -q "Swarm: active"; then
    log_success "Docker Swarm já está ativo"
  else
    log_info "Inicializando Docker Swarm..."
    docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
    log_success "Docker Swarm inicializado"
  fi
fi

# =====================================================
# CRIAR ESTRUTURA DE DIRETÓRIOS
# =====================================================

log_info "Criando estrutura de diretórios..."

mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/certs"
mkdir -p "$INSTALL_DIR/docker"
mkdir -p "$INSTALL_DIR/logs"

log_success "Diretórios criados em $INSTALL_DIR"

# =====================================================
# CRIAR REDE DOCKER
# =====================================================

if [ "$DEPLOY_MODE" = "swarm" ]; then
  if docker network inspect web &> /dev/null; then
    log_success "Rede Docker 'web' já existe"
  else
    log_info "Criando rede overlay..."
    docker network create --driver overlay --attachable web
    log_success "Rede overlay 'web' criada"
  fi
else
  if docker network inspect web &> /dev/null; then
    log_success "Rede Docker 'web' já existe"
  else
    log_info "Criando rede Docker..."
    docker network create web
    log_success "Rede Docker 'web' criada"
  fi
fi

# =====================================================
# CRIAR ARQUIVO .ENV
# =====================================================

log_info "Criando arquivo de configuração..."

cat > "$INSTALL_DIR/.env" << EOF
# =====================================================
# BarberSmart - Configuração de Produção
# Gerado automaticamente em $(date)
# Modo: $DEPLOY_MODE
# =====================================================

# Supabase
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Domínios
MAIN_DOMAIN=$MAIN_DOMAIN
VITE_MAIN_DOMAINS=$MAIN_DOMAIN

# Let's Encrypt
ACME_EMAIL=$ACME_EMAIL

# Docker Image (para Swarm)
REGISTRY=ghcr.io
IMAGE_NAME=${DOCKER_IMAGE:-barbersmart/app}
IMAGE_TAG=latest

# Multi-tenant
VITE_ENABLE_TENANT_DETECTION=true
VITE_TRUST_PROXY_HEADERS=true
VITE_IGNORED_DOMAINS=localhost

# Branding
VITE_DEFAULT_SYSTEM_NAME=BarberSmart
VITE_DEFAULT_TAGLINE=Gestão Inteligente para Barbearias

# PWA
VITE_ENABLE_PWA=true

# Traefik Dashboard (gere uma senha com: htpasswd -nb admin suasenha)
TRAEFIK_DASHBOARD_AUTH=admin:\$\$apr1\$\$ruca84Hq\$\$mbjdMZBAG.KWn7vfN/SNK/
EOF

chmod 600 "$INSTALL_DIR/.env"

log_success "Arquivo .env criado"

# =====================================================
# CRIAR NGINX.CONF
# =====================================================

log_info "Criando configuração do Nginx..."

cat > "$INSTALL_DIR/docker/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$http_x_forwarded_for - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" host="$host"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/xml application/xml+rss text/javascript;

    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    real_ip_header X-Forwarded-For;
    real_ip_recursive on;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location /health {
            access_log off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        error_page 404 /index.html;
    }
}
EOF

log_success "nginx.conf criado"

# =====================================================
# CRIAR DOCKER-COMPOSE OU DOCKER-STACK
# =====================================================

if [ "$DEPLOY_MODE" = "swarm" ]; then
  log_info "Criando docker-stack.yml..."
  
  cat > "$INSTALL_DIR/docker-stack.yml" << EOF
version: "3.8"

services:
  app:
    image: \${REGISTRY:-ghcr.io}/\${IMAGE_NAME}:\${IMAGE_TAG:-latest}
    networks:
      - web
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
        - "traefik.docker.network=web"
        - "traefik.http.routers.barbersmart-main.rule=Host(\\\`\${MAIN_DOMAIN}\\\`) || Host(\\\`www.\${MAIN_DOMAIN}\\\`)"
        - "traefik.http.routers.barbersmart-main.entrypoints=websecure"
        - "traefik.http.routers.barbersmart-main.tls.certresolver=letsencrypt"
        - "traefik.http.routers.barbersmart-main.priority=10"
        - "traefik.http.routers.barbersmart-wildcard.rule=HostRegexp(\\\`{subdomain:[a-z0-9-]+}.\${MAIN_DOMAIN}\\\`)"
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

  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.swarm=true"
      - "--providers.swarm.endpoint=unix:///var/run/docker.sock"
      - "--providers.swarm.exposedbydefault=false"
      - "--providers.swarm.network=web"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=\${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--log.level=INFO"
      - "--accesslog=true"
    ports:
      - target: 80
        published: 80
        protocol: tcp
        mode: host
      - target: 443
        published: 443
        protocol: tcp
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    networks:
      - web
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == manager
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

networks:
  web:
    external: true

volumes:
  traefik-certs:
    driver: local
EOF

  log_success "docker-stack.yml criado"
  
else
  log_info "Criando docker-compose.yml..."

  cat > "$INSTALL_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  barbersmart:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_SUPABASE_URL=\${VITE_SUPABASE_URL}
        - VITE_SUPABASE_ANON_KEY=\${VITE_SUPABASE_ANON_KEY}
        - VITE_MAIN_DOMAINS=\${VITE_MAIN_DOMAINS}
        - VITE_ENABLE_TENANT_DETECTION=\${VITE_ENABLE_TENANT_DETECTION}
        - VITE_TRUST_PROXY_HEADERS=\${VITE_TRUST_PROXY_HEADERS}
        - VITE_DEFAULT_SYSTEM_NAME=\${VITE_DEFAULT_SYSTEM_NAME}
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.barbersmart.rule=Host(\`$MAIN_DOMAIN\`) || Host(\`www.$MAIN_DOMAIN\`) || HostRegexp(\`{subdomain:[a-z0-9-]+}.$MAIN_DOMAIN\`)"
      - "traefik.http.routers.barbersmart.entrypoints=websecure"
      - "traefik.http.routers.barbersmart.tls.certresolver=letsencrypt"
      - "traefik.http.services.barbersmart.loadbalancer.server.port=80"

  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=web"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=\${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
    networks:
      - web
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/certs

networks:
  web:
    external: true
EOF

  log_success "docker-compose.yml criado"
fi

# =====================================================
# CRIAR DOCKERFILE (apenas para Compose)
# =====================================================

if [ "$DEPLOY_MODE" = "compose" ]; then
  log_info "Criando Dockerfile..."

  cat > "$INSTALL_DIR/Dockerfile" << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAIN_DOMAINS
ARG VITE_ENABLE_TENANT_DETECTION=true
ARG VITE_TRUST_PROXY_HEADERS=true
ARG VITE_DEFAULT_SYSTEM_NAME=BarberSmart
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MAIN_DOMAINS=$VITE_MAIN_DOMAINS
ENV VITE_ENABLE_TENANT_DETECTION=$VITE_ENABLE_TENANT_DETECTION
ENV VITE_TRUST_PROXY_HEADERS=$VITE_TRUST_PROXY_HEADERS
ENV VITE_DEFAULT_SYSTEM_NAME=$VITE_DEFAULT_SYSTEM_NAME
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
EOF

  log_success "Dockerfile criado"
fi

# =====================================================
# CRIAR SCRIPTS AUXILIARES
# =====================================================

log_info "Criando scripts auxiliares..."

if [ "$DEPLOY_MODE" = "swarm" ]; then
  # Scripts para Swarm
  cat > "$INSTALL_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Iniciando deploy no Swarm..."

# Carregar variáveis
export $(grep -v '^#' .env | xargs)

# Deploy do stack
docker stack deploy -c docker-stack.yml barbersmart

echo "✅ Deploy concluído!"
echo ""
docker service ls
EOF

  cat > "$INSTALL_DIR/update.sh" << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🔄 Atualizando imagem..."

# Carregar variáveis
export $(grep -v '^#' .env | xargs)

# Pull nova imagem
docker pull ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG:-latest}

# Force update do serviço
docker service update --force barbersmart_app

echo "✅ Atualização concluída!"
EOF

  cat > "$INSTALL_DIR/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "⏪ Fazendo rollback..."
docker service rollback barbersmart_app
echo "✅ Rollback concluído!"
EOF

  cat > "$INSTALL_DIR/scale.sh" << 'EOF'
#!/bin/bash
REPLICAS=${1:-2}
echo "📈 Escalando para $REPLICAS replicas..."
docker service scale barbersmart_app=$REPLICAS
echo "✅ Escalonamento concluído!"
docker service ls
EOF

  chmod +x "$INSTALL_DIR/update.sh"
  chmod +x "$INSTALL_DIR/rollback.sh"
  chmod +x "$INSTALL_DIR/scale.sh"

  cat > "$INSTALL_DIR/logs.sh" << 'EOF'
#!/bin/bash
SERVICE=${1:-barbersmart_app}
docker service logs -f --tail=100 $SERVICE
EOF

  cat > "$INSTALL_DIR/status.sh" << 'EOF'
#!/bin/bash
echo "=== Status dos Serviços ==="
docker service ls
echo ""
echo "=== Replicas do App ==="
docker service ps barbersmart_app
echo ""
echo "=== Uso de Recursos ==="
docker stats --no-stream
EOF

else
  # Scripts para Compose
  cat > "$INSTALL_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Iniciando deploy..."

# Pull latest code (se for git)
if [ -d .git ]; then
  git pull origin main
fi

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

echo "✅ Deploy concluído!"
docker compose ps
EOF

  cat > "$INSTALL_DIR/logs.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose logs -f --tail=100 "$@"
EOF

  cat > "$INSTALL_DIR/status.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "=== Status dos Containers ==="
docker compose ps
echo ""
echo "=== Uso de Recursos ==="
docker stats --no-stream
EOF
fi

chmod +x "$INSTALL_DIR/deploy.sh"
chmod +x "$INSTALL_DIR/logs.sh"
chmod +x "$INSTALL_DIR/status.sh"

log_success "Scripts auxiliares criados"

# =====================================================
# INSTRUÇÕES FINAIS
# =====================================================

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'IP_DA_VPS')

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║            ✅ SETUP CONCLUÍDO COM SUCESSO!                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Modo de Deploy: ${YELLOW}$DEPLOY_MODE${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure seu DNS:"
echo "   - A    @    → $VPS_IP"
echo "   - A    *    → $VPS_IP"
echo ""

if [ "$DEPLOY_MODE" = "swarm" ]; then
  echo "2. Faça build e push da imagem (na sua máquina local ou CI/CD):"
  echo "   docker build \\"
  echo "     --build-arg VITE_SUPABASE_URL=\"$SUPABASE_URL\" \\"
  echo "     --build-arg VITE_SUPABASE_ANON_KEY=\"***\" \\"
  echo "     --build-arg VITE_MAIN_DOMAINS=\"$MAIN_DOMAIN\" \\"
  echo "     -t $DOCKER_IMAGE:latest ."
  echo "   docker push $DOCKER_IMAGE:latest"
  echo ""
  echo "3. Faça o deploy:"
  echo "   cd $INSTALL_DIR"
  echo "   ./deploy.sh"
  echo ""
  echo -e "${YELLOW}COMANDOS ÚTEIS:${NC}"
  echo "   ./deploy.sh   - Deploy do stack"
  echo "   ./update.sh   - Atualizar imagem"
  echo "   ./rollback.sh - Voltar versão anterior"
  echo "   ./scale.sh 3  - Escalar para 3 replicas"
  echo "   ./logs.sh     - Ver logs"
  echo "   ./status.sh   - Status dos serviços"
else
  echo "2. Clone seu repositório:"
  echo "   cd $INSTALL_DIR"
  echo "   git clone <seu-repositorio> ."
  echo ""
  echo "3. Faça o deploy:"
  echo "   ./deploy.sh"
  echo ""
  echo -e "${YELLOW}COMANDOS ÚTEIS:${NC}"
  echo "   ./deploy.sh  - Rebuild e reiniciar"
  echo "   ./logs.sh    - Ver logs"
  echo "   ./status.sh  - Status dos containers"
fi

echo ""
echo -e "${BLUE}Arquivos de configuração em: $INSTALL_DIR${NC}"
echo ""
