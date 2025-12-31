#!/bin/bash

# =====================================================
# BarberSmart - Script de Release Automático
# =====================================================
# Uso: ./scripts/release.sh [patch|minor|major]
# Exemplos:
#   ./scripts/release.sh patch  -> v1.0.0 => v1.0.1
#   ./scripts/release.sh minor  -> v1.0.0 => v1.1.0
#   ./scripts/release.sh major  -> v1.0.0 => v2.0.0
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the release type from argument or ask
RELEASE_TYPE=${1:-""}

if [ -z "$RELEASE_TYPE" ]; then
    echo -e "${BLUE}🚀 BarberSmart Release Script${NC}"
    echo ""
    echo "Qual tipo de release?"
    echo "  1) patch (correções de bugs)"
    echo "  2) minor (novas funcionalidades)"
    echo "  3) major (mudanças breaking)"
    echo ""
    read -p "Escolha (1/2/3): " choice
    
    case $choice in
        1) RELEASE_TYPE="patch" ;;
        2) RELEASE_TYPE="minor" ;;
        3) RELEASE_TYPE="major" ;;
        *) echo -e "${RED}Opção inválida${NC}"; exit 1 ;;
    esac
fi

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}❌ Tipo de release inválido: $RELEASE_TYPE${NC}"
    echo "Use: patch, minor ou major"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}⚠️  Existem alterações não commitadas.${NC}"
    read -p "Deseja fazer commit antes de continuar? (s/n): " do_commit
    
    if [[ "$do_commit" == "s" || "$do_commit" == "S" ]]; then
        read -p "Mensagem do commit: " commit_msg
        git add .
        git commit -m "$commit_msg"
    else
        echo -e "${RED}❌ Faça commit das alterações antes de criar uma release.${NC}"
        exit 1
    fi
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
echo -e "${BLUE}📦 Versão atual: v$CURRENT_VERSION${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment version based on type
case $RELEASE_TYPE in
    patch)
        PATCH=$((PATCH + 1))
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TAG_NAME="v$NEW_VERSION"

echo -e "${GREEN}🆕 Nova versão: $TAG_NAME${NC}"

# Confirm
read -p "Continuar com a release $TAG_NAME? (s/n): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo -e "${YELLOW}❌ Release cancelada.${NC}"
    exit 0
fi

# Update version in package.json (using node for cross-platform compatibility)
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ package.json atualizado');
"

# Commit version change
git add package.json
git commit -m "chore: release $TAG_NAME"

# Create tag
git tag -a "$TAG_NAME" -m "Release $TAG_NAME"

echo ""
echo -e "${GREEN}✅ Tag $TAG_NAME criada localmente!${NC}"
echo ""

# Ask to push
read -p "Deseja fazer push para o GitHub (isso irá disparar o deploy)? (s/n): " do_push

if [[ "$do_push" == "s" || "$do_push" == "S" ]]; then
    echo -e "${BLUE}📤 Enviando para GitHub...${NC}"
    git push origin HEAD
    git push origin "$TAG_NAME"
    
    echo ""
    echo -e "${GREEN}🎉 Release $TAG_NAME publicada com sucesso!${NC}"
    echo -e "${BLUE}🚀 O deploy será iniciado automaticamente.${NC}"
    echo ""
    echo "Acompanhe em: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
else
    echo ""
    echo -e "${YELLOW}📌 Tag criada mas NÃO enviada.${NC}"
    echo "Para fazer deploy manualmente, execute:"
    echo -e "  ${BLUE}git push origin HEAD${NC}"
    echo -e "  ${BLUE}git push origin $TAG_NAME${NC}"
fi
