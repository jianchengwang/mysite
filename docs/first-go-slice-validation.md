# 第一版 Go + MySQL 改造验证

日期：2026-10-01。基于 main `de6f99efecf19085350a95acab00f48598b903e7`。仅在云端构建/测试，未部署到 Mac mini。

## 实现与保留

- Go HTTP API，mandatory Bearer/X-Backend-Key；不接受 query key 或客户端微信 access_token
- 服务端 Stable Access Token 缓存/刷新；仅实现公众号草稿创建，无发布/群发
- MySQL任务、按目标AppID隔离的幂等唯一键、租约、阶段检查点、最终HTML/hash、媒体回执
- 媒体按目标账号+原始图片SHA+cover/content用途持久预留和复用；未知外部结果进入待核对，不盲重试
- HTTPS图片导入限制公网解析/钉住IP、无代理/重定向、PNG/JPEG字节/像素/超时限制
- 前端去掉微信token输入，Backend Key仅保留在当前tab session；同内容稳定幂等key、异步任务轮询、保留待核对提示
- Markdown预览使用现有安全渲染器，转义原始HTML，避免编辑器执行来源中的脚本/事件属性
- 31个原有内容文件逐字节未改（28 Markdown、2 JSON、1 navigation），31个页面文件路径全部保留
- 24,039个已跟踪pnpm缓存文件从Git索引移除并加入ignore；工作目录缓存和历史未清空、未改写
- 现有数据库部署说明、仅API的Compose模板、同域反向代理示例；旧Python/SSH部署入口明确停用
- 显式内容导入到MySQL及受认证只读查询；网站本版继续使用Nuxt Content，不把页面改为依赖数据库在线

## 通过的检查

- 官方工具链：Go 1.27.1、Node 25.9.0；下载文件依据各官方发布的SHA256校验，仅解压到云端工具目录
- `go test -race -cover ./...`：19个测试通过，app包语句覆盖57.0%；含SQLmock、账号隔离、并发同key、SSRF过滤、图片解码、token缓存、unknown不重试、媒体复用及检查点失败
- `go vet ./...`：通过
- `go build -trimpath -o /tmp/mysite-api ./cmd/mysite-api`：通过
- 空环境启动二进制：明确拒绝缺失Backend Key，非零退出
- 云端WechatMp合成service-request端到端契约：HTTP202、2张正文图+封面模拟上传、模拟草稿成功、相同key重复返回1个任务；没有联系微信
- `npm ci`、本机依赖重建、`npm run postinstall`：通过
- `npm test`：4个Markdown安全、请求协议与session认证存储回归测试通过
- `npm run build`：Nuxt4生产构建通过，处理9个集合/31个内容文件
- `npm run generate`：静态生成114条路由通过
- 原内容SHA/字节比对和页面路径比对：全部保留
- `bash -n scripts/deploy*.sh`、`git diff --check`：通过

## 明确未通过/未验证

1. 独立基线对比：对main基线归档使用相同依赖、相同Nuxt生成配置（仅重定位绝对项目路径）和相同检查工具，基线266条诊断，本次262条，没有新增诊断，修复4条。全量Vue类型检查仍失败，剩余262条涉及34个本次未修改的既有文件（白板、游戏worker、OpenClaw、旧工具等）；本次修改文件无类型诊断。对比详情见 `typecheck-baseline-comparison.json`。未用 `@ts-nocheck` 或降低strict掩盖。顺手修复了本次涉及配置中的旧loadingScreens类型项与微信编辑器旧marked.highlight选项。生产构建成功不能等同全项目typecheck通过
2. 类型检查临时工具为vue-tsc 3.2.6，明确指向项目TypeScript5.9.3。临时npm工具依赖误选TypeScript7导致的启动错误已通过使用项目锁定版本解决；没有将新型编译器依赖写入工程
3. Docker命令/真实MySQL服务在当前云环境不可用。迁移测试为SQLmock契约测试，不是实际MySQL执行；提供单独 `integration` build tag 测试供专用 `*_test` 数据库验证
4. 当前云浏览器打开localhost静态预览被 `ERR_BLOCKED_BY_CLIENT` 拒绝；没有绕过限制，未声称完成UI点选/视觉验收
5. 微信真实token、账号能力、IP白名单、图片/草稿格式，以及真实Mac mini容器/ARM64/反向代理部署没有运行。官方微信文档在当前检索环境无法直接读回，接口字段依据现有代码与本地契约实现，上线仍需单独授权验收
6. Redis未接入、没有DB内容编辑器或双向同步。媒体回执被远端人工删除后的清理/对账没有自动化；不得将unknown状态直接重置queued

## 操作者后续步骤

先审阅 `api/README.md` 与 `deploy/README.md`；在已备份、专用数据库上执行迁移与可选内容导入，检查ready。使用真实公众号写入测试前另行确认目标账号和具体草稿内容；当前合成fixture不应发到真实草稿箱。

### 现有类型诊断分布

- `components/CollectionArticle.vue`：3
- `components/CollectionList.vue`：1
- `components/WhiteboardCanvas.vue`：23
- `composables/useOpenClawGateway.ts`：3
- `layouts/docs.vue`：1
- `pages/column/index.vue`：4
- `pages/english/index.vue`：1
- `pages/games/chinese-chess/index.vue`：4
- `pages/games/fish-pond/index.vue`：1
- `pages/games/gomoku/index.vue`：4
- `pages/games/huarongdao/index.vue`：7
- `pages/games/index.vue`：1
- `pages/games/rubiks-cube/index.vue`：1
- `pages/store/index.vue`：1
- `pages/tech/index.vue`：1
- `pages/tools/english-chunk/index.vue`：3
- `pages/tools/index.vue`：1
- `pages/tools/lobster-workshop/index.vue`：2
- `pages/tools/modbus/index.vue`：15
- `pages/tools/paper-split/index.vue`：1
- `pages/tools/prompt-collection/index.vue`：6
- `pages/tools/qwerty/index.vue`：4
- `pages/tools/rednote/index.vue`：4
- `pages/tools/storyboard/index.vue`：8
- `pages/tools/typing/index.vue`：6
- `pages/tools/yuki/index.vue`：3
- `utils/games/chineseChess.ts`：73
- `utils/games/digitalHuarongdao.ts`：5
- `utils/games/gomoku.ts`：24
- `utils/games/huarongdao.ts`：3
- `utils/games/rubiksCube.ts`：1
- `utils/live2d.ts`：1
- `workers/huarongdao-search.worker.ts`：7
- `workers/xiangqi-search.worker.ts`：39
