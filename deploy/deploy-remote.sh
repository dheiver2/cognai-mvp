#!/usr/bin/env bash
# ============================================================================
# cognai — deploy remoto executado da sua máquina local
#
# Faz:
#   1. rsync do código para a VPS
#   2. executa setup.sh na VPS para instalar/atualizar tudo
#
# Pré-requisitos:
#   - chave SSH já copiada para a VPS (recomendado):
#       ssh-copy-id root@IP_DA_VPS
#     (se ainda não, ele vai pedir senha)
#
# Uso:
#   VPS=root@76.13.82.196 DOMAIN=cognai.com.br ./deploy/deploy-remote.sh
# ou (sem domínio, acesso via IP):
#   VPS=root@76.13.82.196 ./deploy/deploy-remote.sh --no-ssl
# ============================================================================
set -euo pipefail

VPS="${VPS:?defina VPS=user@host}"
DOMAIN="${DOMAIN:-}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-}"   # se vazio, usa rsync; se setado, clona na VPS
EXTRA="$*"

log() { echo -e "\033[1;36m==>\033[0m $*"; }

if [ -n "$REPO_URL" ]; then
  log "Modo git: VPS vai clonar de $REPO_URL"
  ssh "$VPS" "curl -fsSL https://raw.githubusercontent.com/${REPO_URL#*github.com/}/$BRANCH/deploy/setup.sh -o /tmp/setup.sh && bash /tmp/setup.sh --repo='$REPO_URL' --branch='$BRANCH' ${DOMAIN:+--domain=$DOMAIN} $EXTRA"
else
  log "Modo rsync: sincronizando código local → VPS"
  rsync -avz --progress \
    --exclude="node_modules" --exclude="__pycache__" --exclude=".git" \
    --exclude="cache/*" --exclude="data/*" --exclude="frontend-react/node_modules" \
    --exclude="backend/web*" --exclude="*.log" --exclude=".venv" \
    ./ "$VPS:/opt/cognai/"
  log "Executando setup.sh na VPS"
  ssh "$VPS" "bash /opt/cognai/deploy/setup.sh --repo='file:///opt/cognai' ${DOMAIN:+--domain=$DOMAIN} $EXTRA"
fi

log "✅ deploy concluído"
[ -n "$DOMAIN" ] && log "   https://$DOMAIN" || log "   http://${VPS#*@}"
