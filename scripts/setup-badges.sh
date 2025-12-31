#!/bin/bash

# =====================================================
# BarberSmart - Configurador de Badges do README
# =====================================================
# Uso: ./scripts/setup-badges.sh
# Atualiza automaticamente os badges no README.md
# com o usuário correto do GitHub e Docker Hub
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
README_FILE="$PROJECT_DIR/README.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🔧 BarberSmart - Configurador de Badges${NC}"
echo ""

# Check if README exists
if [ ! -f "$README_FILE" ]; then
    echo -e "${RED}❌ README.md não encontrado em $README_FILE${NC}"
    exit 1
fi

# Get GitHub username from remote URL
GITHUB_URL=$(git remote get-url origin 2>/dev/null || echo "")
GITHUB_USER=""
GITHUB_REPO=""

if [ -n "$GITHUB_URL" ]; then
    # Extract user/repo from various URL formats
    # git@github.com:user/repo.git
    # https://github.com/user/repo.git
    # https://github.com/user/repo
    
    if [[ "$GITHUB_URL" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        GITHUB_USER="${BASH_REMATCH[1]}"
        GITHUB_REPO="${BASH_REMATCH[2]}"
        GITHUB_REPO="${GITHUB_REPO%.git}" # Remove .git suffix if present
    fi
fi

echo -e "${CYAN}📦 Detectando configurações...${NC}"
echo ""

# Confirm or ask for GitHub user
if [ -n "$GITHUB_USER" ]; then
    echo -e "GitHub User detectado: ${GREEN}$GITHUB_USER${NC}"
    read -p "Usar este usuário? (s/n) [s]: " confirm_github
    confirm_github=${confirm_github:-s}
    
    if [[ "$confirm_github" != "s" && "$confirm_github" != "S" ]]; then
        read -p "Digite o usuário do GitHub: " GITHUB_USER
    fi
else
    read -p "Digite o usuário do GitHub: " GITHUB_USER
fi

# Confirm or ask for GitHub repo
if [ -n "$GITHUB_REPO" ]; then
    echo -e "GitHub Repo detectado: ${GREEN}$GITHUB_REPO${NC}"
    read -p "Usar este repositório? (s/n) [s]: " confirm_repo
    confirm_repo=${confirm_repo:-s}
    
    if [[ "$confirm_repo" != "s" && "$confirm_repo" != "S" ]]; then
        read -p "Digite o nome do repositório: " GITHUB_REPO
    fi
else
    read -p "Digite o nome do repositório GitHub: " GITHUB_REPO
fi

# Ask for Docker Hub username
echo ""
read -p "Digite o usuário do Docker Hub [$GITHUB_USER]: " DOCKER_USER
DOCKER_USER=${DOCKER_USER:-$GITHUB_USER}

# Ask for Docker image name
read -p "Digite o nome da imagem Docker [barbersmartapp]: " DOCKER_IMAGE
DOCKER_IMAGE=${DOCKER_IMAGE:-barbersmartapp}

echo ""
echo -e "${BLUE}📝 Configurações a serem aplicadas:${NC}"
echo -e "  GitHub: ${CYAN}$GITHUB_USER/$GITHUB_REPO${NC}"
echo -e "  Docker: ${CYAN}$DOCKER_USER/$DOCKER_IMAGE${NC}"
echo ""

read -p "Confirmar e atualizar README.md? (s/n): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo -e "${YELLOW}❌ Operação cancelada.${NC}"
    exit 0
fi

# Update README.md
echo -e "${BLUE}📝 Atualizando README.md...${NC}"

# Create backup
cp "$README_FILE" "$README_FILE.backup"

# Replace placeholders
sed -i.tmp \
    -e "s|seu-usuario/barbersmart|$GITHUB_USER/$GITHUB_REPO|g" \
    -e "s|seu-usuario/barbersmartapp|$DOCKER_USER/$DOCKER_IMAGE|g" \
    "$README_FILE"

# Remove temp file created by sed on macOS
rm -f "$README_FILE.tmp"

echo ""
echo -e "${GREEN}✅ README.md atualizado com sucesso!${NC}"
echo ""
echo -e "${CYAN}Badges configurados:${NC}"
echo -e "  📦 Versão: https://img.shields.io/github/v/release/$GITHUB_USER/$GITHUB_REPO"
echo -e "  🔨 Build:  https://img.shields.io/github/actions/workflow/status/$GITHUB_USER/$GITHUB_REPO/build-push.yml"
echo -e "  🐳 Docker: https://img.shields.io/docker/v/$DOCKER_USER/$DOCKER_IMAGE"
echo ""
echo -e "${YELLOW}Backup salvo em: README.md.backup${NC}"
