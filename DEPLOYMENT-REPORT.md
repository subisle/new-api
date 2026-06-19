# 🚀 New-API 生产环境部署完成报告

## 部署信息

**部署时间**: 2026-06-16 14:17 (UTC+8)  
**服务器**: 162.243.93.40 / 2604:a880:0:202a:0:1:1f5e:a000  
**部署方式**: Docker Compose  
**数据库**: PostgreSQL 16  

## 访问地址

- **IPv4**: http://162.243.93.40:3000
- **IPv6**: http://[2604:a880:0:202a:0:1:1f5e:a000]:3000

## 部署状态

✅ **所有服务正常运行**

### 容器状态
```
NAME               STATUS
new-api-app        Up (healthy)
new-api-postgres   Up (healthy)
```

### 功能验证
- ✅ API 响应正常
- ✅ 数据库连接成功
- ✅ 系统初始化完成
- ✅ OAuth 兑换码功能已部署（require_redemption_for_oauth: false）

## 服务架构

```
┌─────────────────────────────────────┐
│  Internet                           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Docker Host (Ubuntu 24.04)         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  new-api-app:3000            │  │
│  │  (new-api:latest)            │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  new-api-postgres:5432       │  │
│  │  (postgres:16-alpine)        │  │
│  │  Volume: postgres_data       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 配置信息

### 环境变量
```bash
SQL_DSN=postgres://newapi:***@postgres:5432/newapi?sslmode=disable
SESSION_SECRET=***
TZ=Asia/Shanghai
```

### Docker 卷
- `new-api_postgres_data`: PostgreSQL 数据持久化

### 网络
- `new-api_new-api-network`: 容器内部网络

## 首次访问

1. **访问首页**: http://162.243.93.40:3000
2. **初始化系统**: 
   - 系统检测到未初始化
   - 按照向导创建管理员账号
   - 配置系统基本信息

3. **启用 OAuth 兑换码功能**:
   - 登录管理后台
   - 系统设置 → 认证 → 基础认证
   - 开启 "OAuth 注册需要兑换码"
   - 在兑换码管理中生成兑换码

## 常用运维命令

### 服务管理
```bash
# 进入部署目录
cd /opt/new-api

# 查看服务状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f new-api
docker compose logs -f postgres

# 重启服务
docker compose restart

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 完全停止并删除容器（数据卷保留）
docker compose down

# 完全停止并删除所有（包括数据卷）
docker compose down -v
```

### 数据库管理
```bash
# 进入 PostgreSQL 容器
docker exec -it new-api-postgres psql -U newapi -d newapi

# 数据库备份
docker exec new-api-postgres pg_dump -U newapi newapi > backup_$(date +%Y%m%d).sql

# 数据库恢复
cat backup.sql | docker exec -i new-api-postgres psql -U newapi newapi
```

### 更新应用
```bash
# 1. 上传新代码到服务器
# 2. 重新构建镜像
cd /opt/new-api/build
docker build -t new-api:latest .

# 3. 重启服务
cd /opt/new-api
docker compose down
docker compose up -d
```

## 安全建议

1. **修改默认密码**
   - 编辑 `/opt/new-api/.env` 修改 `POSTGRES_PASSWORD`
   - 修改 `SESSION_SECRET` 为随机字符串

2. **配置防火墙**
   ```bash
   # 仅允许特定 IP 访问
   ufw allow from YOUR_IP to any port 3000
   ```

3. **配置 HTTPS**
   - 建议在前面配置 Nginx 反向代理
   - 使用 Let's Encrypt 免费 SSL 证书

4. **定期备份**
   - 设置定时任务备份 PostgreSQL 数据库
   - 备份 Docker 卷数据

## 监控

### 健康检查
```bash
# API 健康检查
curl http://162.243.93.40:3000/api/status

# 容器健康状态
docker inspect new-api-app | jq '.[0].State.Health'
```

### 资源使用
```bash
# 查看容器资源使用
docker stats new-api-app new-api-postgres

# 磁盘使用
docker system df
```

## 新功能测试

### OAuth 兑换码功能
测试清单：
1. ✅ 配置项正确返回 (require_redemption_for_oauth: false)
2. ⏳ 管理后台配置界面（需要首次初始化后测试）
3. ⏳ 新用户 OAuth 注册流程
4. ⏳ 兑换码验证功能

## 文件位置

- **部署配置**: `/opt/new-api/docker-compose.yml`
- **环境变量**: `/opt/new-api/.env`
- **源代码**: `/opt/new-api/build/`
- **数据卷**: `/var/lib/docker/volumes/new-api_postgres_data/`

## 已知问题

1. ⚠️ Docker Compose 版本提示过时（不影响功能）
   - 可以删除 docker-compose.yml 第一行的 `version: '3.8'`

## 支持

如遇问题：
1. 查看日志: `docker compose logs -f`
2. 检查容器状态: `docker compose ps`
3. 检查网络连接: `curl http://localhost:3000/api/status`

---

**部署人员**: Codex (Claude Opus 4.8)  
**部署状态**: ✅ 成功  
**下一步**: 首次访问并初始化系统
