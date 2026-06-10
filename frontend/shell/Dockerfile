# Build shell (all MFE dist outputs must be staged into mfe-dist/ by CI before this runs)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# NODE_ENV=production must be set here so vite.config.js evaluates isProd=true
# and bakes the correct remote URLs (/mfe/<name>/assets/remoteEntry.js) into
# the shell bundle instead of the localhost:3001-3005 dev URLs.
# Without this, all MFE remoteEntry.js requests go to localhost and return 404.
ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine
# Shell static files
COPY --from=build /app/dist /usr/share/nginx/html
# MFE static files — staged by CI into frontend/shell/mfe-dist/<name>/
COPY mfe-dist/dashboard /usr/share/nginx/html/mfe/dashboard
COPY mfe-dist/products  /usr/share/nginx/html/mfe/products
COPY mfe-dist/stock     /usr/share/nginx/html/mfe/stock
COPY mfe-dist/supplier  /usr/share/nginx/html/mfe/supplier
COPY mfe-dist/reporting /usr/share/nginx/html/mfe/reporting
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
