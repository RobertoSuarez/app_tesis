# Etapa de dependencias
FROM node:20.18.0-alpine AS deps
WORKDIR /app

# Instalar solo las dependencias de producción para reducir el tamaño
COPY package*.json ./
RUN npm ci --only=production --omit=dev

# Etapa de compilación
FROM node:20.18.0-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias para aprovechar la caché de capas
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar el código fuente
COPY src/ ./src/

# Compilar la aplicación
RUN npm run build

# Etapa de producción - imagen final optimizada
FROM node:20.18.0-alpine AS production
WORKDIR /app

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=9000

# Instalar Chromium y sus dependencias necesarias (optimizado)
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      ca-certificates \
      ttf-freefont \
      && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Crear un usuario no root para mejorar la seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar solo los archivos necesarios para producción
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Cambiar la propiedad de los archivos al usuario no root
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no root
USER appuser

# Exponer el puerto
EXPOSE 9000

# Verificar la salud de la aplicación
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:9000/api/health || exit 1

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
