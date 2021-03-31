FROM node:14-alpine AS builder
WORKDIR /usr/src/node-builder
COPY . .
RUN npm install && \
    npm run build && \
    mkdir ./builder && \
    mv ./build ./builder/build && \
    mv ./config ./builder/config && \
    mv ./tsconfig.json ./builder/tsconfig.json && \
    mv ./package.json ./builder/package.json

FROM docker:20-dind
WORKDIR /usr/src/project
ENV DOCKER_CLI_EXPERIMENTAL=enabled
COPY --from=builder /usr/src/node-builder/builder .
RUN apk add --update curl && \
	export OSTYPE="$(uname | tr A-Z a-z)" && \
	curl -fsSL --output "/tmp/docker-app-${OSTYPE}.tar.gz" "https://github.com/docker/app/releases/download/v0.9.1-beta3/docker-app-${OSTYPE}.tar.gz" && \
	tar xf "/tmp/docker-app-${OSTYPE}.tar.gz" -C /tmp/ && \
	mkdir -p ~/.docker/cli-plugins && cp "/tmp/docker-app-plugin-${OSTYPE}" ~/.docker/cli-plugins/docker-app && \
	apk add --update npm && \
    npm install --production
CMD npm run production
