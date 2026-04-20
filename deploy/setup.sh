#!/usr/bin/env bash
# ============================================================================
# cognai — setup idempotente da VPS Ubuntu 22.04+
#
# Roda como root na VPS. Instala tudo do zero e deixa o app no ar.
#
# Uso (na VPS):
#     curl -fsSL https://raw.githubusercontent.com/<SEU_USER>/<REPO>/main/deploy/setup.sh | sudo bash -s -- --domain=exemplo.com --repo=<url-repo>
# ou:
#     sudo bash deploy/setup.sh --domain=cognai.com.br --repo=https://github.com/usuario/cognai.git
#
# Flags:
#   --domain=<hostname>   — domínio (gera cert SSL Let's Encrypt)
#   --repo=<git-url>      — URL do repositório git (https ou ssh)
#   --branch=main         — branch (padrão main)
#   --no-ssl              — pula SSL (útil para IP direto)
#   --port=8765           — porta do app (padrão 8765)
# ============================================================================
set -euo pipefail

# ---------- args ----------
DOMAIN=""
REPO_URL=""
BRANCH="main"
APP_PORT="8765"
SKIP_SSL="0"

for arg in "$@"; do
  case "$arg" in
    --domain=*)  DOMAIN="${arg#*=}" ;;
    --repo=*)    REPO_URL="${arg#*=}" ;;
    --branch=*)  BRANCH="${arg#*=}" ;;
    --port=*)    APP_PORT="${arg#*=}" ;;
    --no-ssl)    SKIP_SSL="1" ;;
    *) echo "Flag desconhecida: $arg"; exit 1 ;;
  esac
done

[ -z "$REPO_URL" ] && { echo "ERRO: use --repo=<url-git>"; exit 1; }

APP_USER="cognai"
APP_DIR="/opt/cognai"
VENV_DIR="$APP_DIR/.venv"

log() { echo -e "\033[1;36m==>\033[0m $*"; }
ok()  { echo -e "  \033[1;32m✔\033[0m $*"; }

# ---------- 1. Usuário e pasta ----------
log "Criando usuário 'cognai' e diretório $APP_DIR"
id -u "$APP_USER" >/dev/null 2>&1 || useradd -r -s /bin/bash -d "$APP_DIR" "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
ok "usuário e pasta prontos"

# ---------- 2. Sistema ----------
log "Atualizando pacotes"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -yqq

log "Instalando dependências do sistema"
apt-get install -yqq \
  python3 python3-venv python3-pip \
  nginx git curl build-essential \
  ufw certbot python3-certbot-nginx \
  ca-certificates gnupg

# Node.js 20 LTS (via NodeSource)
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  log "Instalando Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -yqq nodejs
fi
ok "sistema OK  ($(python3 --version | awk '{print $2}')  /  node $(node -v))"

# ---------- 3. Código ----------
log "Clonando/atualizando repositório em $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all --quiet
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"/* "$APP_DIR"/.[!.]* 2>/dev/null || true
  sudo -u "$APP_USER" git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi
ok "repo sincronizado ($BRANCH)"

# ---------- 4. Python venv ----------
log "Instalando dependências Python em $VENV_DIR"
sudo -u "$APP_USER" python3 -m venv "$VENV_DIR"
sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install --upgrade pip --quiet
sudo -u "$APP_USER" "$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt" --quiet
ok "Python venv pronto"

# ---------- 5. Build frontend React ----------
log "Build do frontend React (pode demorar ~1 min)"
if [ -d "$APP_DIR/frontend-react" ]; then
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/frontend-react' && npm install --silent && npm run build"
  ok "frontend compilado em backend/web-v3"
fi

# ---------- 6. systemd ----------
log "Configurando systemd"
install -m 644 "$APP_DIR/deploy/cognai.service" /etc/systemd/system/cognai.service
sed -i "s|__APP_DIR__|$APP_DIR|g; s|__APP_USER__|$APP_USER|g; s|__PORT__|$APP_PORT|g" /etc/systemd/system/cognai.service
systemctl daemon-reload
systemctl enable cognai.service
systemctl restart cognai.service
sleep 3
systemctl --no-pager status cognai.service | head -10
ok "serviço cognai rodando em 127.0.0.1:$APP_PORT"

# ---------- 7. Nginx ----------
log "Configurando nginx"
SERVER_NAME="${DOMAIN:-_}"
install -m 644 "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/cognai
sed -i "s|__SERVER_NAME__|$SERVER_NAME|g; s|__PORT__|$APP_PORT|g" /etc/nginx/sites-available/cognai
ln -sf /etc/nginx/sites-available/cognai /etc/nginx/sites-enabled/cognai
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "nginx OK"

# ---------- 8. Firewall ----------
log "Configurando firewall UFW"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ok "firewall ativo (SSH + 80 + 443)"

# ---------- 9. SSL ----------
if [ "$SKIP_SSL" = "0" ] && [ -n "$DOMAIN" ]; then
  log "Obtendo certificado SSL para $DOMAIN (Let's Encrypt)"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect \
          --email "admin@$DOMAIN" || echo "⚠ Falha no SSL — verifique DNS e tente manual."
  ok "HTTPS ativo"
else
  ok "SSL pulado — acesso via http://$(curl -s ifconfig.me 2>/dev/null || echo 'IP')"
fi

log "============================================"
log "🚀 cognai no ar!"
[ -n "$DOMAIN" ] && log "    https://$DOMAIN" || log "    http://<IP_DA_VPS>"
log "============================================"
log ""
log "Comandos úteis:"
log "  systemctl status cognai       — status do app"
log "  journalctl -u cognai -f       — logs em tempo real"
log "  systemctl restart cognai      — reiniciar"
log "  cd $APP_DIR && git pull && systemctl restart cognai — atualizar"
