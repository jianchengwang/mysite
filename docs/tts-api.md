# 统一 TTS API（Mini，已部署；真实试听已生成）

mysite Go API 为 Mini 工作流提供 `POST /api/tts`，统一鉴权、校验和调用 MiMo。内部 `TTSProvider` 接口隔离供应商；本期只接预置音色与 WAV，不增加队列、数据库表、语音克隆或任意上游代理。未来可在服务端扩展 provider，同时保留工作流 JSON 与 WAV 契约。

## 协议

`POST /api/tts`，`Content-Type: application/json`，沿用 `Authorization: Bearer <BACKEND_ACCESS_KEY>` 或 `X-Backend-Key`。不接受 URL/query 凭证、客户端 MiMo Key、model 或 base_url。所有 TTS 路由受现有 `/api/` 鉴权和 CORS 限制。Origin 白名单不替代认证。

```json
{
  "provider": "mimo",
  "text": "欢迎收听今天的节目。",
  "voice": "冰糖",
  "format": "wav",
  "style_instruction": "温和，清晰"
}
```

除 `text` 外可省略，默认 `mimo / mimo_default / wav`。不改写台词。text 非空且最多 2000 个 Unicode 字符；style_instruction 最多 300 字。请求体最多 16 KiB。音色白名单：mimo_default、冰糖、茉莉、苏打、白桦、Mia、Chloe、Milo、Dean。未知字段拒绝。只接受 WAV；音色设计和克隆属于以后显式扩展范围。

成功：HTTP 200，`Content-Type: audio/wav`、`Content-Disposition: attachment; filename="speech.wav"`、`Cache-Control: no-store`、`X-TTS-Provider: mimo`。最大音频 8 MiB；响应仅为音频，不回传上游元数据或台词。验证完整 PCM RIFF/WAVE 容器；非 stop 的生成结果（例如长度中断）拒绝，不作为完整配音。

错误沿用 `{"detail":"..."}`：400 参数/JSON 错误，401 未授权，403 现有 Origin/访问限制，415 类型错误，429 并发/频率/上游配额限制，503 MiMo 未配置或凭证被拒绝，502 上游失败/无效音频，504 超时。原始上游错误、正文与凭证不会传回或记录。失败日志只含 provider 和 HTTP 状态。

每进程全局 2 并发、滚动每分钟 10 次合成、MiMo 请求及上下文 20 秒超时；超过并发立即拒绝。429 提供 Retry-After。无自动重试、不缓存或落盘音频。已有服务 HTTP 写超时 30 秒，现有 Nginx 默认代理超时足够；本次未修改代理。限流是单进程总量；多副本时需重新评估总预算。本入口不提供幂等重放承诺，错误/网络中断时上游可能已计费，不能盲目自动重试。

`GET /api/tts/capabilities` 同样必须鉴权，返回音色、格式和限制；`configured` 只表示服务端有凭证配置，不表示已经向 MiMo 验证凭证、余额或模型权限。`/health/ready` 保留已有数据库就绪含义，TTS 未配置不会阻塞博客。

## MiMo 协议核对

2026-10-04 对照 agent-workflow `dev` 的 `data/skills/mimo-tts/scripts/execute_skill.mjs` 与[官方 TTS API 文档](https://mimo.mi.com/static/docs/api/audio/tts.md)、[官方使用说明](https://mimo.mi.com/static/docs/quick-start/usage-guide/audio/speech-synthesis-v2.5.md)：固定地址 `https://api.xiaomimimo.com/v1/chat/completions`，固定模型 `mimo-v2.5-tts`，服务端使用 `api-key`。台词放 assistant 消息，指导放可选 user 消息；`audio` 指定 voice/format，`stream:false`。从 `choices[0].message.audio.data` 解码 base64。供应商重定向一律拒绝。官方支持更多格式，本期只开放 WAV。

## 配置与安全输入路径

API `api/.env.example` 新增空 `MIMO_API_KEY=`。空值时 TTS 返回 503，现有博客与公众号行为不变。本次未查看或输出凭证、未编辑运行凭据配置，也未创建新凭证。

用户在 Mini 自行编辑现有生产私有文件：

`/Users/mini/Workspace/serve/mysite/config/api.env`

追加 `MIMO_API_KEY=<用户在本机安全输入的值>`，保留 `MYSQL_DSN`、`BACKEND_ACCESS_KEY` 及其他字段；目录 700、文件 600。不要发进聊天、Git、参数文件、镜像或日志。本次获父任务批准完成镜像构建和部署；助手未修改该凭据文件；用户随后自行配置 MiMo，本次已重新加载并生成一次真实试听。

工作流只需要既有 mysite 访问 Key，用户自行在仓库外私有文件 `/Users/mini/Workspace/workflows/.secrets/mysite-backend.key` 写入一行既有 `BACKEND_ACCESS_KEY`，目录 700、文件 600。不要复制整个服务端 env 文件。复用现有 Key 意味着它也能访问其他已有 `/api/*` 功能，应仅交给受信任工作流；如果以后有不受信任的调用者，再评估独立 scope/token。前端不应嵌入此 Key。

适配器默认 `MYSITE_BASE_URL=http://127.0.0.1:9001`；通过现有 web→Go 内网代理。允许显式 HTTPS origin，拒绝公网 HTTP、凭证 URL、query/path base URL、重定向与环境代理。生产 ty1/FRP/Nginx 与公网权限本次不改，未向公网发送认证请求。

## 调用示例（仅占位，无真实 Key）

`Authorization: Bearer <existing-mysite-backend-key>` 请求上述 JSON，响应保存为 WAV。推荐通过私有文件 CLI：

```sh
export MYSITE_BASE_URL=http://127.0.0.1:9001
export MYSITE_ACCESS_KEY_FILE=/Users/mini/Workspace/workflows/.secrets/mysite-backend.key
python3 /Users/mini/Workspace/workflows/storyboard/mysite_tts.py check
python3 /Users/mini/Workspace/workflows/storyboard/mysite_tts.py synthesize \
  --text-file /absolute/path/dialogue.txt --output /absolute/path/narration.wav --voice 冰糖
```

输出目录需存在；拒绝覆盖已有输出；完整 WAV 原子保存为 600。`check` 未配置返回非零，已配置也标记 `credentials_verified:false`。没有 Key 时不发请求。Python 可导入同一模块调用 `synthesize()`；返回 bytes，可使用 `save_audio()` 保存。Storyboard 原生 Grok 音轨不自动替换。

## 本地验证与剩余上线步骤

使用缓存 Go 1.26，与 go.mod 一致，未改 Go 版本或依赖。所有合成成功路径均为明确的本地 synthetic WAV mock，不能代表真实 MiMo 成功。

```sh
cd /Users/mini/Workspace/code-agent/mysite/api
MYSITE_TTS_ADAPTER_PATH=/Users/mini/Workspace/workflows/storyboard/mysite_tts.py \
  go test -race ./... -count=1
go vet ./...
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s /Users/mini/Workspace/workflows/storyboard -p 'test_mysite_tts.py' -v
```

覆盖鉴权/缺失配置、长度和白名单、未知字段、并发/滚动限流、deadline/cancellation、上游错误脱敏、HTTP redirect、JSON/base64/WAV/响应上限与不完整生成、客户端私有 Key 文件/缺失 Key 不请求、原子输出/不覆盖，以及真实 Python→随机回环 Go HTTP→mock MiMo transport 集成。既有 Go 公众号/数据库 sqlmock 等测试一并执行。MySQL 真实 integration build-tag 测试未启用；该功能无 schema 改动。

## 已批准部署记录与剩余工作

2026-10-04 14:06 UTC，用户批准后完成完整 Go Docker 构建及网站构建，13000 回环候选验收通过后切换生产 9001。没有使用旧 API 镜像的 cached-local 模式。候选容器和网络已清理；既有页面及用户源改动保留，没有推送 Git、数据库迁移或修改 FRP/Nginx/防火墙、agent-workflow 9002、STCP 或 ty1 站点。

- 当前 release：`07074228-1949aa946b2d`。
- API image：`sha256:063ae95ae5827109fe4f3eeca0b339aa90a8537e933575d7f7b484387b103da1`。
- Web image：`sha256:de8b0ebb259ec53cbc121e2427dae1e4bcad03351f795bd9176860d8e0c3e511`。
- 两个生产容器均 healthy，web 保持已有 `0.0.0.0:9001→8080`，API 无宿主端口。
- previous release：`07074228-016dd3c4780b`，原两只镜像仍存在，`state/previous.txt` 已记录；回滚使用既有 `./deploy/macmini/rollback.sh`。本次没有为验证而主动回滚生产。

候选及生产验收均通过：首页、tech/store/column/links/about 页面 200，移除页面/资源 404，健康检查通过；匿名/错误凭证的已有 API 401，认证数据库列表及内容读取 200，数据库仍为 31 份内容。TTS 匿名或错误凭证 401、认证能力查询 200、非法音色和上游 URL 参数 400；`configured:false` 且认证合法合成请求返回明确缺配置 503。没有调用真实 MiMo，也未向公网发送认证请求；公网 TLS 本次没有新增验收结论。

部署脚本新增 `verify.py --tts` 验收模式，部署候选和切换后启用；旧版 rollback 的默认验收模式保持兼容，不要求旧版存在 TTS 路由。验收只在缺 key 状态验证 503；如果以后配置为 true，也不会自动生成音频。

本地验证证据：27 项 Go 测试含 race、`go vet`、14 项 Python 新旧测试均通过。完整部署日志位于 `/Users/mini/Documents/Codex/2026-10-04/task-5/deploy-production.log`，本地测试日志同目录 `go-tests-final.log`、`python-tests-final.log`。

## 用户配置后的一次真实试听

2026-10-04，用户自行配置 `MIMO_API_KEY` 后，仅检查字段非空和文件 600 权限，没有查看或输出值；使用当前已验收 release `07074228-1949aa946b2d` 重建 API/web 容器加载 env_file。web 一同重建以重新解析 API 内网地址。9001 网站、数据库、既有鉴权与 TTS 参数校验回归通过；能力查询变为 `configured:true`。未改安全网络或其他服务，上一版回滚镜像仍保留。

通过 `http://127.0.0.1:9001/api/tts` 仅调用一次真实 MiMo 合成，使用已有 mysite 鉴权在进程内调用，不新增持久工作流凭证。输入 126 字符原创非敏感中文试听，包含 Anthropic、Sonnet 5.5、OpenAI、GPT 6.1 Sol、Gemini 4 Argon；音色为 `mimo_default`。没有自动重试或后续批量生成，没有修改视频。

产物 `mimo-weekly-name-audition-20261004.wav` 已成功保存 Library。WAV 为 24 kHz、单声道、16-bit PCM，22.88 秒，1,098,284 bytes；完整解析和 ffprobe 检查通过，PCM 峰值 26524、RMS 3033.14，非静音。SHA256：`5ed94f8a092b99e35d76d575458efdf76a1c5ea93ed96711bdebf8299039b14d`。

离线 faster-whisper small 转写确认有周报试听语句；混合英文专名的转写不稳定（Anthropic/Sol/Argon 等识别不准确），不能据此判定实际发音正确或错误。HTTP 成功、WAV 技术检查和 ASR 均不等于主观听感通过。音色、自然度和这些英文名称/数字的实际读音待用户审听；本任务不继续生成或改视频。

[官方按量价格页](https://mimo.mi.com/static/docs/price/pay-as-you-go.md)当前将 V2.5 TTS 系列标为限时免费；现有 mysite 接口不提供账户账单/余额查询，无法核对本次实际结算，未声称费用为零，也未购买或充值。

本地试听、请求技术回执、离线转写、容器重新加载日志位于 `/Users/mini/Documents/Codex/2026-10-04/task-5/` 下的 `mimo-weekly-name-audition-20261004.wav`、`mimo-audition-receipt.json`、`mimo-audition-asr.json`、`reload-mimo.log`。待用户选择音色或父任务协调后，再交原视频任务消费这份音频。
