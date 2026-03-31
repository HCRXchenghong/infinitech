ARG NODE_BASE_IMAGE=node:20-alpine
ARG GO_BUILDER_BASE_IMAGE=golang:1.23-alpine
ARG GO_RUNTIME_BASE_IMAGE=alpine:3.20

FROM ${NODE_BASE_IMAGE} AS heic-builder

ARG NPM_REGISTRY=

WORKDIR /src/tools/heic-converter

COPY tools/heic-converter/package*.json ./
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
  && npm ci --omit=dev
COPY tools/heic-converter/index.js ./index.js

FROM ${GO_BUILDER_BASE_IMAGE} AS builder

ARG ALPINE_MIRROR=
ARG GOPROXY=https://proxy.golang.org,direct

WORKDIR /src/backend/go

RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s|https\?://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories; fi \
  && apk add --no-cache git

ENV GOPROXY=${GOPROXY}

COPY backend/go/go.mod backend/go/go.sum ./
RUN go mod download

WORKDIR /src
COPY backend/go ./backend/go

RUN CGO_ENABLED=0 GOOS=linux go build -o /tmp/go-api ./backend/go/cmd/main.go

FROM ${GO_RUNTIME_BASE_IMAGE}

ARG ALPINE_MIRROR=

RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s|https\?://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories; fi \
  && apk add --no-cache ca-certificates tzdata wget nodejs

ENV TZ=Asia/Shanghai

WORKDIR /app

COPY --from=builder /tmp/go-api ./go-api
COPY scripts ./scripts
COPY --from=heic-builder /src/tools/heic-converter ./tools/heic-converter

EXPOSE 1029

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:1029/ready >/dev/null || exit 1

CMD ["./go-api"]
