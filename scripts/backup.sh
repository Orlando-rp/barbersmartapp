#!/bin/bash

# =====================================================
# BarberSmart - Backup Script
# =====================================================
# Faz backup dos certificados e configurações
# =====================================================

set -e

BACKUP_DIR="/opt/barbersmart-backups"
DATE=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="${1:-/opt/barbersmart}"

echo "📦 BarberSmart - Backup"
echo ""

mkdir -p "$BACKUP_DIR"

# Criar backup
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

tar -czf "$BACKUP_FILE" \
  -C "$INSTALL_DIR" \
  .env \
  certs/ \
  docker/ \
  2>/dev/null || true

echo "✅ Backup criado: $BACKUP_FILE"

# Limpar backups antigos (manter últimos 7)
ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "🧹 Backups antigos removidos (mantendo últimos 7)"
echo ""
echo "Backups disponíveis:"
ls -lh "$BACKUP_DIR"
