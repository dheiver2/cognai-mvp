#!/usr/bin/env bash
# cognai — inicia backend FastAPI com frontend React pré-compilado
set -e
cd "$(dirname "$0")"

echo "=== cognai · instalando dependências Python ==="
pip install -r requirements.txt --quiet --break-system-packages 2>/dev/null \
  || pip install -r requirements.txt --quiet

# Se a pasta web/ ainda não existir mas tivermos Node, faz build do React
if [ ! -d backend/web-v2 ] && [ ! -d backend/web ] && [ -d frontend-react ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "=== cognai · build do frontend React (primeira vez, ~1 min) ==="
    (cd frontend-react && npm install --silent && npm run build)
  else
    echo "⚠ Node.js não encontrado — usando frontend fallback (HTML/JS)."
  fi
fi

echo "=== cognai · servidor em http://127.0.0.1:8765 ==="
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765
