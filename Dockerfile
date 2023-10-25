FROM oven/bun:1.0.7-alpine AS compile
WORKDIR /app
ADD . .
ENV FILE_SERVER_PORT 3001
ENV FILE_SERVER_DEBUG true
RUN bun build --compile index.ts --outfile start_server

FROM node:18-alpine AS base
WORKDIR /app

# INSTALL GLIBC Required for runing Compiled executable
ARG CAPROVER_GIT_COMMIT_SHA=${CAPROVER_GIT_COMMIT_SHA}
ENV GLIBC_VERSION=2.28-r0
ENV GLIBC_REPO=https://github.com/sgerrand/alpine-pkg-glibc
RUN apk --no-cache add ca-certificates wget
RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub
RUN wget ${GLIBC_REPO}/releases/download/${GLIBC_VERSION}/glibc-${GLIBC_VERSION}.apk
RUN apk add --no-cache --force-overwrite glibc-${GLIBC_VERSION}.apk
# END INSTALL GLIBC
COPY --from=compile /app/start_server ./

EXPOSE ${FILE_SERVER_PORT}
CMD ["./start_server"]