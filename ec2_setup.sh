#!/bin/bash
set -e

echo "====================================="
echo " KYRON MEDICAL PROD DEPLOYMENT"
echo "====================================="

export NVM_DIR="$HOME/.nvm"

echo "1. Installing core system dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl unzip nginx software-properties-common

echo "2. Installing Node.js LTS (v20)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "3. Installing PM2 Process Manager..."
sudo npm install -g pm2

echo "4. Extracting source code payload..."
rm -rf server client
tar -xzf kyron.tar.gz

echo "5. Booting the Node.js Backend..."
cd server
npm install
pm2 stop kyron-backend || true
pm2 delete kyron-backend || true
pm2 start index.js --name kyron-backend
pm2 save

echo "6. Building and linking the React Frontend..."
cd ../client
npm install
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

echo "7. Configuring Nginx Reverse Proxy..."
sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name _;
    
    # Serve React Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Reverse Proxy to Node.js Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'
sudo systemctl restart nginx

echo "8. Installing Ngrok daemon for free HTTPS tunnels..."
if ! command -v ngrok &> /dev/null; then
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt-get update -y && sudo apt-get install ngrok -y
fi

echo "9. Securing and Launching the Ngrok HTTPS Tunnel..."
ngrok config add-authtoken 3B9akv3jNc3DxPwga3jl3HNX5Ga_6rc1qFWDZSYGTrFBLHser
killall ngrok || true
nohup ngrok http 3001 --log stdout > /tmp/ngrok.log 2>&1 &

echo "====================================="
echo " DEPLOYMENT SCRIPT SUCCESSFUL!"
echo "====================================="
