FROM node:20-alpine AS heic-builder

WORKDIR /src/tools/heic-converter

COPY tools/heic-converter/package*.json ./
RUN npm ci --omit=dev
COPY tools/heic-converter/index.js ./index.js

FROM golang:1.23-alpine AS builder

WORKDIR /src/backend/go

RUN apk add --no-cache git

COPY backend/go/go.mod backend/go/go.sum ./
RUN go mod download

WORKDIR /src
COPY backend/go ./backend/go

RUN CGO_ENABLED=0 GOOS=linux go build -o /tmp/go-api ./backend/go/cmd/main.go

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget nodejs

ENV TZ=Asia/Shanghai

WORKDIR /app

COPY --from=builder /tmp/go-api ./go-api
COPY scripts ./scripts
COPY --from=heic-builder /src/tools/heic-converter ./tools/heic-converter

EXPOSE 1029

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:1029/ready >/dev/null || exit 1

CMD ["./go-api"]
