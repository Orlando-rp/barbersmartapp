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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
DATE=$(date +"%Y-%m-%d")

echo -e "${GREEN}🆕 Nova versão: $TAG_NAME${NC}"
echo ""

# Generate changelog
echo -e "${CYAN}📋 Gerando changelog...${NC}"
echo ""

# Get the starting point (last tag)
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Initialize arrays for different commit types
declare -a FEATURES=()
declare -a FIXES=()
declare -a BREAKING=()
declare -a DOCS=()
declare -a REFACTOR=()
declare -a PERF=()
declare -a CHORE=()
declare -a OTHER=()

# Determine range
if [ -z "$LAST_TAG" ]; then
    RANGE="HEAD"
else
    RANGE="$LAST_TAG..HEAD"
fi

# Parse commits
while IFS= read -r line; do
    [ -z "$line" ] && continue
    
    HASH=$(echo "$line" | cut -d' ' -f1)
    MSG=$(echo "$line" | cut -d' ' -f2-)
    SHORT_HASH="${HASH:0:7}"
    
    # Check for breaking changes
    if [[ "$MSG" =~ ^.*!: ]] || [[ "$MSG" =~ BREAKING ]]; then
        BREAKING+=("- $MSG (\`$SHORT_HASH\`)")
        continue
    fi
    
    # Categorize by conventional commit prefix
    case "$MSG" in
        feat:*|feat\(*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^feat(\([^)]*\))?: //')
            FEATURES+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        fix:*|fix\(*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^fix(\([^)]*\))?: //')
            FIXES+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        docs:*|docs\(*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^docs(\([^)]*\))?: //')
            DOCS+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        refactor:*|refactor\(*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^refactor(\([^)]*\))?: //')
            REFACTOR+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        perf:*|perf\(*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^perf(\([^)]*\))?: //')
            PERF+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        chore:*|chore\(*|build:*|ci:*) 
            CLEAN_MSG=$(echo "$MSG" | sed -E 's/^(chore|build|ci)(\([^)]*\))?: //')
            CHORE+=("- $CLEAN_MSG (\`$SHORT_HASH\`)")
            ;;
        *)
            if [[ ! "$MSG" =~ ^Merge ]] && [[ ! "$MSG" =~ ^release ]]; then
                OTHER+=("- $MSG (\`$SHORT_HASH\`)")
            fi
            ;;
    esac
done < <(git log --oneline $RANGE 2>/dev/null)

# Build changelog content
CHANGELOG_CONTENT=""

if [ ${#BREAKING[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### ⚠️ BREAKING CHANGES\n\n"
    for item in "${BREAKING[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#FEATURES[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### ✨ Novas Funcionalidades\n\n"
    for item in "${FEATURES[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#FIXES[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### 🐛 Correções\n\n"
    for item in "${FIXES[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#PERF[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### ⚡ Performance\n\n"
    for item in "${PERF[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#REFACTOR[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### ♻️ Refatoração\n\n"
    for item in "${REFACTOR[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#DOCS[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### 📚 Documentação\n\n"
    for item in "${DOCS[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#CHORE[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### 🔧 Manutenção\n\n"
    for item in "${CHORE[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

if [ ${#OTHER[@]} -gt 0 ]; then
    CHANGELOG_CONTENT+="\n### 📦 Outras Alterações\n\n"
    for item in "${OTHER[@]}"; do
        CHANGELOG_CONTENT+="$item\n"
    done
fi

# Display changelog
TOTAL=$((${#FEATURES[@]} + ${#FIXES[@]} + ${#BREAKING[@]} + ${#DOCS[@]} + ${#REFACTOR[@]} + ${#PERF[@]} + ${#CHORE[@]} + ${#OTHER[@]}))

if [ $TOTAL -gt 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "$CHANGELOG_CONTENT"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}📊 Total: $TOTAL alterações${NC}"
    echo ""
else
    echo -e "${YELLOW}📭 Nenhuma alteração encontrada desde a última tag.${NC}"
    CHANGELOG_CONTENT="\n_Nenhuma alteração registrada._\n"
fi

# Confirm
read -p "Continuar com a release $TAG_NAME? (s/n): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo -e "${YELLOW}❌ Release cancelada.${NC}"
    exit 0
fi

# Update CHANGELOG.md
CHANGELOG_FILE="CHANGELOG.md"
NEW_ENTRY="## [$TAG_NAME] - $DATE\n$CHANGELOG_CONTENT\n"

if [ -f "$CHANGELOG_FILE" ]; then
    # Prepend new entry after the header
    echo -e "${BLUE}📝 Atualizando CHANGELOG.md...${NC}"
    
    # Read existing content
    EXISTING=$(cat "$CHANGELOG_FILE")
    
    # Check if there's a header
    if [[ "$EXISTING" =~ ^#[[:space:]]+ ]]; then
        # Extract header (first line) and rest
        HEADER=$(echo "$EXISTING" | head -n 2)
        REST=$(echo "$EXISTING" | tail -n +3)
        
        # Write new content
        echo -e "$HEADER\n\n$NEW_ENTRY\n$REST" > "$CHANGELOG_FILE"
    else
        # No header, just prepend
        echo -e "$NEW_ENTRY\n$EXISTING" > "$CHANGELOG_FILE"
    fi
else
    # Create new changelog file
    echo -e "${BLUE}📝 Criando CHANGELOG.md...${NC}"
    cat > "$CHANGELOG_FILE" << EOF
# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

$NEW_ENTRY
EOF
fi

# Update version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ package.json atualizado');
"

# Generate release-notes.json for What's New notification
echo -e "${BLUE}📋 Gerando release-notes.json...${NC}"
chmod +x "$SCRIPT_DIR/generate-release-notes.sh" 2>/dev/null || true
"$SCRIPT_DIR/generate-release-notes.sh" --json 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível gerar release-notes.json${NC}"

# Commit version change, changelog and release notes
git add package.json CHANGELOG.md public/release-notes.json 2>/dev/null || git add package.json CHANGELOG.md
git commit -m "chore: release $TAG_NAME"

# Create annotated tag with changelog
TAG_MESSAGE="Release $TAG_NAME

$(echo -e "$CHANGELOG_CONTENT" | sed 's/\\n/\n/g')"

git tag -a "$TAG_NAME" -m "$TAG_MESSAGE"

echo ""
echo -e "${GREEN}✅ Tag $TAG_NAME criada localmente!${NC}"
echo ""

# Ask to push
read -p "Deseja fazer push para o GitHub (isso irá disparar o deploy)? (s/n): " do_push

if [[ "$do_push" == "s" || "$do_push" == "S" ]]; then
    echo -e "${BLUE}📤 Enviando para GitHub...${NC}"
    git push origin HEAD
    git push origin "$TAG_NAME"
    
    REPO_URL=$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/\.git$//')
    
    echo ""
    echo -e "${GREEN}🎉 Release $TAG_NAME publicada com sucesso!${NC}"
    echo -e "${BLUE}🚀 O deploy será iniciado automaticamente.${NC}"
    echo ""
    echo -e "Acompanhe em: ${CYAN}https://github.com/$REPO_URL/actions${NC}"
    echo -e "Release: ${CYAN}https://github.com/$REPO_URL/releases/tag/$TAG_NAME${NC}"
else
    echo ""
    echo -e "${YELLOW}📌 Tag criada mas NÃO enviada.${NC}"
    echo "Para fazer deploy manualmente, execute:"
    echo -e "  ${BLUE}git push origin HEAD${NC}"
    echo -e "  ${BLUE}git push origin $TAG_NAME${NC}"
fi
