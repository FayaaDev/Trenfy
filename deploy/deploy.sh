#!/bin/bash
set -e

VPS_IP="174.138.183.153"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
LOCAL_DIR="/root/trenfy"
WEB_DIST="$LOCAL_DIR/app/dist-web"

echo "=== Trenfy VPS Deployment ==="

# Check if web dist exists
if [ ! -d "$WEB_DIST" ]; then
    echo "Error: Expo web build not found at $WEB_DIST"
    exit 1
fi

# Create deployment package
echo "Creating deployment package..."
PACKAGE_DIR="/tmp/trenfy-deploy"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copy backend files
cp $LOCAL_DIR/Dockerfile $PACKAGE_DIR/
cp $LOCAL_DIR/docker-compose.yml $PACKAGE_DIR/
cp $LOCAL_DIR/.env $PACKAGE_DIR/
cp $LOCAL_DIR/app.py $PACKAGE_DIR/
cp -r $LOCAL_DIR/api $PACKAGE_DIR/
cp -r $LOCAL_DIR/workflows $PACKAGE_DIR/
cp -r $LOCAL_DIR/trend_agents $PACKAGE_DIR/
cp -r $LOCAL_DIR/tools $PACKAGE_DIR/
cp -r $LOCAL_DIR/config $PACKAGE_DIR/
cp -r $LOCAL_DIR/pyproject.toml $PACKAGE_DIR/

# Copy nginx config
mkdir -p $PACKAGE_DIR/nginx
cp $LOCAL_DIR/deploy/nginx-trenfy.conf $PACKAGE_DIR/nginx/

# Copy web dist
mkdir -p $PACKAGE_DIR/web
cp -r $WEB_DIST/* $PACKAGE_DIR/web/

# Create setup script for VPS
cat > $PACKAGE_DIR/setup-vps.sh << 'SETUP_EOF'
#!/bin/bash
set -e

echo "=== Installing Docker ==="
apt-get update -qq
apt-get install -y -qq curl ca-certificates > /dev/null 2>&1
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh > /dev/null 2>&1
rm /tmp/get-docker.sh
docker --version

echo "=== Installing nginx ==="
apt-get install -y -qq nginx > /dev/null 2>&1
nginx -v

echo "=== Creating directories ==="
mkdir -p /var/www/trenfy/web
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

echo "=== Copying web files ==="
cp -r /tmp/trenfy-deploy/web/* /var/www/trenfy/web/

echo "=== Configuring nginx ==="
cp /tmp/trenfy-deploy/nginx/nginx-trenfy.conf /etc/nginx/sites-available/trenfy
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/trenfy /etc/nginx/sites-enabled/
nginx -t

echo "=== Starting Docker containers ==="
cd /tmp/trenfy-deploy
docker build -t trenfy-backend:latest . 2>&1 | tail -5
docker compose up -d

echo "=== Restarting nginx ==="
systemctl restart nginx
systemctl status nginx --no-pager

echo "=== Testing health endpoint ==="
sleep 3
curl -s http://localhost/health | head -c 200
echo ""

echo "=== Deployment complete! ==="
echo "Backend API: http://174.138.183.153:8080"
echo "Web UI: http://174.138.183.153"
SETUP_EOF

chmod +x $PACKAGE_DIR/setup-vps.sh

# Copy package to VPS
echo "Copying deployment files to VPS..."
scp -i $SSH_KEY -r $PACKAGE_DIR/* root@$VPS_IP:/tmp/trenfy-deploy/

echo "Running setup on VPS..."
ssh -i $SSH_KEY root@$VPS_IP '/bin/bash /tmp/trenfy-deploy/setup-vps.sh'

echo ""
echo "=== Deployment Status ==="
curl -s http://$VPS_IP/health || echo "Health check failed"
