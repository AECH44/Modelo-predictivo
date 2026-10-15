# Frontend Vite (React 19)
# Imagen basada en Node 20 Alpine.
#
# Notas para docker:
#   - Vite escucha en 0.0.0.0 dentro del contenedor (--host 0.0.0.0) para
#     que el puerto sea accesible desde el host.
#   - CHOKIDAR_USEPOLLING=true (definido en docker-compose) hace que Vite
#     use polling en vez de inotify. Es necesario en Windows porque los
#     bind mounts hacia el contenedor no generan eventos inotify.
#   - El volumen `frontend_node_modules` enmascara /app/node_modules del
#     contenedor para que `npm install` local del host no se borre.

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# El resto del codigo se monta via volumen (./frontend:/app) en docker-compose.
# COPY . . queda solo como fallback para `docker build` standalone.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]