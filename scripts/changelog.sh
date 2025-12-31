#!/bin/bash

# =====================================================
# BarberSmart - Gerador de Changelog Automático
# =====================================================
# Uso: ./scripts/changelog.sh [tag]
# Exemplos:
#   ./scripts/changelog.sh           # changelog desde última tag
#   ./scripts/changelog.sh v1.0.0    # changelog desde v1.0.0
# =====================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get the starting point (tag or first commit)
START_TAG=${1:-$(git describe --tags --abbrev=0 2>/dev/null || echo "")}

if [ -z "$START_TAG" ]; then
    echo -e "${YELLOW}⚠️  Nenhuma tag encontrada. Gerando changelog desde o início.${NC}"
    RANGE="HEAD"
else
    echo -e "${BLUE}📋 Gerando changelog desde: $START_TAG${NC}"
    RANGE="$START_TAG..HEAD"
fi

# Get current date
DATE=$(date +"%Y-%m-%d")

# Initialize arrays for different commit types
declare -a FEATURES=()
declare -a FIXES=()
declare -a BREAKING=()
declare -a DOCS=()
declare -a STYLE=()
declare -a REFACTOR=()
declare -a PERF=()
declare -a CHORE=()
declare -a OTHER=()

# Parse commits
while IFS= read -r line; do
    [ -z "$line" ] && continue
    
    # Extract commit hash and message
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
            FEATURES+=("- ${MSG#feat: } (\`$SHORT_HASH\`)")
            ;;
        fix:*|fix\(*) 
            FIXES+=("- ${MSG#fix: } (\`$SHORT_HASH\`)")
            ;;
        docs:*|docs\(*) 
            DOCS+=("- ${MSG#docs: } (\`$SHORT_HASH\`)")
            ;;
        style:*|style\(*) 
            STYLE+=("- ${MSG#style: } (\`$SHORT_HASH\`)")
            ;;
        refactor:*|refactor\(*) 
            REFACTOR+=("- ${MSG#refactor: } (\`$SHORT_HASH\`)")
            ;;
        perf:*|perf\(*) 
            PERF+=("- ${MSG#perf: } (\`$SHORT_HASH\`)")
            ;;
        chore:*|chore\(*|build:*|ci:*) 
            CHORE+=("- ${MSG#chore: } (\`$SHORT_HASH\`)")
            ;;
        *)
            # Skip merge commits
            if [[ ! "$MSG" =~ ^Merge ]]; then
                OTHER+=("- $MSG (\`$SHORT_HASH\`)")
            fi
            ;;
    esac
done < <(git log --oneline $RANGE 2>/dev/null)

# Count total changes
TOTAL=$((${#FEATURES[@]} + ${#FIXES[@]} + ${#BREAKING[@]} + ${#DOCS[@]} + ${#STYLE[@]} + ${#REFACTOR[@]} + ${#PERF[@]} + ${#CHORE[@]} + ${#OTHER[@]}))

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}📭 Nenhuma alteração encontrada desde $START_TAG${NC}"
    exit 0
fi

# Generate changelog content
CHANGELOG=""

# Breaking Changes
if [ ${#BREAKING[@]} -gt 0 ]; then
    CHANGELOG+="\n### ⚠️ BREAKING CHANGES\n\n"
    for item in "${BREAKING[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Features
if [ ${#FEATURES[@]} -gt 0 ]; then
    CHANGELOG+="\n### ✨ Novas Funcionalidades\n\n"
    for item in "${FEATURES[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Bug Fixes
if [ ${#FIXES[@]} -gt 0 ]; then
    CHANGELOG+="\n### 🐛 Correções\n\n"
    for item in "${FIXES[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Performance
if [ ${#PERF[@]} -gt 0 ]; then
    CHANGELOG+="\n### ⚡ Performance\n\n"
    for item in "${PERF[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Refactor
if [ ${#REFACTOR[@]} -gt 0 ]; then
    CHANGELOG+="\n### ♻️ Refatoração\n\n"
    for item in "${REFACTOR[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Documentation
if [ ${#DOCS[@]} -gt 0 ]; then
    CHANGELOG+="\n### 📚 Documentação\n\n"
    for item in "${DOCS[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Style
if [ ${#STYLE[@]} -gt 0 ]; then
    CHANGELOG+="\n### 💄 Estilo\n\n"
    for item in "${STYLE[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Chores
if [ ${#CHORE[@]} -gt 0 ]; then
    CHANGELOG+="\n### 🔧 Manutenção\n\n"
    for item in "${CHORE[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Other
if [ ${#OTHER[@]} -gt 0 ]; then
    CHANGELOG+="\n### 📦 Outras Alterações\n\n"
    for item in "${OTHER[@]}"; do
        CHANGELOG+="$item\n"
    done
fi

# Output
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📋 CHANGELOG${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "$CHANGELOG"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Total: $TOTAL alterações${NC}"
echo ""

# Export for use in release script
export CHANGELOG_CONTENT="$CHANGELOG"
