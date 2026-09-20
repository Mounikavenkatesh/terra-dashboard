# Stage 1: Build React + Vite application
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Node.js backend with the frontend build
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production || npm install --production

# Copy backend source code
COPY backend/ ./

# Keep the path aligned with server.js and the local repository layout.
COPY --from=frontend-builder /build/frontend/dist /frontend/dist

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
