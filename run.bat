@echo off
REM cognai — inicia backend FastAPI com frontend React pre-compilado (Windows)
cd /d "%~dp0"

echo === cognai . instalando dependencias Python ===
pip install -r requirements.txt --quiet

REM Build do front React se ainda nao existir
if not exist "backend\web-v2" if not exist "backend\web" if exist "frontend-react" (
    where npm >nul 2>&1
    if %ERRORLEVEL% == 0 (
        echo === cognai . build do frontend React (primeira vez, ~1 min) ===
        cd frontend-react
        call npm install --silent
        call npm run build
        cd ..
    ) else (
        echo AVISO: Node.js nao encontrado, usando frontend fallback.
    )
)

echo === cognai . servidor em http://127.0.0.1:8765 ===
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8765
