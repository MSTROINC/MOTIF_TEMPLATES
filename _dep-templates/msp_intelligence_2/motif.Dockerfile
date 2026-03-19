# Fast Vite + React + shadcn template for mSpace dataspaces
FROM node:21-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

WORKDIR /home/user

# Copy all template files
COPY package.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY components.json ./
COPY index.html ./
COPY src/ src/

# Install all dependencies
RUN npm install
