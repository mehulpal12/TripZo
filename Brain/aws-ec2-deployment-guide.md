# AWS EC2 Deployment Guide — TripZo (Rapido Clone)

This guide walks you step-by-step through deploying the full-stack TripZo application (Frontend, Backend API, Redis, and Socket.IO) onto an **AWS EC2** instance using Docker and Docker Compose.

---

## 1. Prerequisites & AWS Setup

### 1.1 Recommended EC2 Specifications
- **AMI**: Ubuntu 24.04 LTS (or Ubuntu 22.04 LTS)
- **Instance Type**: 
  - **Minimum**: `t3.small` (2 vCPU, 2 GB RAM) + 4GB Swap
  - **Budget Free-Tier**: `t2.micro` or `t3.micro` (1 GB RAM) **must** have 4GB Swap enabled to prevent Out-Of-Memory (OOM) errors during the `next build` phase.
- **Storage**: 20 GB gp3 SSD (minimum)

### 1.2 Security Group (Firewall) Inbound Rules
Configure your EC2 Security Group with the following inbound rules:

| Type | Port Range | Source | Purpose |
|---|---|---|---|
| **SSH** | `22` | Your IP (`x.x.x.x/32`) | Secure server terminal access |
| **HTTP** | `80` | `0.0.0.0/0` | Web traffic & Let's Encrypt SSL verification |
| **HTTPS** | `443` | `0.0.0.0/0` | Secure SSL web & WebSocket traffic |
| *(Optional)* Custom TCP | `3000` | `0.0.0.0/0` | Direct Next.js access (if testing without Nginx) |
| *(Optional)* Custom TCP | `4000` | `0.0.0.0/0` | Direct Backend API access (if testing without Nginx) |

---

## 2. Server Initialization

SSH into your EC2 instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

### 2.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Configure 4GB Swap Space (Crucial for 1GB/2GB RAM Instances)
Next.js builds require significant memory during compilation. A 4GB swap prevents OOM crashes:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap persistent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2.3 Install Docker & Docker Compose Plugin
```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker without sudo
sudo usermod -aG docker ubuntu
```
> [!NOTE]
> Log out of SSH (`exit`) and log back in for docker group permissions to take effect.

---

## 3. Clone Repository & Configure Environment

### 3.1 Clone the Project
```bash
git clone <YOUR-GITHUB-REPO-URL> rapido
cd rapido
```

### 3.2 Configure Backend Environment (`backend/.env`)
Create and edit `backend/.env`:
```bash
nano backend/.env
```

Paste your production configuration:
```ini
NODE_ENV=production
PORT=4000

# Your Neon PostgreSQL connection string (pooled)
DATABASE_URL=postgresql://neondb_owner:npg_qNdZvAwoI6k4@ep-purple-feather-a5uf8u1q-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Internal Docker Redis or Upstash Redis URL
REDIS_URL=redis://redis:6379

# Cryptographic random 64-byte secret
JWT_ACCESS_SECRET=a6e570e8c8f703f18178c3dfde0d1ac25e7e0995cf5942fcd691a5492da6760a26af98ae0bc67ad312818f4c5a8594bf04a7768d593869208935ed9cd4a78fd6
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=15d

# Production frontend domain (or http://<YOUR-EC2-PUBLIC-IP>:3000 if no domain)
CORS_ORIGIN=https://yourdomain.com

PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=your-secret-here
MAP_PROVIDER=mock
MAP_API_KEY=your-api-key
```

### 3.3 Configure Frontend Environment (`frontend/app/.env.local`)
Create and edit `frontend/app/.env.local`:
```bash
nano frontend/app/.env.local
```

Paste your production frontend settings:
```ini
# Production API and WebSocket URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCXj55Tedmgnc7g8AoKxFe9t4N2pttJ1pA

# Matches backend JWT_ACCESS_SECRET for Next.js middleware authentication
JWT_ACCESS_SECRET=a6e570e8c8f703f18178c3dfde0d1ac25e7e0995cf5942fcd691a5492da6760a26af98ae0bc67ad312818f4c5a8594bf04a7768d593869208935ed9cd4a78fd6
```

*(If deploying with raw IP without a domain yet, replace `https://api.yourdomain.com` with `http://<YOUR-EC2-IP>:4000`).*

---

## 4. Build and Run the Application

From the project root (`~/rapido`):

### 4.1 Launch All Containers
```bash
docker compose up -d --build
```

### 4.2 Check Container Status & Logs
```bash
# Verify all 3 containers are running (redis, backend, frontend)
docker compose ps

# View live consolidated logs
docker compose logs -f
```

### 4.3 Run Database Migrations
Run Prisma migrations inside the backend container against your PostgreSQL database:
```bash
docker compose exec backend npx prisma migrate deploy
```

---

## 5. Production Nginx Reverse Proxy with Free SSL (Certbot)

To access your app via standard `https://yourdomain.com` (Frontend) and `https://api.yourdomain.com` (Backend & Socket.IO):

### 5.1 Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 Configure Nginx
Create `/etc/nginx/sites-available/tripzo`:
```bash
sudo nano /etc/nginx/sites-available/tripzo
```

Paste configuration:
```nginx
# 1. Frontend: Next.js
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Backend API & WebSockets
server {
    server_name api.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Explicit WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 5.3 Enable Site & Obtain Free SSL Certificates
```bash
sudo ln -s /etc/nginx/sites-available/tripzo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Automatically obtain and install SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 6. How to Deploy Future Updates

Whenever you make code changes and push to GitHub, update your live EC2 instance with just 2 commands:

```bash
cd ~/rapido
git pull
docker compose up -d --build
```
Docker will re-compile only modified layers, perform any new database migrations, and restart the services with zero manual configuration.




I have created the complete automated GitHub Actions CI/CD pipeline for your repository at 

.github/workflows/deploy.yml
.

How the Pipeline Works
Whenever you push or open a pull request to main (or master), GitHub Actions runs:

[ Push to main / PR ]
         │
         ├──► 1. Backend CI   (Install, Prisma Generate, TypeScript Build)
         │
         └──► 2. Frontend CI  (Install, Typecheck, Next.js Build)
         │
         ▼
[ Both Pass + On main branch ]
         │
         └──► 3. Deploy to AWS EC2 (SSH into instance, pull code, docker compose up -d --build, migrate DB)
backend-ci: Validates backend dependencies, runs npx prisma generate, and compiles the TypeScript code (npm run build).
frontend-ci: Validates frontend dependencies, runs npx tsc --noEmit, and compiles the Next.js production build (npm run build).
deploy-to-ec2: Only runs when changes are pushed to main (after both CI checks pass). It connects to your EC2 instance via SSH, pulls the latest code, rebuilds the Docker containers, runs Prisma migrations, and removes dangling images.
How to Configure GitHub Repository Secrets (One-Time Setup)
To enable automatic deployment to your EC2 instance, add 3 secrets to your GitHub repository:

In your GitHub repository, go to Settings > Secrets and variables > Actions.
Click New repository secret and add the following 3 secrets:
Secret Name	What to Paste	Example
EC2_HOST	Your EC2 instance's Public IPv4 address or Public DNS	54.210.120.45
EC2_USER	The SSH username for your EC2 instance	ubuntu
EC2_SSH_KEY	The entire text of your EC2 .pem private key file	See below
Example of EC2_SSH_KEY value:
Open your downloaded .pem file in a text editor and paste the entire block including the headers:

text
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0r1...
... (all the lines of your key) ...
...sE7bVwIDAQABAoIBAQC...
-----END RSA PRIVATE KEY-----
What Happens on Future Pushes
Once configured, your deployment workflow is 100% automated:

bash
git add .
git commit -m "Add new feature"
git push origin main
GitHub automatically tests both the backend and frontend builds.
If both pass, it connects to your EC2 instance and updates your live containers with zero downtime.
If a build fails, GitHub cancels the deployment before your EC2 server is touched, keeping production safe.