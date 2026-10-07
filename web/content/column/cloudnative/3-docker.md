---
title: "从代码到可重复镜像"
description: "理解 Dockerfile、构建上下文、层缓存与多阶段构建，建立能追溯、能测试、能维护的镜像交付过程。"
collection: "云原生"
order: 3
slug: "3-docker"
---

读书笔记服务现在知道图片该存在哪里，也能正常接收停止信号。接下来出现一个更隐蔽的问题：同一份代码，上周构建的镜像可以生成缩略图，这周重新构建却失败了。

检查代码提交记录没有变化，基础镜像和依赖下载结果却发生了变化。容器能统一一部分运行环境，但前提是我们知道装进去的究竟是什么。构建过程决定软件制品的内容，发布过程则应准确选择经过验证的制品。

## 先把容器里的修改变成可审查的构建步骤

用 `docker exec` 进入容器，临时装好缺少的图片库，再用 `docker commit` 生成镜像，确实能保留容器文件系统的变化及相关配置。不过，挂载卷里的数据不会一起提交，进程内存、外部数据库也不在这份镜像里。[docker commit 的范围](https://docs.docker.com/reference/cli/docker/container/commit/)

这适合辅助调试，却容易漏掉“为什么这样安装、依赖从哪里来”的过程。正式交付时，应把有用的修改整理进 Dockerfile 和依赖文件。以后换个人维护，仍然能从源码开始构建，而不用先找到那个手工调好的容器。

## Dockerfile 还需要哪些输入

Dockerfile 描述从基础镜像开始，怎样复制文件、安装依赖和设置默认启动命令。它并不是构建的唯一输入：源代码、依赖声明与校验文件、构建参数、目标架构，以及构建时访问的外部包仓库，都可能影响结果。

执行 `docker build -f deploy/Dockerfile .` 时，最后的点指定当前目录为构建上下文。`-f` 指定 Dockerfile 的位置，不会自动把上下文改成 deploy 目录。普通 `COPY` 的源路径以指定上下文为边界；另一个目录里明明存在文件，构建却报找不到，首先就应核对这个边界。[Docker 构建上下文](https://docs.docker.com/build/concepts/context/)

读书笔记仓库里可能同时有源码、开发机的依赖目录、测试照片和 `.env`。把整个目录作为上下文，再执行 `COPY . .`，容易让无关内容进入构建。应使用 `.dockerignore` 排除本机依赖、上传文件、版本控制目录和凭据文件，并尽量明确需要复制的文件。`.gitignore` 不会自动替代它。

这也涉及信任：构建可能发生在远程机器上。决定上下文时，相当于决定哪些文件可以交给构建器，而不只是决定最终镜像会显示哪些文件。

## 缓存为什么有时帮忙有时掩盖变化

镜像文件系统按层组织。复制文件或安装依赖产生文件变化，构建器可以缓存相应结果；启动命令、标签等信息则属于镜像配置，不能把每一行 Dockerfile 都理解成一个包含文件的新层。[Docker 的镜像层说明](https://docs.docker.com/engine/storage/drivers/)

这里沿用 Go 示例。先复制所有源码，再运行 `go mod download`，改一行接口代码也可能让下载步骤重新执行。更合适的顺序是先复制 `go.mod`、`go.sum`，下载依赖，再复制经常变化的源码。这样普通源码变动不会连带使前面的依赖下载缓存失效。[Docker 缓存优化](https://docs.docker.com/build/cache/optimize/)

这里的关键是依赖关系。缓存复用依赖前面的状态、指令以及相关输入；在同一构建路径上，前面的变化会影响后续步骤。反过来，外部软件仓库发布了新包，不一定会使原来的安装指令缓存失效。今天重新构建，仍可能直接使用上周的安装结果。[构建缓存失效规则](https://docs.docker.com/build/cache/invalidation/)

因此，缓存命中不能证明依赖新鲜，缓存未命中也不能证明构建更可靠。发布流水线需要明确什么时候更新依赖，什么时候允许复用。排查构建差异时，先找发生变化的输入，比反复清空全部缓存更容易得到解释。

Go 项目应把 `go.mod` 和相应的 `go.sum` 一起纳入版本管理。前者参与依赖版本选择，后者保存模块校验值；`go.sum` 可能包含同一模块多个版本的记录，不能简单当成一份锁文件。构建仍要同时控制工具链和其他输入。[Go Modules Reference](https://go.dev/ref/mod)

## 多阶段构建把编译与运行分开

Go 编译器在构建时有用，线上处理读书笔记请求时却不必一直带着。多阶段构建的做法很直接：第一个阶段生成可执行文件，第二个阶段为它准备运行环境，再复制需要的文件。[Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/)

下面假设项目入口是 `cmd/notes`，同一程序支持 `api` 和 `worker` 两个子命令。为把阶段关系讲清楚，示例采用不依赖 cgo 的实现，图片处理使用纯 Go 库；若项目选择了原生图像库，需要按后面的说明调整。

```dockerfile
FROM golang:1.27.1-bookworm AS build
ENV GOTOOLCHAIN=local
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -o /out/notes ./cmd/notes

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/notes /usr/local/bin/notes
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/notes"]
CMD ["api"]
```

这里先记住几个条件。Go 镜像可从[官方标签清单](https://github.com/docker-library/official-images/blob/master/library/golang)选择；标签与系统包仓库仍会变化，不能据此声称输出永久固定。`GOTOOLCHAIN=local` 使构建使用镜像自带的 Go 工具链；项目要求更新版本时，会报错而非自动下载另一个工具链。[Go 工具链选择](https://go.dev/doc/toolchain)

编译后的程序被复制到 runtime 阶段，Go 编译器留在 build 阶段。运行镜像安装 CA 证书，是为了让程序能校验 HTTPS 服务证书。非 root 用户还需要可写的临时目录；图片处理可使用 `/tmp`，正式图片仍存到独立存储。

`ENTRYPOINT` 与 `CMD` 记录默认启动方式，构建时不会把 API 作为长期服务启动。同一镜像可以分别运行 API 与摘要工作者，部署时将后者参数改为 `worker`，不用为了两个角色各编译一份相同代码。

这里要注意，`CGO_ENABLED=0` 并不是所有 Go 项目都能直接套用的开关。若图像处理依赖 C 库，关闭 cgo 可能导致构建失败或排除对应实现；应在构建阶段准备编译依赖，在最终阶段准备兼容的动态库。把二进制放进 `scratch` 之前，还要确认它是否需要证书、时区数据、配置文件和可写目录。[Go cgo 文档](https://pkg.go.dev/cmd/cgo)

<!-- figure:cn03-multistage-build -->

[![基础镜像、平台、go.mod、go.sum、源码和构建配置进入 Go 构建阶段。依赖文件变化影响下载依赖及后续步骤，源码变化从复制源码起影响后续步骤。运行阶段使用自己的 Debian 基础镜像，安装 CA 证书并接收 notes 程序；构建秘密仅临时用于私有模块下载，不进入最终镜像。](/collections-assets/cloudnative/cn03-multistage-build.png)](/collections-assets/cloudnative/cn03-multistage-build.png)

多阶段构建把构建工具与运行文件分开。依赖输入和源码在不同步骤影响缓存；最终镜像的系统库、权限与启动命令仍需单独验证。

<!-- /figure -->

## 用摘要追踪镜像内容

构建完成后，团队给镜像打上 `notes-api:1.4` 标签。这个名字便于交流，但仓库中的标签可以被重新指向另一份镜像。两个环境都写着 1.4，实际拉到的内容仍可能不同。

digest 是依据内容计算的标识。镜像清单通过摘要引用配置与文件层；按确定的 digest 拉取，就能定位相应内容。它适合回答“线上究竟运行哪份制品”，但摘要本身不会证明代码来源可信，也不会证明业务已经通过测试。[OCI 内容描述符](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)

一个实用的发布记录，应同时保存源码提交、构建流水线、镜像 digest 与测试结果。测试通过后，让预发和生产引用这份已构建的制品；不要为了换数据库地址，又在生产发布阶段重建一次。数据库地址和环境凭据应在运行时配置。

基础镜像也可以固定到 digest，避免同一个标签悄然变化。代价是安全更新不会自动进入应用镜像，需要有明确的更新、重新构建和测试过程。长期固定旧摘要，却从不查看修复，是把可控变更做成了长期停滞。[Docker 的版本固定与维护建议](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions)

还应区分“能追溯输入”与“每次构建逐字节相同”。即使源码和依赖版本固定，时间戳、编译工具、网络下载或其他非确定性输入仍可能改变输出。先让交付链可追溯，并尽量复用已验证制品；需要严格可重复构建时，再对这些输入逐项约束。

## 同一个镜像名也可能对应不同架构

开发者在 ARM 笔记本上构建，生产节点却是 x86-64。Go 二进制与原生图片库都有目标架构要求，不能因为源码相同就直接跨架构运行。架构不匹配可能导致无法执行，或者拉取时找不到对应平台的镜像。

多平台镜像通常通过一个索引或 manifest list，关联 `linux/amd64`、`linux/arm64` 等平台的具体镜像清单。拉取时，运行时依据目标平台选择匹配的变体。同一个多平台索引的 digest 可以固定这一整组变体，但不同架构使用的文件内容本来就不相同。[Docker 多平台镜像结构](https://docs.docker.com/build/building/multi-platform/)

构建器可以采用模拟执行、多个原生构建节点或交叉编译。对读书笔记服务，选择方法之前应先确认图像库支持哪些平台，并分别验证上传与摘要路径。只在模拟环境里通过一次构建，不能替代目标架构上的运行验证。

<!-- figure:cn03-tag-digest-platforms -->

[![可变标签指向由摘要 I 标识的多平台索引；索引分别引用 amd64 清单 A 和 arm64 清单 B，每个清单有自己的配置与文件层。不同架构节点选择匹配的平台变体，I、A、B 仅为摘要符号。](/collections-assets/cloudnative/cn03-tag-digest-platforms.png)](/collections-assets/cloudnative/cn03-tag-digest-platforms.png)

多平台索引通过不同摘要关联各个平台的镜像清单，运行时选择与目标平台匹配的变体。固定摘要不等于签名或安全认证。

<!-- /figure -->

## 构建凭据怎样避免留在镜像里

团队把摘要处理的公共代码放在私有模块仓库里，安装依赖需要令牌。若把令牌写进 Dockerfile、通过普通 `ARG` 或 `ENV` 传入，或者先复制凭据文件、下一层再删除，都有泄露风险。删除后的合并视图看不见文件，不代表早先的文件层没有保留它。

BuildKit 的 secret mount 可以把凭据临时提供给需要它的某条构建指令。客户端通过 `--secret` 提供，Dockerfile 用 `RUN --mount=type=secret` 消费。挂载本身不会作为普通文件进入镜像层，但安装脚本仍可能主动复制凭据或把内容打印到日志，所以构建器与脚本仍须可信。[Docker 构建秘密](https://docs.docker.com/build/building/secrets/)

用于下载私有模块的构建凭据，与应用连接数据库的运行时凭据，也应分开。前者只需在构建时使用，后者根本不应成为镜像输入。这样的分离让同一制品可以进入不同环境，也降低了一次泄露牵连整个系统的可能性。

## 验证最终交付的那份镜像

源码测试通过，只说明测试环境满足条件。多阶段构建可能漏掉图片库，非 root 用户可能没有临时目录写权限，默认命令可能写错路径。这些问题要从最终镜像启动真实进程才能发现。

读书笔记的最小制品验收可以这样安排：以最终用户身份启动 API，连接隔离的测试数据库；创建一条笔记，上传图片并读取缩略图；再启动同一版本的摘要工作者，确认任务结果能回写；最后发送停止信号，观察退出行为。测试数据与依赖服务应可清理，不能直接拿生产数据库做验收。Docker 的 CI 示例也把镜像构建与推送前测试连接起来。[推送前测试镜像](https://docs.docker.com/build/ci/github-actions/test-before-push/)

维护时还要平衡下载体积、兼容性、排障便利与更新成本。更小的镜像通常减少不必要的软件，但不能仅凭体积判断安全；保留大量调试工具也会增加维护面。可以让运行镜像保持必要内容，另备受控的调试方法，并记录依赖清单与漏洞检查结果。

最后得到的交付对象，是一份有明确身份、运行条件和测试证据的制品。镜像仓库保存它，部署系统选择它，排障时再通过发布记录追溯它。后续讨论编排和发布时，这个身份不能在链路中丢失。

## 动手想一想

### 题目 1

只改了一行 Go API 源码，下载依赖的步骤却重新执行。Dockerfile 先 `COPY . .`，再执行 `go mod download`。怎样调整更合理？

### 提示

下载依赖真正依赖哪些输入？哪些文件每天都在变化？

### 答案

先复制 `go.mod`、`go.sum` 及下载必需配置，再下载依赖，最后复制源码。这样普通源码变化不会使前面的依赖下载缓存失效。同时用 `.dockerignore` 排除本机制品和无关文件；不要为了缓存命中而漏掉本地替换模块等真正影响构建的输入。

### 题目 2

预发和生产都配置 `notes-api:1.4`，预发上传成功，生产却缺少动态库。怎样确认它们运行的是不是同一制品？

### 提示

名字可以复用，内容标识与平台信息更可靠。

### 答案

检查实际解析到的镜像 digest 和目标平台，并追溯对应构建记录。若标签被覆盖，两边可能拉到不同内容；若为多平台镜像，还要比较各自选中的平台变体。随后检查最终阶段是否包含所需动态库，并在相应目标平台验证。

### 题目 3

私有模块令牌先被复制进镜像，下一条指令又删除了。最终容器看不到凭据文件，这样足够安全吗？

### 提示

合并后的文件视图，与早先镜像层保存的内容并不等价。

### 答案

不够。旧层可能保留凭据，构建日志或缓存也可能泄露它。应改用构建 secret mount，并检查脚本没有把凭据写进输出；若已有凭据泄露，还需要轮换令牌，不能只重新打包掩盖文件。

## 参考资料

1. [Docker：Build context](https://docs.docker.com/build/concepts/context/)
2. [Docker：Images and layers](https://docs.docker.com/engine/storage/drivers/)
3. [Docker：Optimize cache usage](https://docs.docker.com/build/cache/optimize/)
4. [Docker：Build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
5. [Go：Modules Reference](https://go.dev/ref/mod)
6. [Docker：Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
7. [Docker Official Images：Go 标签清单](https://github.com/docker-library/official-images/blob/master/library/golang)
8. [OCI Image Specification：Content descriptors](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
9. [Docker：Pin base image versions](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions)
10. [Docker：Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
11. [Docker：Build secrets](https://docs.docker.com/build/building/secrets/)
12. [Docker：Test before push](https://docs.docker.com/build/ci/github-actions/test-before-push/)
13. [Docker：Commit container](https://docs.docker.com/reference/cli/docker/container/commit/)
14. [Go：Toolchains](https://go.dev/doc/toolchain)
15. [Go：cgo](https://pkg.go.dev/cmd/cgo)
