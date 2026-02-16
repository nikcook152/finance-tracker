# frontend/Dockerfile

# 1. --- Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the SvelteKit app
RUN npm run build

# 3. --- Final Production Image ---
FROM node:20-alpine AS final
WORKDIR /app

# Create non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy the built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Change ownership to non-root user
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose the port SvelteKit will run on
EXPOSE 3000
# The command to start the app
CMD ["node", "build"]
