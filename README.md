# mysite

个人网站 + 常驻个人 API。第一版保留 Nuxt 4 博客、工具、游戏、English 页面，把公众号草稿能力迁移为独立 Go 服务。

## 目录

- `web/`：现有 Nuxt Content 网站，内容文件和页面路由继续保留
- `api/`：Go HTTP API、MySQL 持久任务/幂等、微信服务端 token 和安全图片导入
- `deploy/`：接入 Mac mini 现有 Docker MySQL 网络、同域反向代理和显式迁移说明
- `scripts/deploy-web.sh`：保留原有静态网站部署入口；旧 Python API 部署已停用

## 快速开发

```sh
# Web：Node 25.x（沿用项目现有版本要求）
cd web
npm ci
npm run dev
# 同域代理外开发需要在构建/启动环境设置 NUXT_PUBLIC_API_BASE=http://localhost:8000

# API：Go >=1.26；先阅读 api/README.md，配置专用 MySQL 和环境变量
cd ../api
go test -race ./...
go run ./cmd/mysite-api -migrate
go run ./cmd/mysite-api
```

Go 服务没有 SQLite/in-memory 生产降级：MySQL 不可用就不接受任务。Redis 本版不需要，可后续增加缓存/限流；持久任务和幂等始终由 MySQL 保证。

公众号 AppID/AppSecret 只放服务端。前端只提交 Backend Key（至少32字符）和幂等键，不再接收微信 access_token。相同内容重复点击或网络中断后重试复用同一个任务；结果不明时停在待核对状态，不重复写微信。

先看 [API 接口与测试](api/README.md)、[Mac mini 部署](deploy/README.md) 和 [本轮验证记录](docs/first-go-slice-validation.md)。本次没有实际部署、创建凭证或调用真实微信接口。
