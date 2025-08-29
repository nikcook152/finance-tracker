# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine
WORKDIR /usr/src/app

# --- IMPORTANT: The order of the next three blocks has changed ---

# 1. Copy package files
COPY package*.json ./

# 2. Copy the prisma schema FIRST
COPY --from=builder /usr/src/app/prisma ./prisma

# 3. THEN run npm install, so `prisma generate` can find the schema
RUN npm install --only=production

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]