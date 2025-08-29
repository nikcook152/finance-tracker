# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /usr/src/app

# --- IMPORTANT: The next three blocks are corrected ---

# 1. Copy package files from the builder stage for consistency
COPY --from=builder /usr/src/app/package*.json ./

# 2. Copy the prisma schema from the builder stage
COPY --from=builder /usr/src/app/prisma ./prisma

# 3. THEN run npm install, so `prisma generate` can find the schema
RUN npm install --only=production

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]