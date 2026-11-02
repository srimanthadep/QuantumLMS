# syntax=docker/dockerfile:1
# The Quantum LMS API image. infra/ builds it for ECS Fargate; to build it by hand, from backend/:
#   docker build -t quantum-lms-api .
# On start the container applies pending migrations, then runs the server. Drizzle applies pending migrations in one
# transaction, so tasks that start together can't leave a half-migrated schema: a task that loses the race exits and
# ECS starts it again.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY package.json ./
USER node
EXPOSE 4000
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
