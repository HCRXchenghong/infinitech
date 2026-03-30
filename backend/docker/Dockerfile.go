FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY . .

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o go-api ./cmd/main.go

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

ENV TZ=Asia/Shanghai

WORKDIR /app

COPY --from=builder /app/go-api ./go-api

EXPOSE 1029

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:1029/ready >/dev/null || exit 1

CMD ["./go-api"]
