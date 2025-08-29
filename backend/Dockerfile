# Stage 1: Build the application
# UPDATE: Use Node.js version 20
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# --- IMPORTANT: The order of the next blocks is changed for correctness and caching ---

# 1. Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma

# 2. THEN run npm install. This ensures `prisma generate` runs correctly after install.
RUN npm install

# 3. Copy the rest of the source code
COPY . .

# 4. Build the application
RUN npm run build

# Stage 2: Create the production image
# UPDATE: Use Node.js version 20
FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]