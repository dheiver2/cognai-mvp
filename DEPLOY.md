# cognai — Guia de Deploy

Três caminhos do mais simples ao mais automatizado.

## ⚠ Segurança primeiro (faça isto **agora**)

1. **Troque a senha root da VPS** (ela foi exposta). No terminal:
   ```bash
   ssh root@76.13.82.196
   passwd
   ```
2. **Crie uma chave SSH** (se ainda não tem) e copie para a VPS — acabam as senhas:
   ```bash
   ssh-keygen -t ed25519 -C "seu-email@dominio"
   ssh-copy-id root@76.13.82.196
   ```
3. **Opcional mas recomendado**: desabilite login por senha no `/etc/ssh/sshd_config` da VPS (`PasswordAuthentication no`) e reinicie o SSH.

---

## Caminho 1 — Deploy em um único comando (VPS limpa)

Na sua máquina local:

```bash
cd holter-mvp

# Sem domínio (acesso direto pelo IP):
VPS=root@76.13.82.196 ./deploy/deploy-remote.sh --no-ssl

# Com domínio + SSL Let's Encrypt automático:
VPS=root@76.13.82.196 DOMAIN=cognai.seudominio.com.br ./deploy/deploy-remote.sh
```

O script:
1. Copia todo o código para `/opt/cognai` via `rsync`
2. Executa o `setup.sh` dentro da VPS
3. `setup.sh` instala Python 3, Node.js 20, nginx, certbot, UFW, cria usuário `cognai`, venv, builda o React, configura systemd + nginx + firewall + SSL e inicia o serviço

Ao final: acesse `https://cognai.seudominio.com.br` (ou `http://76.13.82.196`).

---

## Caminho 2 — Via GitHub (recomendado para produção)

### 2.1 — Subir o código pro GitHub

Na sua máquina:

```bash
cd holter-mvp

git init
git add .
git commit -m "cognai MVP — Holter multi-formato"

# Crie um repo vazio no github.com/new (privado se quiser privacidade)
git remote add origin git@github.com:SEU_USUARIO/cognai.git
git branch -M main
git push -u origin main
```

### 2.2 — Deploy inicial (uma vez)

```bash
# Na VPS (ou pela própria local via ssh)
ssh root@76.13.82.196 "bash <(curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/cognai/main/deploy/setup.sh) --repo=https://github.com/SEU_USUARIO/cognai.git --domain=cognai.seudominio.com.br"
```

### 2.3 — Auto-deploy contínuo (GitHub Actions)

No repo GitHub → **Settings → Secrets and variables → Actions**, crie:

| Secret           | Valor                                                                                          |
|------------------|------------------------------------------------------------------------------------------------|
| `SSH_PRIVATE_KEY`| sua chave privada SSH (conteúdo do `~/.ssh/id_ed25519`)                                        |
| `VPS_HOST`       | `76.13.82.196`                                                                                 |
| `VPS_USER`       | `root`                                                                                         |
| `DOMAIN`         | `cognai.seudominio.com.br` (opcional)                                                          |

Pronto — `git push origin main` dispara o deploy automaticamente (`.github/workflows/deploy.yml`).

---

## Caminho 3 — Manual passo-a-passo (se algo der errado)

Na VPS:

```bash
# 1. Sistema base
apt update && apt upgrade -y
apt install -y python3 python3-venv python3-pip nginx git curl build-essential \
               ufw certbot python3-certbot-nginx

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. Código
useradd -r -s /bin/bash -d /opt/cognai cognai
git clone https://github.com/SEU_USUARIO/cognai.git /opt/cognai
chown -R cognai:cognai /opt/cognai

# 3. Python
sudo -u cognai python3 -m venv /opt/cognai/.venv
sudo -u cognai /opt/cognai/.venv/bin/pip install -r /opt/cognai/requirements.txt

# 4. Frontend
cd /opt/cognai/frontend-react
sudo -u cognai npm install && sudo -u cognai npm run build

# 5. systemd
cp /opt/cognai/deploy/cognai.service /etc/systemd/system/
sed -i 's|__APP_DIR__|/opt/cognai|g; s|__APP_USER__|cognai|g; s|__PORT__|8765|g' \
  /etc/systemd/system/cognai.service
systemctl daemon-reload
systemctl enable --now cognai

# 6. nginx
cp /opt/cognai/deploy/nginx.conf /etc/nginx/sites-available/cognai
sed -i 's|__SERVER_NAME__|cognai.seudominio.com.br|g; s|__PORT__|8765|g' \
  /etc/nginx/sites-available/cognai
ln -sf /etc/nginx/sites-available/cognai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 8. SSL (se tem domínio)
certbot --nginx -d cognai.seudominio.com.br --agree-tos --email voce@email.com
```

---

## Manutenção

```bash
# Status
systemctl status cognai

# Logs em tempo real
journalctl -u cognai -f

# Reiniciar
systemctl restart cognai

# Atualizar manualmente
cd /opt/cognai && git pull
sudo -u cognai .venv/bin/pip install -r requirements.txt
(cd frontend-react && sudo -u cognai npm install && sudo -u cognai npm run build)
systemctl restart cognai
```

## Estrutura na VPS

```
/opt/cognai/
├── backend/              API FastAPI
├── frontend-react/       (apenas código fonte, build fica em backend/web-v3)
├── .venv/                virtualenv Python
├── data/                 exames enviados (NÃO no git — LGPD)
├── cache/                .npy e análises (regeneradas)
├── deploy/               scripts e configs
└── /etc/nginx/sites-enabled/cognai      reverse proxy
└── /etc/systemd/system/cognai.service   unit
```

## Backup simples

```bash
# Na VPS
tar czf /root/cognai-data-$(date +%F).tar.gz /opt/cognai/data /opt/cognai/cache
# Copiar localmente
scp root@76.13.82.196:/root/cognai-data-*.tar.gz .
```

---

**Precisa de ajuda?** Qualquer erro no deploy, copie a saída do comando e me envie —
vamos depurar juntos.
