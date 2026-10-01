# Mac mini：现有 MySQL Docker + Go 常驻 API

本次代码改造不部署服务、不创建数据库/用户/凭证、不变更现有容器或反向代理。下面由部署操作者在确认配置后执行。不要把真实 `.env`、AppSecret、Backend Key 或 MySQL DSN 放进 Git、聊天或命令记录。

## 架构

- Nuxt 4 继续静态生成原有博客、工具、游戏和 English 页面；`/api/*` 由同域反向代理交给 Go
- MySQL 8.0+ / InnoDB 是任务、请求幂等、远端回执和导入内容的持久库；使用专用 `mysite` 数据库，不操作已有业务表
- 已有 Redis 本版不需要连接。以后可做缓存/限流，不作为唯一任务存储或替代 MySQL 唯一约束
- 容器仅对宿主 `127.0.0.1:8000` 暴露，反向代理负责 HTTPS。API 认证始终开启；不要公网暴露 MySQL/Redis

## 配置和迁移

1. 备份已有数据库。由你确认/配置专用数据库和最小权限 MySQL 用户，迁移身份需要 CREATE；长期运行身份仅需 SELECT/INSERT/UPDATE
2. 将 `deploy/.env.example` 复制为部署主机的 `deploy/.env`，填写现有 Docker network、MySQL 容器 DNS 名称、专用库 DSN、Backend Key、微信公众号 AppID/AppSecret及准确的前端 origin。Backend Key 至少 32 字符；本工具不生成或保存凭证
3. MySQL 连接跨不可信网络时启用 driver 的 `tls=true` 并配置可信证书；禁止用 `skip-verify` 绕过校验。现有 Docker 网络内的连接应仅对所需服务可见
4. 操作者执行（本次没有执行）：

```sh
cd deploy
docker compose --env-file .env config --quiet
docker compose --env-file .env build api
docker compose --env-file .env run --rm api -migrate
# 内容导入是显式操作，保留原文件且不删除未匹配的数据库记录
docker compose --env-file .env run --rm -v "$PWD/../web/content:/content:ro" api -import-content /content
docker compose --env-file .env up -d api
curl --fail http://127.0.0.1:8000/health/ready
```

Compose 只含 API，不定义 MySQL/Redis 服务或持久卷，不用 `down -v`，也不自动创建新网络。Apple Silicon 会由 Docker 构建 ARM64 镜像；无 CGO 依赖。

5. 合并 `Caddyfile.example` 的路由到现有反向代理，保留 HTTPS；不要记录 Authorization、X-Backend-Key、JSON 请求体或 access_token 查询值。不同源部署时将准确 origin 放到 CORS_ORIGINS，禁止 `*`
6. 前端生成时同域默认 `NUXT_PUBLIC_API_BASE=''`；分域时在构建环境显式设置 HTTPS API root。Nuxt 静态 public runtime config 在构建时固化
7. 微信公众平台账户可能需要配置出口 IP 白名单及已获授权的接口能力，由账户管理员在部署前核实。不要为测试随意扩大权限

## 验收、恢复和回滚

- `/health/live` 只表示进程存活；`/health/ready` 实际检查 MySQL。未迁移、缺 Key、MySQL 不可用时服务不启动
- 测试草稿是对真实账号的外部写入，只有明确授权后才执行。代码测试全部使用本地假数据和模拟端点
- 任务先持久化才返回202。`processing` 超过10分钟租约进入 `needs_reconciliation`，绝不重新排队；先人工查微信素材/草稿箱，再决定是否创建新的请求
- 超时、断线、非 JSON/不完整响应都可能已写入微信；不得以“没收到media_id”为由自动换 key 重发
- 同 key+同目标AppID+同内容只返回原任务；同 key 改内容为409。换 AppID 不会消费旧账号的队列
- 不提供一键“重试未知任务”或自动清空任务数据。DB 恢复后先对账，不要恢复到旧快照后盲重发
- 保留上一版镜像与数据库备份。迁移只新增 `mysite_*` 表；回滚应用时不要删表或回滚到不认识这些任务的旧 FastAPI 写入路径。若必须回滚前端，应关闭旧写入入口，避免客户端token机制复活
- 原 Nuxt Markdown 内容继续是网页当前渲染源；显式导入将相同原文及 SHA 放进 MySQL 并提供受认证的读取 API，后续再切换数据库驱动编辑/发布。当前没有双向同步或 DB 编辑器

## 已知边界

当前环境无 Docker/MySQL 服务，真实容器启动、MySQL SQL执行、ARM64镜像和微信线上权限未验收。Go测试使用 memory/sql mock；独立的 `MYSQL_TEST_DSN` 集成测试只在操作者明确提供专用测试库时启用，不读取部署凭证。
