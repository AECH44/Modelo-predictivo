# Backend Express + PostgreSQL
# Imagen basada en Node 20 Alpine para mantener el tamano pequeno.
#
# Uso local con hot-reload:
#   docker-compose up backend
#   Editar archivos en ./backend/src -> Node --watch reinicia automaticamente.
#
# Build standalone:
#   docker build -t saberpro-backend ./backend

FROM node:20-alpine

WORKDIR /app

# Copiar solo manifests primero para cachear npm install
COPY package.json package-lock.json* ./

# Instalar dependencias (incluye dev para que node --watch funcione)
RUN npm install

# Copiar el resto del codigo
COPY src ./src
COPY scripts ./scripts

# Puerto del backend
EXPOSE 4000

# node --watch requiere Node >=18.11. Reinicia el servidor al editar .js
CMD ["node", "--watch", "src/server.js"]