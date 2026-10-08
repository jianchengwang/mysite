# Mac mini Docker 部署

本地开发仍使用 3000；Docker 生产固定使用 9001。FRP 已按后续明确确认，仅调整 `mysite-api` 为本地 `127.0.0.1:9001` 到远端 `9001`。

开发目录为 `/Users/mini/Workspace/code-agent/mysite`，运行目录为 `/Users/mini/Workspace/serve/mysite`。构建在 Docker 内执行，Nuxt 只生成静态页面；运行容器是 Nginx 静态服务器和 Go API，没有 Nuxt dev server。

## 一键部署

```sh
cd /Users/mini/Workspace/code-agent/mysite
./deploy/macmini/deploy.sh
```

脚本不拉取或推送 Git，不修改开发目录 `.env`，不执行数据库迁移或内容导入。开发修改应先检查本地差异并安全同步，再执行部署。English、Tools、Games 页面与专用资源已从当前前端移除；保留 Tech、Column、Links、About 和其余原文章。Store 短篇已完整归档到 Notion 后下架，旧网页返回 404；API 不再列出或读取这三篇，数据库原记录保留。

执行流程：

1. 首次从既有 `deploy/.env` 复制已批准的账户和 Backend Key 到运行目录 `config/api.env`（目录 700、文件 600）。原文件保留。DSN 只将宿主 `127.0.0.1:3306` 改为 `host.docker.internal:3306`，不改变密码、账户、数据库或权限。
2. 使用开发源码构建 ARM64 API 和静态站镜像，旧站点此时继续运行。构建上下文排除环境文件和本机产物。
3. 在回环测试端口 13000 启动独立候选 Compose 项目，验证健康、真实数据库读取、鉴权、保留网页和移除路由 404。
4. 候选通过后，首次迁移停止旧 web LaunchAgent，再启动生产 Compose 项目，占用生产 9001 端口；确认可用后停止旧 API LaunchAgent。原 plist 归档到 `legacy/`，从自动登录启动目录移开，防止后续端口冲突。
5. 更新 `state/current.txt`，保留上一版镜像标识并清理候选容器。不删除镜像、数据库或数据卷。

相同源码、锁文件及部署文件产生相同镜像标签。重复部署复测候选并复用 Docker 构建缓存；没有数据库初始化或写入动作。构建或候选失败时旧站点保持运行；切换后验收失败自动恢复上一版，首次迁移则恢复原生 web 服务。测试故障注入 `MYSITE_DEPLOY_TEST_FAILURE=after-switch` 仅用于验证此恢复路径，不用于日常部署。

## 运行目录

- `compose.yml` / `verify.py`：运行副本
- `config/api.env`：已有凭据；禁止输出、分享或提交 Git
- `state/current.txt` / `previous.txt`：当前/上一版标签
- `logs/build-api.log` / `build-web.log`：构建日志，不包含环境文件内容
- `legacy/`：原 LaunchAgent 配置与恢复记录

部署源码、Compose 和脚本受 Git 管理；运行目录与凭据在源码目录之外。旧前端源码另外归档到开发仓库已忽略的 `deploy/.macmini/releases/`，原服务读取的 `web/.output/public` 保留作首次迁移回滚。不要在原输出目录运行旧构建命令，否则会改变这份回滚快照。

## 访问与检查

- 本机 / LAN：`http://127.0.0.1:9001/`，LAN 仍使用 mini 的原 IP 和 9001 端口
- Go API 不发布宿主端口，只通过 Compose 内部 `api:8000` 被 Nginx 访问
- `http://127.0.0.1:9001/health/live` 和 `/health/ready`
- `/api/*` 保留同源路径和 mandatory Backend Key；浏览器前端不再提供原工具页的凭据输入界面
- `/english`、`/tools`、`/games` 及旧子页、专用资源返回 HTTP 404；没有 SPA fallback 将其伪装成首页

```sh
# 不输出容器环境变量
cd /Users/mini/Workspace/serve/mysite
MYSITE_RUNTIME_DIR="$PWD" MYSITE_RELEASE="$(cat state/current.txt)" \
  docker compose -f compose.yml -p mysite ps
curl --fail http://127.0.0.1:9001/health/ready
```

容器为 `restart: unless-stopped`；健康检查本身不会重启进程，只报告状态。进程异常退出会由 Docker 恢复。持续运行依赖 OrbStack/Docker 宿主服务可用，宿主休眠、Docker 未启动或现有 MySQL 停机时站点可用性也会受影响；本次不调整这些系统设置。

容器通过 `host.docker.internal` 访问既有 MySQL 发布端口。当前 OrbStack 的实际来源仍为账户已允许的 `192.168.107.1`，不扩展账户 Host 或权限。不得将容器内 `127.0.0.1` 作为宿主机地址。Redis 本版 API 不使用；现有 MySQL/Redis/PostgreSQL/n8n、防火墙及其余 FRP 映射保持原状。

## 回滚

```sh
cd /Users/mini/Workspace/code-agent/mysite
./deploy/macmini/rollback.sh
```

有上一版 Docker 标签时恢复该版并验证；没有上一版 Docker 时脚本报错，原 LaunchAgent 和旧静态产物保留供人工恢复，避免占用开发 3000 端口。回滚不会删除数据库表、任务、内容或凭据。恢复旧前端可能恢复此次移除的入口，属于显式回滚结果。源文件恢复可从 `web-source-before.tar` 或 Git 基线提取指定文件，先检查现有修改，不使用 `reset --hard` 或 `clean`。

公众号后端保留，目前部署凭据中的公众号字段仍为空，原 `api/.env` 不变。数据库中的原 31 份已导入内容保持原样；前端只生成保留的 26 份内容。这里没有自动同步数据库、数据库编辑发布或真实公众号写入验收。

## 用户自行配置公众号凭据

实际 Compose `env_file` 是 `/Users/mini/Workspace/serve/mysite/config/api.env`，位于源码仓库外，目录权限 700、文件权限 600。直接在本机终端编辑该文件中的 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 两行，使用新凭据；不要修改 `MYSQL_DSN` 或 `BACKEND_ACCESS_KEY`。用户所称 `MP_APPID`、`MP_APPSECRET` 对应这两个 `WECHAT_*` 名称。本版不实现回调验签/加解密端点，不保存 `MP_TOKEN`、`MP_ENCODING_AES_KEY`。

```sh
nano /Users/mini/Workspace/serve/mysite/config/api.env
```

仅 `restart` 不会重新加载 `env_file`。保存后在本机终端重建这两只 mysite 容器，API 健康后 Nginx 也会重新解析 API 内网地址：

```sh
cd /Users/mini/Workspace/serve/mysite
MYSITE_RUNTIME_DIR="$PWD" MYSITE_RELEASE="$(cat state/current.txt)" MYSITE_HTTP_PORT=9001 \
  docker compose -f compose.yml -p mysite up -d --force-recreate --wait --wait-timeout 90 api web
curl --fail http://127.0.0.1:9001/health/ready
```

不会打印凭据，也不会主动发起微信 token 或草稿测试；健康检查只验证服务与数据库，不能代表微信凭据已经过微信验证。

生产 9001 的本机与 LAN 精确 CORS origins 已加入运行配置；原开发 origins 保留，DB 与 Backend Key 未变。

本次 9001 迁移仅改运行配置，复用了已验收的 `07074228-98321c8e5b3f` 镜像；候选和正式服务均重新验收。Docker Hub 临时连接失败导致新构建未完成，新源码部署仍需构建网络恢复。镜像内 API/前端源码此次没有变化。

## 已启用的 FRP 映射

`/Users/mini/Workspace/serve/frp/frpc.ini` 中 `mysite-api` 为 TCP、本地 `127.0.0.1:9001`、远程 `9001`，其余配置保持原值。用户已明确批准整个客户端短暂重连，并使用原 frpc 程序通过 `nohup` 重启。外网地址为 `http://101.34.12.71:9001/`；首页和 `/health/ready` 返回 200，无凭据 `/api/blog/content` 返回 401，与本地响应一致。

本次 frpc PID 为 73191，8 个原代理名称均注册成功；其他服务没有执行完整端到端测试。原配置备份与受限日志在 `serve/frp/mysite-mapping-backups/`，文件权限 600。未配置新的 admin 端口、未修改 frps 或服务端防火墙。公网验收只用无凭据请求，没有向明文 HTTP 发送 Backend Key，未执行微信测试。

## 缓存构建与切换前视觉验收

Docker Hub 连接失败时，可在已验证的 Node 25 和现有依赖下生成静态站，并基于本地既有 Nginx 镜像构建新镜像；构建不加载开发 `.env`。此模式只允许 Go API 源码没有本地差异、且已运行 API 镜像与 Git 基线一致的情况。旧原生输出先归档到运行目录 `legacy/native-output/`。

```sh
cd /Users/mini/Workspace/code-agent/mysite
MYSITE_BUILD_MODE=cached-local MYSITE_DEPLOY_PREVIEW_ONLY=1 ./deploy/macmini/deploy.sh
```

候选固定为回环 `13000`，不会切换生产。实际浏览并复核候选后，以同一源码指纹的已构建镜像完成原有部署验证和切换：

```sh
MYSITE_REUSE_BUILT_IMAGES=1 ./deploy/macmini/deploy.sh
```

只有当前源文件指纹对应的两只镜像都已存在才能复用；源码再改动后应重新构建候选。数据库、公众号凭据和 FRP 均不由此模式修改。
