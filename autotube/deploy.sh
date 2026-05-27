#!/bin/bash
# ════════════════════════════════════════════════════════
#  AutoTube Studio — VPS Deployment Script (Ubuntu 22.04)
#  Run as root: bash deploy.sh
# ════════════════════════════════════════════════════════

set -e  # Exit on any error

echo "🚀 AutoTube Studio — Full Deployment Starting..."

# ── 1. SYSTEM UPDATE ──────────────────────────────────
echo "📦 Updating system..."
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

# ── 2. NODE.JS 20 ─────────────────────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v

# ── 3. PM2 (process manager) ──────────────────────────
echo "📦 Installing PM2..."
npm install -g pm2

# ── 4. FIREWALL ───────────────────────────────────────
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 5. APP DIRECTORY ──────────────────────────────────
echo "📁 Setting up app directory..."
mkdir -p /var/www/autotube
cd /var/www/autotube

# Clone your repo (replace with your GitHub URL)
# git clone https://github.com/yourname/autotube.git .

# OR: Copy files manually via SCP:
# scp -r ./autotube/* root@YOUR_VPS_IP:/var/www/autotube/

# ── 6. BACKEND SETUP ──────────────────────────────────
echo "📦 Installing backend dependencies..."
cd /var/www/autotube/backend
npm install --production

# Create required directories
mkdir -p uploads outputs data

# ── 7. ENV FILE ───────────────────────────────────────
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit /var/www/autotube/backend/.env with your settings!"
  echo "    nano /var/www/autotube/backend/.env"
  echo ""
fi

# ── 8. PM2 CONFIG ─────────────────────────────────────
cat > /var/www/autotube/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'autotube',
    script: '/var/www/autotube/backend/server.js',
    cwd: '/var/www/autotube/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' },
    error_file: '/var/log/autotube-error.log',
    out_file: '/var/log/autotube-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

# ── 9. START BACKEND ──────────────────────────────────
echo "🚀 Starting backend with PM2..."
cd /var/www/autotube
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# ── 10. NGINX SETUP ───────────────────────────────────
echo "🌐 Configuring Nginx..."
cp /var/www/autotube/nginx.conf /etc/nginx/sites-available/autotube
ln -sf /etc/nginx/sites-available/autotube /etc/nginx/sites-enabled/autotube
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t && systemctl reload nginx

echo ""
echo "════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo ""
echo "NEXT STEPS:"
echo "1. Point your domain DNS to: $(curl -s ifconfig.me)"
echo "2. Edit your domain in nginx.conf:"
echo "   nano /etc/nginx/sites-available/autotube"
echo "3. Get SSL certificate:"
echo "   certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "4. Add your API keys:"
echo "   nano /var/www/autotube/backend/.env"
echo "5. Restart backend:"
echo "   pm2 restart autotube"
echo ""
echo "Useful commands:"
echo "  pm2 logs autotube     — View live logs"
echo "  pm2 restart autotube  — Restart server"
echo "  pm2 status            — Check status"
echo "════════════════════════════════════════════"
