# Build shell (all MFE dist outputs must be staged into mfe-dist/ by CI before this runs)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
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
