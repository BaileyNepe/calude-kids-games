# Math World is a static site: build the bundle with Node, then hand the
# result to nginx. The Node toolchain never ships in the final image.

FROM node:22-alpine AS build
WORKDIR /app

# Copied separately so `npm ci` is only re-run when the lockfile changes,
# not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS runtime

# Railway assigns the port at runtime, so the listen directive can't be
# baked in. nginx's entrypoint runs envsubst over everything in templates/
# and writes the result into conf.d/ before starting.
ENV PORT=8080
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# The stock config in conf.d would otherwise also match / and race ours.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
