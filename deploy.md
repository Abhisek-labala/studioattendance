sudo -u postgres psql

-- 1. Create a database for Attendance System
CREATE DATABASE studio_gfx;

-- 2. Create a dedicated user
CREATE USER studio_app WITH ENCRYPTED PASSWORD 'studi_@!ogfx';

-- 3. Grant permissions
GRANT ALL PRIVILEGES ON DATABASE studio_gfx TO studio_app;
\c studio_gfx;
GRANT USAGE, CREATE ON SCHEMA public TO studio_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO studio_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO studio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studio_app;

\q

# Example using Git:
cd /var/www
git clone <YOUR_GIT_REPO_URL> attendance_system_gfx
cd attendance_system_gfx

nano .env

# PostgreSQL Connection (local server instance)
DATABASE_URL="postgresql://studio_app:studi_@!ogfx@localhost:5432/studio_gfx"

# Production environment
NODE_ENV=production

# Your public domain or subdomain
APP_URL=https://at.photoplanet.in

# Connection pool
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000


# Install dependencies (production + build tools)
npm ci

# Run all migrations (001 to 011) to create tables & initial schema
npm run db:migrate

# (Optional) Seed initial roles/rules if needed:
# npm run db:seed

# Build Next.js for production
npm run build

# Install PM2 globally if not already installed
npm install -g pm2

# Start the attendance app on port 3001
pm2 start npm --name "attendance-gfx" -- start -- -p 3001

# Save PM2 process list so it persists across server reboots
pm2 save



pm2 list

sudo nano /etc/nginx/sites-available/attendance.conf

server {
    listen 80;
    server_name at.photoplanet.in;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}


sudo ln -s /etc/nginx/sites-available/attendance.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d at.photoplanet.in

git pull origin main
npm ci
npm run db:migrate
npm run build
pm2 restart attendance-gfx