
# 第一阶段：构建前端
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端项目文件
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# 第二阶段：构建Go应用
FROM golang:1.24-alpine AS backend-builder

WORKDIR /app

# 安装GCC和相关构建工具
RUN apk add --no-cache gcc musl-dev

# 复制Go项目文件
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# 构建Go应用
RUN CGO_ENABLED=1 GOOS=linux go build -o main .

# 第三阶段：最终运行镜像
FROM alpine:latest

WORKDIR /app

# 安装必要的运行时依赖
RUN apk --no-cache add ca-certificates tzdata

# 从后端构建阶段复制构建产物
COPY --from=backend-builder /app/main /app/
COPY --from=frontend-builder /app/frontend/dist /app/static

# 暴露应用端口（根据您的应用实际端口调整）
EXPOSE 3000

# 运行应用
CMD ["./main"]
