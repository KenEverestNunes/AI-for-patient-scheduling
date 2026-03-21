#!/bin/bash
set -e
echo "1. Installing core system dependencies..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl unzip nginx software-properties-common git

echo "2. Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "3. Cloning Repository..."
cd ~
rm -rf AI-for-patient-scheduling
git clone https://github.com/KenEverestNunes/AI-for-patient-scheduling.git
cd AI-for-patient-scheduling/server

echo "4. Injecting Credentials..."
# NOTE: Update these values on your EC2 instance!
cat << 'EOF' > .env
PORT=3001
# Replace with your actual EC2 public URL or domain!
CLIENT_URL=http://<YOUR_EC2_PUBLIC_IP_OR_DOMAIN>
SENDGRID_API_KEY=<YOUR_SENDGRID_API_KEY>
SENDGRID_SENDER_EMAIL=<YOUR_SENDGRID_EMAIL>
VAPI_API_KEY=<YOUR_VAPI_API_KEY>
VAPI_ASSISTANT_ID=<YOUR_VAPI_ASSISTANT_ID>
GROQ_API_KEY=<YOUR_GROQ_API_KEY>
VAPI_PHONE_NUMBER_ID=<YOUR_VAPI_PHONE_NUMBER_ID>
# Optional: Set this to your Ngrok or Domain URL
# VAPI_WEBHOOK_URL=https://your-domain.com
EOF

echo "5. Starting Backend..."
npm install
pm2 stop kyron-backend || true
pm2 delete kyron-backend || true
pm2 start index.js --name kyron-backend
pm2 save

echo "6. Building Frontend..."
cd ../client
npm install
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

echo "7. Configuring Nginx..."
sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html index.htm;
    server_name _;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF'
sudo systemctl restart nginx

echo "8. Launching Ngrok..."
if ! command -v ngrok &> /dev/null; then
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt-get update -y && sudo apt-get install ngrok -y
fi

# Use NGROK_AUTH_TOKEN from your environment if possible
if [ -z "$NGROK_AUTH_TOKEN" ]; then
    echo "WARNING: NGROK_AUTH_TOKEN not set. Skipping Ngrok login."
else
    ngrok config add-authtoken "$NGROK_AUTH_TOKEN"
fi

killall ngrok || true
nohup ngrok http 3001 --log stdout > /var/log/ngrok.log 2>&1 &

echo "SUCCESS!"