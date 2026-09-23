# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy monorepo configuration and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies for web workspace
RUN pnpm install --frozen-lockfile --filter web...

# Copy web source code
COPY apps/web ./apps/web

# Build arguments for frontend API URL
ARG VITE_API_BASE_URL=https://it-api.jkseng.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production assets
RUN pnpm --filter web build

# Production Stage with Nginx
FROM nginx:alpine AS runner

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
