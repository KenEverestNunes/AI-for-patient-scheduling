#!/bin/bash
set -e

echo "🚀 Updating CareSync Health..."

# 1. Pull latest code
git pull

# 2. Update Backend
echo "📦 Updating Backend..."
cd server
npm install
pm2 restart caresync-backend
cd ..

# 3. Update Frontend
echo "🏗️  Updating Frontend..."
cd client
npm install
npm run build

# 4. Deploy Frontend to Nginx
echo "🌐 Syncing with Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

echo "✅ Update Successful!"
