#!/usr/bin/env bash
# redeploy-new-api.sh
# 在 162.243.93.40 上原地重建 new-api 容器，postgres 数据卷保持不变。
# 用法（本地执行）:
#   SSHPASS='...' ./redeploy-new-api.sh
# 或直接在服务器上跑：
#   bash /opt/new-api/redeploy-new-api.sh

set -euo pipefail

DEPLOY_DIR="/opt/new-api"
REPO_URL="https://github.com/subisle/new-api.git"
BRANCH="rk3318-subisle-deploy"
IMAGE_TAG="new-api:latest"

# 1) 拉最新代码 ---------------------------------------------------------------
echo "[1/6] 拉取最新代码 ($BRANCH) ..."
rm -rf "$DEPLOY_DIR/build-next"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR/build-next"
cd "$DEPLOY_DIR/build-next"
git log --oneline -1

# 2) 确保 .env 存在且包含强 SESSION_SECRET ------------------------------------
if [ ! -f "$DEPLOY_DIR/.env" ] || grep -q "your-random-session-secret" "$DEPLOY_DIR/.env"; then
  echo "[2/6] 生成强 SESSION_SECRET ..."
  cat > "$DEPLOY_DIR/.env" <<EOF
POSTGRES_PASSWORD=newapi_secure_pg_2026_subisle
SESSION_SECRET=$(openssl rand -hex 32)
EOF
else
  echo "[2/6] .env 已就绪，跳过密钥生成。"
fi

# 3) 备份 postgres（仅 pg_dump，不删 volume） ---------------------------------
echo "[3/6] 备份 postgres 到 $DEPLOY_DIR/backups/ ..."
mkdir -p "$DEPLOY_DIR/backups"
BACKUP="$DEPLOY_DIR/backups/pg_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec new-api-postgres \
  pg_dump -U newapi -d newapi --clean --if-exists \
  | gzip > "$BACKUP"
ls -lh "$BACKUP"

# 4) 构建新镜像 ---------------------------------------------------------------
echo "[4/6] 构建新镜像 $IMAGE_TAG （后台，请耐心等待 10-20 分钟）..."
docker build --platform linux/amd64 -t "$IMAGE_TAG" . 2>&1 | tee "$DEPLOY_DIR/build.log" | tail -n 30

# 5) 只重启 new-api，postgres 容器和数据卷保持不变 ----------------------------
echo "[5/6] 重启 new-api 容器（postgres 保持不变）..."
cd "$DEPLOY_DIR"
# docker-compose.yml 里 new-api 镜像 = new-api:latest
docker compose up -d --no-deps --force-recreate new-api

# 6) 健康检查 -----------------------------------------------------------------
echo "[6/6] 健康检查（最多等 90 秒）..."
for i in $(seq 1 18); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 3 http://localhost:3000/api/notice 2>/dev/null || echo 000)
  if [ "$STATUS" = "200" ]; then
    echo "✅ 服务正常 (HTTP $STATUS)"
    docker compose ps
    echo
    echo "部署完成。如需回滚："
    echo "  docker tag new-api:latest new-api:previous   # 提前打标签"
    echo "  zcat $BACKUP | docker exec -i new-api-postgres psql -U newapi -d newapi"
    exit 0
  fi
  echo "   等待中 ($i/18) status=$STATUS"
  sleep 5
done

echo "❌ 健康检查超时，请查看日志："
echo "   docker logs --tail 50 new-api-app"
exit 1
