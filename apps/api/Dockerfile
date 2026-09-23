FROM node:22-alpine

WORKDIR /app

# Install required system packages for Prisma and Node native tools on Alpine
RUN apk add --no-cache openssl libc6-compat

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy monorepo configuration, lockfile, and api package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/

# Copy prisma schema so client generation and migrations are available
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile --filter api...

# Generate Prisma Client
RUN pnpm --filter api exec prisma generate

# Copy the rest of the API source code
COPY apps/api ./apps/api

# Ensure upload directory exists and entrypoint script is executable
RUN mkdir -p /app/apps/api/uploads && \
    chmod +x /app/apps/api/docker-entrypoint.sh

ENV NODE_ENV=production
ENV API_PORT=5001
ENV PORT=5001

EXPOSE 5001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]

CMD ["pnpm", "--filter", "api", "start"]
