# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build for production (output to www/)
RUN npm run build -- --configuration=production

# Production Stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/www /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
