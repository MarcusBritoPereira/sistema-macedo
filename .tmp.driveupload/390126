#!/bin/bash
set -e

echo "🚀 Iniciando Deploy Oficial para o VPS (Produção)..."

echo "1. Rodando os testes de qualidade (Pre-flight)..."
python3 .agent/scripts/checklist.py .

echo "2. Enviando código local para o GitHub..."
git add . || true
git commit -m "chore: deploy para producao" || true
git push origin main

echo "3. Conectando via SSH ao servidor e atualizando o Docker..."
ssh sistema-macedo << 'EOF'
  echo "⬇️ Puxando código mais recente..."
  # Entrando na pasta do projeto no servidor
  cd /root/sistema_macedo
  
  git pull origin main
  
  echo "🔨 Reconstruindo containers (Backend + Frontend)..."
  docker compose -f docker-compose.prod.yml up -d --build
  
  echo "🗄️ Sincronizando o banco de dados com o Prisma..."
  docker exec -i macedo_backend_prod npx prisma db push
  
  echo "✅ Deploy concluído com sucesso no servidor!"
EOF

echo "🎉 Processo finalizado!"
