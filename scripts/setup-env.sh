#!/usr/bin/env bash
# Gera .env com senhas aleatórias para uso local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo "Arquivo .env já existe em $ENV_FILE — não foi alterado."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl é necessário para gerar segredos." >&2
  exit 1
fi

POSTGRES_PASSWORD="$(openssl rand -hex 24)"
SECRET_KEY="$(openssl rand -hex 32)"

cat > "$ENV_FILE" <<EOF
# Gerado por scripts/setup-env.sh — não commitar este arquivo
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
PORT=3000
EOF

chmod 600 "$ENV_FILE"
echo "Criado $ENV_FILE com segredos aleatórios."
