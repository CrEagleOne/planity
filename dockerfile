# 🐳 Dockerfile — Planity (monorepo avec npm workspaces)

# Étape 1 : Build client + install via workspaces
FROM node:22.20.0 AS builder
ENV OPEN_BROWSER=false
WORKDIR /app

# Copie du package.json racine + workspaces
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Installation des dépendances via workspaces
RUN npm install

# Copie du code source
COPY client/ ./client/
COPY server/ ./server/

# Build du frontend React
RUN npm run build --workspace client

# Étape 2 : Image finale pour le serveur
FROM node:22.20.0 AS server
WORKDIR /app

# Copie du package.json racine + workspaces
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Installation des dépendances via workspaces
RUN npm install --omit=dev

# Copie du code source
COPY client/ ./client/
COPY server/ ./server/

# Copie du build React dans le dossier public du backend
RUN cp -r client/build server/public

# Lancement du serveur
WORKDIR /app/server
EXPOSE 5000
CMD ["node", "src/index.js"]
