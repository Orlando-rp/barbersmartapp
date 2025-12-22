#!/bin/bash

# =====================================================
# BarberSmart - Quick Deploy Script
# =====================================================
# Execute após o setup.sh para fazer o deploy
# =====================================================

set -e

cd "$(dirname "$0")/.."

echo "🚀 BarberSmart - Quick Deploy"
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado!"
  echo "Execute primeiro: sudo bash scripts/setup.sh"
  exit 1
fi

# Carregar variáveis
source .env

echo "📦 Construindo containers..."
docker compose build --no-cache

echo "🔄 Iniciando serviços..."
docker compose up -d

echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

echo ""
echo "📊 Status:"
docker compose ps

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "Acesse: https://$MAIN_DOMAIN"
echo ""
echo "Comandos úteis:"
echo "  docker compose logs -f        # Ver logs"
echo "  docker compose ps             # Status"
echo "  docker compose restart        # Reiniciar"
