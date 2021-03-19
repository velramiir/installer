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
COPY --from=builder /usr/src/node-builder/builder .
RUN apk add --update npm && \
    npm install --production
CMD npm run production
