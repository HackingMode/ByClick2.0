#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/back-end"
if [ ! -x .venv/bin/python ]; then
  echo 'Ambiente Python indisponível. Instala as dependências antes de iniciar.'
  exit 1
fi
if lsof -nP -iTCP:8000 -iTCP:5500 -sTCP:LISTEN >/dev/null 2>&1; then
  echo 'A porta 8000 ou 5500 já está em utilização. Se a demonstração já estiver aberta, acede a http://localhost:5500'
  exit 1
fi
.venv/bin/python demo_catalogo.py
export DATABASE_URL="sqlite:///$ROOT/back-end/.venv/byclick-demo/demo.sqlite3"
export SECRET_KEY="$(cat .venv/byclick-demo/secret)"
export BASE_URL='http://127.0.0.1:8000'
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
API_PID=$!
.venv/bin/python -m http.server 5500 --directory "$ROOT/front-end/public" --bind 127.0.0.1 &
WEB_PID=$!
trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null || true' EXIT INT TERM
echo 'ByClick: http://localhost:5500'
echo 'Comprador: comprador@demo.byclick | Palavra-passe: ByClick2026!'
echo 'Mantém esta janela aberta. Para terminar, prime Ctrl+C.'
open 'http://localhost:5500'
wait
