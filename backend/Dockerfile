FROM node:20-alpine AS base

# Install dumb-init for clean process signaling
RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Ensure upload directory exists and has correct permissions
RUN mkdir -p uploads/resumes && chown -R node:node /usr/src/app

USER node

EXPOSE 5000

ENV PORT=5000 \
    NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
