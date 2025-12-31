#!/bin/bash

# =====================================================
# BarberSmart - Instalador de Git Hooks
# =====================================================
# Uso: ./scripts/setup-hooks.sh
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/hooks"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🔧 BarberSmart - Instalador de Git Hooks${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Este diretório não é um repositório Git.${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Install each hook
INSTALLED=0

for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        HOOK_NAME=$(basename "$hook")
        TARGET="$GIT_HOOKS_DIR/$HOOK_NAME"
        
        # Backup existing hook if it exists and is different
        if [ -f "$TARGET" ] && ! diff -q "$hook" "$TARGET" > /dev/null 2>&1; then
            BACKUP="$TARGET.backup.$(date +%Y%m%d%H%M%S)"
            echo -e "${YELLOW}📦 Backup do hook existente: $HOOK_NAME${NC}"
            mv "$TARGET" "$BACKUP"
        fi
        
        # Copy hook
        cp "$hook" "$TARGET"
        chmod +x "$TARGET"
        
        echo -e "${GREEN}✅ Instalado: $HOOK_NAME${NC}"
        ((INSTALLED++))
    fi
done

echo ""
if [ $INSTALLED -gt 0 ]; then
    echo -e "${GREEN}🎉 $INSTALLED hook(s) instalado(s) com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}Hooks ativos:${NC}"
    echo -e "  ${CYAN}commit-msg${NC}  - Valida formato de mensagem (Conventional Commits)"
    echo -e "  ${CYAN}pre-commit${NC}  - Verifica código antes do commit"
    echo ""
    echo -e "${YELLOW}Para desativar temporariamente:${NC}"
    echo -e "  ${CYAN}git commit --no-verify${NC}"
else
    echo -e "${YELLOW}⚠️  Nenhum hook encontrado para instalar.${NC}"
fi
