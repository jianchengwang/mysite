# Personal Go API

默认 `MP_DRAFT_MODE=legacy` 保留原队列。同步模式已在本机生产 API 启用（2026-10-09 核查：`MP_DRAFT_MODE=sync`、缓存时长24h、容器健康）；接口契约与操作约束见`MP-SYNC-MIGRATION.txt`。配置为 `sync` 后，新的公众号请求只把账号绑定的请求 hash 和短期脱敏回执写 Redis，不写 MySQL 正文或媒体账本。旧任务读取、博客 API、MySQL 启动/健康检查仍保留。

同步客户端先读 `GET /api/mp/draft/capabilities`，POST 显式携带 `X-MP-Draft-API: 2` 与以 `v2.` 开头的幂等键。200 且 `status=succeeded`、`provider_success=true`、有效 `media_id` 才是草稿新增成功；未知结果的 `provider_success` 为 null。客户端断线后用同一键查询 `GET /api/mp/draft/result`，不换键自动重试。不要把旧任务的 key 改名为 v2 后重发。

Go ≥1.26 + MySQL 8.0+，服务原有 MD to WeChat 页面及云端审核内容包。没有通用任意 URL 代理、客户端微信 token、发布/群发接口或内存生产任务库。

## 运行

复制 `.env.example` 作为部署配置参考；程序只读取进程环境，不自动读取仓库 `.env`。实际凭证由操作者在本机安全配置，不提交 Git。

- `BACKEND_ACCESS_KEY`：必填，至少32字符，缺失直接启动失败
- `MYSQL_DSN`：必填，Go mysql driver DSN，指定专用数据库
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`：同时提供；缺失时草稿端点503，其他能力可运行
- `LISTEN_ADDR`：默认 `127.0.0.1:8000`；Docker 内设为 `0.0.0.0:8000`，仅绑定宿主loopback端口
- `CORS_ORIGINS`：逗号分隔的准确 origin；无通配符，无 cookie credentials

```sh
go test -race ./...
go vet ./...
go build -trimpath -o bin/mysite-api ./cmd/mysite-api
# 配置进程环境后显式迁移；不会自动创建数据库/用户
bin/mysite-api -migrate
bin/mysite-api -import-content ../web/content
bin/mysite-api
```

内嵌 SQL 只新增 `mysite_schema_migrations`, `mysite_tasks`, `mysite_media`, `mysite_content`。迁移身份需要建表权限；日常服务使用最小权限账号。无迁移或无持久DB时不启动。

## 接口

所有 `/api/*` 都需要 `Authorization: Bearer <backend-key>`；为前端迁移兼容 `X-Backend-Key`，不接受 query key。不要把真实 key写入curl命令、日志或分享文件。

### `POST /api/mp/draft`

必须有 `Idempotency-Key`（16–128个字母/数字/`.`/`_`/`-`）。扁平JSON字段：

```json
{
  "title": "已审核标题",
  "author": "作者",
  "digest": "摘要",
  "content": "<p>已审核 HTML</p><img src=\"data:image/png;base64,...\">",
  "content_source_url": "https://your-domain.example/article",
  "cover_image_data_url": "data:image/png;base64,...",
  "show_cover_pic": 1,
  "need_open_comment": 0,
  "only_fans_can_comment": 0
}
```

`cover_image_url` 可替代 `cover_image_data_url`，二者不可同时提供；两者为空时用正文首图。未知字段（包括旧 `access_token`）拒绝。

限制：title 1–64字符、author≤64、digest≤120；HTML≤4MiB；JSON≤8MiB；最多8张正文图；每图PNG/JPEG≤2MiB、≤20M像素。所有图先下载/完整解码，再开始微信写入。无图或坏图的任务明确失败。

新请求先写DB，然后返回202；相同 key/目标账号/内容返回已有任务（200），改内容用相同key为409。响应示例：

```json
{
  "id": "32-character-task-id",
  "destination_account_id": "configured-app-id",
  "status": "queued",
  "stage": "queued",
  "request_hash": "account-bound-canonical-sha256"
}
```

`Location: /api/tasks/{id}`。正文相同而目标AppID不同会隔离成不同任务；旧账号队列不会被新凭证消费。每个 worker 还会显式核对任务账号。

### `GET /api/tasks/{id}`

同样需要认证。状态：

- `queued`：已持久化，尚未执行
- `processing`：持有10分钟租约，任务实际执行总预算4分钟
- `succeeded`：已保存草稿，`result.media_id` 和 `result.article_count`
- `failed`：校验失败或明确的远端拒绝；不自动重新排队
- `needs_reconciliation`：网络中断/响应不明/检查点未持久化/租约过期；必须人工核对远端，禁止盲重试

返回各阶段回执。最终微信HTML及其包含封面ID/请求内容的hash在 `draft/add` 前持久化。超时可能已成功创建草稿，不能只看本地有没有 media_id。

`mysite_media` 用目标账号、原始图像 SHA256、用途（cover/content）作为唯一键。已确认的成功回执可跨任务复用；未确认或上传结果未知时阻止再次上传并要求对账。封面素材与正文图片使用不同用途，不混用URL和material ID。远端人工删除素材后需先核对并由操作者处理旧ledger，程序不会擅自补传。

### `GET /api/blog/content` / `GET /api/blog/content/{path}`

读取显式导入MySQL的原始内容及SHA。接口受同一认证保护；静态网站仍读取原Nuxt Content目录，不暴露后台密钥。导入支持Markdown、JSON、YAML，不删除现有库记录、不改写源文件、不支持双向同步。

### 健康检查

`GET /health/live` 不需认证；`GET /health/ready` 查询MySQL，故障503。健康检查不证明微信账号权限或外部API可用。

## 安全与失败语义

- 无fail-open认证，无query credentials，无 CORS `*`
- 微信 stable_token 只用服务端AppID/Secret申请，按过期时间减120秒缓存；写操作不因token错误自动重试
- 微信目标URL固定；日志不输出secret/token/请求体/完整远端URL
- 用户图片仅允许HTTPS:443，无userinfo；所有DNS结果必须公网，连接钉住已验证IP；禁代理、重定向、内网/回环/元数据IP，限制字节/像素/超时
- 上传之前持久化媒体预留与任务检查点；成功回执持久化后才推进
- MySQL使用唯一键和 `FOR UPDATE SKIP LOCKED`，安全支持多个进程竞争任务；没有仅靠进程map保护的生产幂等
- 编辑审核与实际草稿写入授权是两件事；本API不替调用方推断用户许可
- 这是个人单租户接口。不要把Backend Key嵌入公共JS或发给其他人；公网上线仍建议反向代理访问控制/限流、DB备份与告警

## 测试

普通测试仅用内存fixture、sqlmock与本地httptest，绝不连接微信或现有MySQL：

```sh
go test -race -cover ./...
go vet ./...
```

真实MySQL集成测试显式隔离在 build tag 中；只有操作者提供名为 `*_test` 的专用测试库时才运行：

```sh
# 用安全的环境配置注入 MYSQL_TEST_DSN，不把凭证写在命令里
go test -tags integration ./internal/app -run TestMySQLIntegration -count=1
```

会创建 `mysite_*` 表，并仅清理本测试账号的任务。没有提供DSN则跳过。不要用生产库验证。

## 官方接口参考

- [微信草稿新增](https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html)
- [服务端 Stable Access Token](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/getStableAccessToken.html)
- [Go MySQL driver](https://github.com/go-sql-driver/mysql)

官方微信文档在当前云环境无法直接读取；字段依据仓库已有适配及本地契约测试实现，真实账号权限、格式、网络白名单必须在单独授权的上线验收中确认。


## 草稿阶段可观察性

202 只表示请求已持久化入队，`accepted:true`，不表示微信成功。GET 任务返回 HTTP 200 也只表示成功读取任务。调用方必须检查 `status == "succeeded"` **且** `provider_success == true`，并保存有效 `result.media_id` 后才能宣布草稿已创建。

创建请求被拒绝时 `accepted:false`、`status:not_accepted`、`task_id:null`；没有创建入队任务。成功受理的响应包含 `task_id`、`poll_url`。同一 Idempotency-Key 的重复请求返回原任务，不再次入队；terminal 状态不自动重试。

任务回执和 JSON 日志包含 `task_id/stage/status/provider_errcode/provider_http_status/redacted_message/retryable/attempt/time`（日志时间为 `event_time`）。阶段包括 preparing、prepare_images、token、upload_*_reserve/pending/confirmed、prepare_draft、draft_add_pending/confirmed。最终失败仍保留实际失败阶段。`provider_errcode:null` 表示未收到有效微信错误码，不能凭空填入历史 40164。旧任务无法回溯丢失的阶段或错误码，明确标为 legacy。

微信 HTTP 200 的非零 errcode 是失败，原始 errmsg 不进入日志/回执；只使用固定脱敏说明。有效 media_id 才可成功。写入超时、5xx、非法响应或缺少 media_id 都是 needs_reconciliation，retryable:false。Token 请求的暂时网络/5xx 失败没有远端写入，可标 retryable:true；该字段仅是建议，不触发重排队或自动重试。过期 Token 写入失败会清空本机缓存，当前任务不重试；下一次独立授权任务再取 Token。

`GET /api/mp/draft/diagnostics` 受原认证保护，仅查询当前账号的 all-time 持久任务数、状态计数及最近20个脱敏回执，不读取任务正文，不调用微信。任务数0仅证明当前目标账号没有已持久化创建任务；任务数非0时按状态、时间和 task_id 定位，不能将“入队”“旧失败”“读取草稿数0”互相替代。两个只读查询并非事务快照，活跃队列的计数与最近条目可能短暂不同。

启动时输出只读 `mp_draft_queue_snapshot`。隔离候选可用 `-disable-draft-worker` 停止消费，仅测试健康检查和受保护接口，避免候选产生真实微信调用；生产默认保持原 worker 行为。健康 ready 只验证数据库，不证明微信发布链路已通。

本次测试全部使用本地 HTTP stubs、合成凭据与 sqlmock。禁止将 stub 中 40164/40001 当作当前账号的真实故障；未通过本测试创建任何真实微信草稿。
