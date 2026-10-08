# 已公开内容的源码维护

2026-10-06：原 LLM 理论路线源码按 Library 同一文件 version2 修订，36章、114张当前引用图、123组题目／提示／答案，正文共171795个声明统计汉字。22章正文及第32章图2、第35章图5更新，首章及其余13章正文保持。本次前端发布 `07074228-27914786c11b`；共用 ReaderSettings 与小说全文保留，Git未提交或推送。公网已验证对应发布，281项HTTP检查、109篇文章与54种阅读设置组合通过。

## 权威位置

- 合集目录：`web/content/dataset/collections.json`。只包含 Cloud Native、最新 LLM 理论路线、温柔刀全本三个已批准合集。
- LLM：`web/content/column/llm-to-agent-learning/01.md` 至 `36.md`，114张新白板图按正文引用放在 `web/public/collections-assets/llm-to-agent-learning/`，文件名使用图片 SHA256。
- 温柔刀：`web/content/store/wenroudao-long/01.md` 至 `60.md`，6卷顺序为13／15／9／7／7／9章，封面在 `web/public/collections-assets/wenroudao/assets/cover.png`。
- 共享阅读：`SeriesCatalog`、`SeriesDirectory`、`SeriesReader`、`SeriesPager`、`CollectionArticle` 和 `series` 布局。
- 小说段落：`web/utils/novelParagraphs.mjs` 只对温柔刀按原换行拆出语义段落；`novel-reading.css` 仅作用于小说阅读器；段落左对齐、保留段间距，字号控制与明暗主题统一放在可折叠“阅读设置”里，正文源文件不批量加空格。

普通构建直接使用以上源码，无需从临时发布目录或Library恢复文章。内部版本稿、来源审计和证据文件不应放进 Nuxt 的 `content/` 或 `public/`。

## 测试与生产构建

前端依赖与既有锁文件保持不变。测试命令：

```sh
cd web
npm test
```

静态生成会执行 `pregenerate` 的合集发布检查，检查已发布正文存在、未发布正文不能混入公开目录以及公开文本中的版本标记。生产生成不加载开发 `.env`：

```sh
NUXT_PUBLIC_API_BASE="" npm run generate -- --dotenv /dev/null
```

本机原 `web/.output` 是早期原生服务的保留产物。为了保留它，本次在由合入后源码新复制的隔离目录中测试和生成；没有在原输出目录构建。之后的 Docker 构建从本仓库源码生成前端，不依赖旧 `.output`。

## 路由与验收

- `/column/llm-to-agent-learning/`：36篇理论目录及全部正文。
- `/store/`、`/store/wenroudao-long/`：温柔刀合集及60章。
- `/store/wenroudao`、`/store/changanluan`、`/store/mingyuelei` 的旧短稿路径仍为404；旧AI20篇路径不恢复。
- `deploy/macmini/verify.py` 已更新，允许批准的Store入口并正向检查36篇、60章及小说段落样式标记；既有旧短稿404、API鉴权、数据库只读检查及可选TTS检查保留。

API数据库没有导入这96篇新稿；这些页面由静态站点提供。三份旧短稿的API过滤和原数据库记录保持原样。既有一键部署脚本会处理API和web；本次使用经过审阅的web-only候选／发布／回滚流程，没有运行会同时处理API的一键部署脚本，未更改其安全流程。

所有既有无关修改、环境文件、API／公众号／TTS配置及运行目录保持不变。本轮定向合入前的工作区校验快照和目标文件备份位于本次任务目录的 `llm-v1-reader-release/`（前轮记录仍在 `source-integration/`），属于恢复记录；日常维护以本仓库源码为准。

最新LLM正文沿用原36个URL与合集身份，包含119套问题／提示／答案解析。新114张图使用完整内容哈希PNG文件名；历史图文件保留但新稿不再引用。`TheoryFigureViewer` 仅在LLM阅读器提供高清放大与平移，不挂载到小说。SVG与来源审计保留Library原包／私有staging，不导入公开目录。

统一阅读设置：`web/components/ReaderSettings.vue` 负责界面，`web/composables/useReaderPreferences.ts` 负责Nuxt共享状态及持久化。字号沿用 `mysite-reading-font-size`（16—24）；明暗统一为 `mysite-reading-theme`（paper／night），缺少新键时迁移旧 `mysite-novel-reading-theme` 的合法小说主题。`CollectionArticle` 统一接入column和store，`SeriesReader` 只保留章序信息，不再维护独立字号或外露控件。Cloud Native旧docs布局的手机目录文字／ARIA亦已对齐。代码块和表格保留原有字号、空白和滚动布局，小说段落保持左对齐与段间距；其他栏目的旧样式入口保持。

夜间样式同时覆盖标题及标题锚点的文字颜色，并对齐Tailwind排版颜色变量，避免小节标题链接继承明亮模式颜色；代码高亮和正文源稿保持。


本次精确来源：Library `libfile_eb1effcccb348191afb630d52fa9bffa` version2，file `file_00000000d16c82118fd0e5c750884bc5`，40675003字节，SHA256 `30272f0ce2ab55093b127c29f8b6c7f289a7285cdda4eaa4a666f1c086536939`。不更改collection/item身份及内部contentRevision，不将版本标签显示在网站正文。不写Notion。旧两张PNG留存但不再被当前正文引用。
