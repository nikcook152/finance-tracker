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
# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/main"]