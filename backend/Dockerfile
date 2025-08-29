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
# Only copy necessary production dependencies
COPY package*.json ./
RUN npm install --only=production

# Add this line to copy the prisma schema and migrations
COPY --from=builder /usr/src/app/prisma ./prisma

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# The command from docker-compose.yml will override this, but it's good practice to have it.
CMD ["node", "dist/main"]