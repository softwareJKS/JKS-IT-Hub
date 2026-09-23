# Deploying JKS-IT-Hub on Dokploy

This guide outlines how to deploy the **JKS-IT-Hub** monorepo to [Dokploy](https://dokploy.com/) using the production Docker Compose configuration (`docker-compose.prod.yml`).

---

## 1. Architecture Overview

```
                      +---------------------------------------+
                      |         External Reverse Proxy        |
                      |  (Cloudflare / NPM / Edge Nginx/etc) |
                      +-------------------+-------------------+
                                          |
                   SSL Termination for *.jkseng.com
                                          |
               +--------------------------+--------------------------+
               |                                                     |
               v (port 5175)                                         v (port 5001)
     http://192.168.78.61:5175                             http://192.168.78.61:5001
  [ https://it.jkseng.com ]                              [ https://it-api.jkseng.com ]
               |                                                     |
               v                                                     v
+-----------------------------+                       +-----------------------------+
|    Docker: it-hub-web       |                       |    Docker: it-hub-api       |
|  - Nginx Alpine (port 80)   |                       |  - Node.js 22 + Fastify     |
|  - Static React SPA         |                       |  - Prisma migration runner  |
|  - Gzip & asset cache       |                       |  - Upload volume mounted    |
+-----------------------------+                       +--------------+--------------+
                                                                     |
                                             Internal Docker Network |
                                                                     v
                                                      +-----------------------------+
                                                      |   Docker: it-hub-scraper    |
                                                      |  - Python 3.12 + Playwright |
                                                      |  - Internal port: 3016      |
                                                      +-----------------------------+
```

- **Frontend (`it-hub-web`)**: Listens on container port 80 &rarr; mapped to host `192.168.78.61:5175`.
- **Backend API (`it-hub-api`)**: Listens on container port 5001 &rarr; mapped to host `192.168.78.61:5001`.
- **Scraper (`it-hub-scraper`)**: Internal service on port 3016 (only accessible by `api` via `http://scraper:3016`).
- **Database (MySQL)**: External MySQL instance connected via `DATABASE_URL`.
- **Uploads (`api_uploads`)**: Persistent volume for uploaded user/maintenance files at `/app/apps/api/uploads`.

---

## 2. Dokploy Setup Step-by-Step

### Step 2.1: Create a Compose Project in Dokploy
1. Log into your Dokploy dashboard.
2. Navigate to your **Project** &rarr; click **Create Service** &rarr; select **Compose**.
3. Name your service (e.g., `jks-it-hub`).

### Step 2.2: Link Git Repository
1. In the **Source** tab, select **Git Provider** (GitHub / GitLab / Git).
2. Set your repository URL and branch (e.g., `main` or `production`).
3. Set **Compose Path** to:
   ```text
   docker-compose.prod.yml
   ```

### Step 2.3: Configure Environment Variables
1. Go to the **Environment** tab in Dokploy.
2. Copy the contents of [`.env.dokploy.example`](../.env.dokploy.example) and paste into Dokploy's environment variable editor.
3. Update the essential variables:
   - `DATABASE_URL`: Connection string to your MySQL database (e.g. `mysql://user:pass@192.168.78.61:3306/it_hub`).
   - `JWT_SECRET`: Generate a secure random string (`openssl rand -hex 32`).
   - `CREDENTIAL_ENCRYPTION_KEY`: Generate a secure 32+ character random string.
   - `LDAP_*`: Active Directory credentials and connection details.
   - `CORS_ORIGIN`: Must be `https://it.jkseng.com`.
   - `VITE_API_BASE_URL`: Must be `https://it-api.jkseng.com`.
   - `AUTH_COOKIE_DOMAIN`: `.jkseng.com` (to share cookies between `it.jkseng.com` and `it-api.jkseng.com`).
4. Click **Save**.

### Step 2.4: Deploy
1. Click **Deploy** in Dokploy.
2. Dokploy will:
   - Build `apps/web/Dockerfile` with Nginx and SPA bundle.
   - Build `apps/api/Dockerfile` with Node 22, pnpm, and Prisma client.
   - Build `apps/scraper/Dockerfile` with Python 3.12 and Playwright Chromium.
   - Automatically execute `prisma migrate deploy` on API startup to ensure the database schema is up-to-date.
   - Launch all 3 containers and bind ports `5175` and `5001` to `192.168.78.61`.

---

## 3. Reverse Proxy Configuration

Configure your external reverse proxy (Nginx / Nginx Proxy Manager / Cloudflare Tunnel / Traefik) to route domains to the server IP:

### 3.1. Frontend Proxy: `https://it.jkseng.com` &rarr; `http://192.168.78.61:5175`
**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name it.jkseng.com;

    # SSL Certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://192.168.78.61:5175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.2. API Proxy: `https://it-api.jkseng.com` &rarr; `http://192.168.78.61:5001`
**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name it-api.jkseng.com;

    # SSL Certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Allow up to 10MB request bodies (for file uploads)
    client_max_body_size 10M;

    # Support Server-Sent Events (SSE) streaming for real-time notifications
    location /api/v1/sse/stream {
        proxy_pass http://192.168.78.61:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering and cache for SSE
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Standard API endpoints
    location / {
        proxy_pass http://192.168.78.61:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Verification & Health Checks

Once deployed, verify the health of the services:

1. **API Health Check**:
   ```bash
   curl -I https://it-api.jkseng.com/health
   # Expected HTTP/2 200 OK
   # Response: {"status":"ok"}
   ```

2. **Frontend Availability**:
   ```bash
   curl -I https://it.jkseng.com
   # Expected HTTP/2 200 OK
   ```

3. **Check Running Containers on Server**:
   ```bash
   docker ps | grep it-hub
   ```
   You should see:
   - `it-hub-web` (healthy, port `0.0.0.0:5175->80/tcp`)
   - `it-hub-api` (healthy, port `0.0.0.0:5001->5001/tcp`)
   - `it-hub-scraper` (healthy, port `3016/tcp`)

4. **View Container Logs**:
   ```bash
   docker logs -f it-hub-api
   ```
   Look for the entrypoint line:
   ```text
   [API Entrypoint] Applying Prisma database migrations...
   [API Entrypoint] Database migrations applied successfully.
   [API Entrypoint] Migrations complete. Starting Fastify API server...
   ```
