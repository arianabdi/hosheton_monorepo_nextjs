# ----------------------------
# 1) Builder Stage
# ----------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ py3-setuptools

WORKDIR /repo
ARG APP_NAME
ARG APP_PORT
# production | stage (from the git tag, see .github/workflows/main.yml)
ARG DEPLOY_ENV=production

COPY . .

RUN corepack enable
RUN yarn install

# NEXT_PUBLIC_* values are baked in at build time. For stage, apps/<app>/.env.stage
# overrides .env.production (Next.js loads .env.production.local over .env.production).
RUN if [ "$DEPLOY_ENV" = "stage" ]; then \
        if [ ! -f "apps/${APP_NAME}/.env.stage" ]; then echo "apps/${APP_NAME}/.env.stage is missing" && exit 1; fi; \
        cp "apps/${APP_NAME}/.env.stage" "apps/${APP_NAME}/.env.production.local"; \
    fi

# بیلد برای production
RUN yarn build:${APP_NAME}

# ----------------------------
# 2) Production Stage (برای Next.js)
# ----------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ARG APP_NAME
ARG APP_PORT

ENV NODE_ENV=production
ENV PORT=${APP_PORT}
ENV HOSTNAME=0.0.0.0

# 1. کل پوشه standalone را کپی کن (نه فقط زیرمجموعه)
COPY --from=builder /repo/apps/${APP_NAME}/.next/standalone /app

# 2. حالا داخل /app به مسیر دقیق اپ برو
WORKDIR /app/apps/${APP_NAME}

# 3. کپی public (اگر در build شده باشد)
COPY --from=builder /repo/apps/${APP_NAME}/public ./public

# 4. کپی .next/static (به مسیر درست نسبت به server.js)
COPY --from=builder /repo/apps/${APP_NAME}/.next/static ./.next/static

EXPOSE ${APP_PORT}

CMD ["node", "server.js"]