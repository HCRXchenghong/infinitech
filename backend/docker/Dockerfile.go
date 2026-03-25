# Go API Dockerfile
FROM golang:1.19-alpine AS builder

WORKDIR /app

# 安装依赖
RUN apk add --no-cache git

# 复制 go mod 文件
COPY go/go.mod go/go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY go/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o go-api ./cmd/main.go

# 运行阶段
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/go-api .

# 暴露端口
EXPOSE 1029

# 运行应用
CMD ["./go-api"]
