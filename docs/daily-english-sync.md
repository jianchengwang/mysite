# 每日英语同步入口（已下线）

> 2026-10-31：用户要求移除 mysite「每日英语」专栏与 Notion 合集；后续仅由「每日英语」Bot 定时私聊交付聊天稿+学习卡视频。本入口停止同步到站点与 Notion；X/微信草稿继续暂停。历史文章与封面已从源码树删除，备份见运行目录 `serve/mysite/legacy/daily-english-archive-*`。

以下为历史说明，不再执行。

---

# 每日英语同步入口

合集 ID：`daily-english`；公开目录：`https://www.jianchengwang.info/column/daily-english/`。
文章按 `YYYY-MM-DD` 去重，正文放 `web/content/column/daily-english/YYYY-MM-DD.md`，横版封面放 `web/public/collections-assets/daily-english/YYYY-MM-DD-cover.png`，文章 URL 为 `/column/daily-english/YYYY-MM-DD/`。

每次练习交付后，将已确认的完整原稿加入 `web/content/dataset/collections.json` 对应月份分组，复用日期 slug，不添加重复条目。保留来源、原创说明、加粗语块、英文后紧接中文；正文必须与交付稿的渲染文字一致。封面仅复制为公开副本（644），原件及 Library 身份不改。

运行现有 `npm test` 和 `NUXT_PUBLIC_API_BASE='' npm run generate -- --dotenv /dev/null`，核对合集、文章和封面。按已有 web-only 候选/发布流程更新静态 web；不运行会切换 API 的全量部署脚本，不改 API 镜像、数据库或凭据。同步源文件时只提交本次明确文件，普通 Git push，不 force。

mysite 标题严格沿用第一篇实际模板：`每日英语｜{中文学习主题}`。固定前缀为“每日英语”，分隔符为全角 `｜`，不添加空格、日期或序号到标题中；日期和序号继续分别使用现有 `date`／日期 slug 与 `order` 字段。文章 frontmatter 的 `title`、合集条目 `title`、页面主标题和 OG metadata 使用同一完整标题；HTML title 保留既有栏目及站点后缀。第一篇为“每日英语｜熟悉的事，也可以换个做法”，本期为“每日英语｜走错一步，也能有好体验”。TED 英文原标题与原学习稿正文保留，不把英文练习名用作 mysite 标题。

## 公众号草稿

调用既有本地 `http://127.0.0.1:9001` 接口；鉴权从仓库外运行配置中在进程内读取，不放命令行、正文、日志或 Git。

1. 先读取 `GET /api/mp/draft/capabilities`，确认 `mode=sync`、`api_version=2`。
2. 固定键格式：`v2.daily-english.YYYY-MM-DD.<topic>`。新文章先查询 `GET /api/mp/draft/result`，通过 `Idempotency-Key` 传键；并核对持久回执和官方现有草稿，防止换键重复新增。404 不证明远端没写过。
3. `POST /api/mp/draft` 使用同键和 `X-MP-Draft-API: 2`，正文由最终原稿渲染，封面使用 PNG/JPEG data URL（不超过2 MiB）；阅读原文链接指向当天已上线文章。仅创建草稿，不发布或群发。
4. 只有 HTTP200、`status=succeeded`、`provider_success=true` 且有效 `media_id` 才是成功。用官方只读 `draft/get` 回读核对标题、完整文本、语块加粗、封面和原文链接。
5. 写入前先保存持久提交标记，回执保存到运行目录 `state/daily-english/YYYY-MM-DD.json`，含日期、固定键、源稿 SHA、请求 SHA、request_id、media_id 和核验结果；不含凭据。Redis 回执仅保留24h，持久标记不能随缓存到期丢弃。
6. 超时、断线、未知结果或有持久标记而短期回执缺失时，只查同键及官方远端状态，不换键自动重发。现有 `/api/mp/draft/update` 只允许内容格式变更，不能用于自动重写正文或创建第二份。

2026-10-11：固定键 `v2.daily-english.2026-10-11.terry-moore-shoes`；源稿 SHA256 `e2b32e7072ee9cfdd6a77a20700216a26ec56d2411b7b47f70135c22ba811d14`。今天已发 X，不重复写入；Notion 由独立同步任务处理。本入口不新建排程。
