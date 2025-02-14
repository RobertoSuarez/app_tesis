# Etapa de compilación
FROM node:20.15.0-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . . 
RUN npm run build 

# Etapa de producción
FROM node:alpine as production
WORKDIR /app

# Instalar Chromium y sus dependencias necesarias
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Definir la ruta del ejecutable de Chromium para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /app/dist ./dist

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "node", "dist/index.js" ]
