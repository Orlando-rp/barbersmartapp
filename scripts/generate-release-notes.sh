#!/bin/bash

# =====================================================
# BarberSmart - Gerador de Release Notes (HTML/JSON)
# =====================================================
# Uso: ./scripts/generate-release-notes.sh [--html|--json]
# Saída: public/release-notes.html ou public/release-notes.json
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CHANGELOG_FILE="$PROJECT_DIR/CHANGELOG.md"
OUTPUT_DIR="$PROJECT_DIR/public"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default format
FORMAT=${1:-"--json"}

echo -e "${BLUE}📋 Gerando Release Notes...${NC}"

# Check if CHANGELOG.md exists
if [ ! -f "$CHANGELOG_FILE" ]; then
    echo -e "${YELLOW}⚠️  CHANGELOG.md não encontrado. Criando arquivo vazio.${NC}"
    mkdir -p "$OUTPUT_DIR"
    
    if [ "$FORMAT" == "--html" ]; then
        echo "<div class='release-notes'><p>Nenhuma release encontrada.</p></div>" > "$OUTPUT_DIR/release-notes.html"
    else
        echo '{"releases":[],"generated_at":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > "$OUTPUT_DIR/release-notes.json"
    fi
    exit 0
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Parse CHANGELOG.md and generate output
node << 'NODEJS_SCRIPT'
const fs = require('fs');
const path = require('path');

const projectDir = process.env.PROJECT_DIR || path.join(__dirname, '..');
const changelogPath = path.join(projectDir, 'CHANGELOG.md');
const outputDir = path.join(projectDir, 'public');
const format = process.env.FORMAT || '--json';

// Read changelog
const changelog = fs.readFileSync(changelogPath, 'utf8');

// Parse releases
const releases = [];
const lines = changelog.split('\n');
let currentRelease = null;
let currentSection = null;

for (const line of lines) {
  // Match version header: ## [v1.0.0] - 2024-01-01
  const versionMatch = line.match(/^## \[?(v?\d+\.\d+\.\d+)\]?\s*-?\s*(\d{4}-\d{2}-\d{2})?/);
  
  if (versionMatch) {
    if (currentRelease) {
      releases.push(currentRelease);
    }
    currentRelease = {
      version: versionMatch[1],
      date: versionMatch[2] || null,
      sections: {}
    };
    currentSection = null;
    continue;
  }
  
  if (!currentRelease) continue;
  
  // Match section header: ### ✨ Novas Funcionalidades
  const sectionMatch = line.match(/^### (.+)$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1].trim();
    currentRelease.sections[currentSection] = [];
    continue;
  }
  
  // Match list item: - Description (`abc1234`)
  const itemMatch = line.match(/^- (.+)$/);
  if (itemMatch && currentSection) {
    const item = itemMatch[1].trim();
    // Extract commit hash if present
    const hashMatch = item.match(/\(`([a-f0-9]{7})`\)$/);
    currentRelease.sections[currentSection].push({
      text: hashMatch ? item.replace(/\s*\(`[a-f0-9]{7}`\)$/, '') : item,
      hash: hashMatch ? hashMatch[1] : null
    });
  }
}

// Don't forget the last release
if (currentRelease) {
  releases.push(currentRelease);
}

// Generate output
const generatedAt = new Date().toISOString();

if (format === '--html') {
  // Generate HTML
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release Notes - BarberSmart</title>
  <style>
    :root {
      --primary: #8B5CF6;
      --primary-light: #A78BFA;
      --bg: #0F0F0F;
      --card: #1A1A1A;
      --border: #2A2A2A;
      --text: #FAFAFA;
      --text-muted: #A1A1AA;
      --success: #22C55E;
      --warning: #F59E0B;
      --error: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
    .release {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .release-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .version {
      background: var(--primary);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .date { color: var(--text-muted); font-size: 0.875rem; }
    .section { margin-bottom: 1rem; }
    .section:last-child { margin-bottom: 0; }
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    .section-title.breaking { color: var(--error); }
    .section-title.features { color: var(--success); }
    .section-title.fixes { color: var(--warning); }
    ul { list-style: none; padding-left: 0; }
    li {
      padding: 0.375rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    li::before {
      content: "•";
      position: absolute;
      left: 0.5rem;
      color: var(--primary);
    }
    .hash {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
      opacity: 0.6;
    }
    .empty { color: var(--text-muted); text-align: center; padding: 3rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Release Notes</h1>
    <p class="subtitle">Histórico de atualizações do BarberSmart</p>
`;

  if (releases.length === 0) {
    html += '    <div class="empty">Nenhuma release encontrada.</div>\n';
  } else {
    for (const release of releases) {
      html += `
    <div class="release">
      <div class="release-header">
        <span class="version">${release.version}</span>
        ${release.date ? `<span class="date">${release.date}</span>` : ''}
      </div>
`;
      
      for (const [sectionName, items] of Object.entries(release.sections)) {
        if (items.length === 0) continue;
        
        let sectionClass = '';
        if (sectionName.includes('BREAKING')) sectionClass = 'breaking';
        else if (sectionName.includes('Funcionalidades') || sectionName.includes('Features')) sectionClass = 'features';
        else if (sectionName.includes('Correções') || sectionName.includes('Fixes')) sectionClass = 'fixes';
        
        html += `      <div class="section">
        <div class="section-title ${sectionClass}">${sectionName}</div>
        <ul>
`;
        for (const item of items) {
          html += `          <li>${item.text}${item.hash ? ` <span class="hash">${item.hash}</span>` : ''}</li>\n`;
        }
        html += `        </ul>
      </div>
`;
      }
      
      html += `    </div>
`;
    }
  }

  html += `  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'release-notes.html'), html);
  console.log('✅ Gerado: public/release-notes.html');
  
} else {
  // Generate JSON
  const json = {
    releases,
    total: releases.length,
    latest: releases[0] || null,
    generated_at: generatedAt
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'release-notes.json'),
    JSON.stringify(json, null, 2)
  );
  console.log('✅ Gerado: public/release-notes.json');
}
NODEJS_SCRIPT

echo -e "${GREEN}✅ Release notes geradas com sucesso!${NC}"
