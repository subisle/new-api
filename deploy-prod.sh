#!/bin/bash

set -e

echo "=== New-API 生产环境部署脚本 ==="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 创建部署目录
DEPLOY_DIR="/opt/new-api"
echo "📁 创建部署目录: $DEPLOY_DIR"
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# 复制配置文件
echo "📋 复制配置文件..."
cp docker-compose.prod.yml docker-compose.yml
cp .env.prod .env

echo ""
echo "🔐 请编辑 .env 文件设置安全的密码："
echo "   vi .env"
echo ""
read -p "是否已设置好 .env 配置？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  部署已暂停，请先配置 .env 文件"
    echo "   设置完成后运行: docker compose up -d"
    exit 0
fi

# 拉取最新镜像
echo ""
echo "📦 拉取最新镜像..."
docker compose pull

# 启动服务
echo ""
echo "🚀 启动服务..."
docker compose up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态："
docker compose ps

# 健康检查
echo ""
echo "🏥 健康检查..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/status > /dev/null; then
        echo "✅ 服务启动成功！"
        echo ""
        echo "🎉 部署完成！"
        echo ""
        echo "访问地址: http://162.243.93.40:3000"
        echo "         http://[2604:a880:0:202a:0:1:1f5e:a000]:3000"
        echo ""
        echo "查看日志: docker compose logs -f"
        echo "重启服务: docker compose restart"
        echo "停止服务: docker compose down"
        echo ""
        exit 0
    fi
    echo "等待中... ($i/10)"
    sleep 5
done

echo "⚠️  服务启动超时，请检查日志："
echo "   docker compose logs"
exit 1
