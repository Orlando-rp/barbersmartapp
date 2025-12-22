#!/bin/bash

# =====================================================
# BarberSmart - Script de Setup Automatizado
# =====================================================
# Este script configura uma VPS nova para rodar o BarberSmart
# Testado em: Ubuntu 22.04 LTS, Debian 12
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

# Diretório de instalação
INSTALL_DIR="/opt/barbersmart"
read -p "Diretório de instalação [$INSTALL_DIR]: " input
INSTALL_DIR="${input:-$INSTALL_DIR}"

echo ""
log_info "Configuração:"
echo "  Domínio: $MAIN_DOMAIN"
echo "  Email: $ACME_EMAIL"
echo "  Supabase: $SUPABASE_URL"
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
ufw --force enable

log_success "Firewall configurado (SSH, HTTP, HTTPS liberados)"

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

if docker network inspect web &> /dev/null; then
  log_success "Rede Docker 'web' já existe"
else
  log_info "Criando rede Docker..."
  docker network create web
  log_success "Rede Docker 'web' criada"
fi

# =====================================================
# CRIAR ARQUIVO .ENV
# =====================================================

log_info "Criando arquivo de configuração..."

cat > "$INSTALL_DIR/.env" << EOF
# =====================================================
# BarberSmart - Configuração de Produção
# Gerado automaticamente em $(date)
# =====================================================

# Supabase
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Domínios
MAIN_DOMAIN=$MAIN_DOMAIN
VITE_MAIN_DOMAINS=$MAIN_DOMAIN

# Let's Encrypt
ACME_EMAIL=$ACME_EMAIL

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
# CRIAR DOCKER-COMPOSE.YML
# =====================================================

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

# =====================================================
# CRIAR DOCKERFILE
# =====================================================

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

# =====================================================
# CRIAR SCRIPT DE DEPLOY
# =====================================================

log_info "Criando scripts auxiliares..."

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

chmod +x "$INSTALL_DIR/deploy.sh"

cat > "$INSTALL_DIR/logs.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose logs -f --tail=100 "$@"
EOF

chmod +x "$INSTALL_DIR/logs.sh"

cat > "$INSTALL_DIR/status.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "=== Status dos Containers ==="
docker compose ps
echo ""
echo "=== Uso de Recursos ==="
docker stats --no-stream
EOF

chmod +x "$INSTALL_DIR/status.sh"

log_success "Scripts auxiliares criados"

# =====================================================
# INSTRUÇÕES FINAIS
# =====================================================

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║            ✅ SETUP CONCLUÍDO COM SUCESSO!                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure seu DNS:"
echo "   - A    @    → $(curl -s ifconfig.me 2>/dev/null || echo 'IP_DA_VPS')"
echo "   - A    *    → $(curl -s ifconfig.me 2>/dev/null || echo 'IP_DA_VPS')"
echo ""
echo "2. Clone seu repositório:"
echo "   cd $INSTALL_DIR"
echo "   git clone <seu-repositorio> ."
echo ""
echo "3. Faça o deploy:"
echo "   cd $INSTALL_DIR"
echo "   ./deploy.sh"
echo ""
echo -e "${YELLOW}COMANDOS ÚTEIS:${NC}"
echo "   ./deploy.sh  - Rebuild e reiniciar"
echo "   ./logs.sh    - Ver logs"
echo "   ./status.sh  - Status dos containers"
echo ""
echo -e "${BLUE}Arquivos de configuração em: $INSTALL_DIR${NC}"
echo ""
