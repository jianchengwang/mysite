---
title: 多套环境怎样共用一份配置
description: 用读书笔记 API 理解 Helm 与 Kustomize，分清共享配置、环境差异、版本和发布边界。
collection: 云原生
order: 7
slug: '5-helm'
---

读书笔记 API 在开发环境跑起来后，我们还需要一套生产环境。最容易想到的办法，是复制一份 Deployment、Service 和 ConfigMap，再把里面的几个值改掉。刚开始确实省事，但以后增加健康检查、调整容器端口，每份文件都要跟着修改，漏掉一处就会出现“开发环境正常，生产环境不一样”。

这里简单梳理两种常用办法：Helm 用模板和参数生成配置，Kustomize 在已有配置上叠加差异。先弄清楚哪些东西应该共享，再决定用哪个工具，后面会容易很多。

## 先找出真正的环境差异

对于读书笔记 API，容器端口、Service 的选择器、健康检查路径通常可以共用。开发环境可以只跑一个副本，使用较小的资源请求，打开 debug 日志；生产环境可能需要三个副本、更多资源，以及 info 日志。开发环境还可能先验证新镜像，生产环境继续使用已确认的版本。

这些是有意保留的差异。把健康检查意外漏掉，或让生产连上开发数据库，则是配置错误。共用配置的目标，是让共同部分只维护一次，让差异能单独阅读和审查。

下面的副本数和资源值只是示例，实际需要结合容量测试决定。生产环境也不能仅靠“把数字调大”解决可用性问题。

共享配置也不要求共享运行中的资源。两套 API 可以使用相同的数据库连接配置结构，却引用不同的数据库地址和凭据。开发环境的数据清理不能波及真实笔记，日志开关也应由各自环境决定。先把这些边界写清楚，再提取共同部分，比复制完成后逐个找差异更稳妥。

## Helm 把应用封装成 Chart

Helm 是 Kubernetes 应用的包管理工具。Chart 可以理解为应用的安装包：`Chart.yaml` 描述名称和版本，`templates/` 放资源模板，`values.yaml` 提供默认参数。打包后通常得到一个 `.tgz` 文件。模板渲染完成，输出的仍然是 Kubernetes 能理解的资源清单。

比如把读书笔记 API 的默认副本数设为 1，镜像设为 `registry.example.com/notes-api:1.4.0`，日志级别设为 debug。生产环境的 `values-prod.yaml` 只写需要覆盖的部分：

```yaml
replicaCount: 3
image:
  tag: "1.4.0"
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    memory: "512Mi"
config:
  logLevel: info
```

默认的资源请求可以是 `100m` CPU、`128Mi` 内存。生产文件显式提高它们，镜像仓库地址继续使用默认值。`config.logLevel` 需要由 Chart 的 ConfigMap 模板转成应用读取的配置项，单纯在 values 里新增字段，应用不会自动识别。

Deployment 模板中的相关片段如下，省略了与本节无关的字段：

```yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

这里的变量属于 Helm 模板语法。Kubernetes 最后收到的是 `replicas: 3` 和具体的镜像地址，并不认识 `.Values`。Chart 作者把差异做成参数，使用者才可以通过 values 调整；没有暴露出来的字段，往往还要修改模板。

另一个容易混淆的词是 Release。它表示一个 Chart 的安装实例，包含这次安装的配置和后续修订记录。我们可以在开发命名空间安装 `notes-dev`，在生产命名空间安装 `notes-prod`，两者使用同一 Chart，却有各自的参数和升级历史。Release 名称在命名空间内区分实例；同一命名空间安装多次时，模板生成的资源名称也必须避免冲突。[Helm 术语说明](https://helm.sh/docs/glossary/)介绍了 Chart 与 Release 的区别。

## values 的覆盖顺序需要说清楚

values 看起来只是 YAML，真正容易出错的是“这个值最后从哪里来”。通常从低到高依次是：Chart 默认值、父 Chart 给子 Chart 的值、通过 `-f` 传入的文件、命令行 `--set` 参数。同一个键传入多个 `-f` 文件时，右边的文件优先；重复设置同一个 `--set` 键时，最后一个优先。[values 文档](https://helm.sh/docs/chart_template_guide/values_files/)与[升级参数说明](https://helm.sh/docs/helm/helm_upgrade/)给出了这些规则。

例如默认值是 1，生产文件写 3，流水线却残留了 `--set replicaCount=1`，最后仍然只有一个副本。排查时只盯着生产文件，就会找错地方。所以长期配置尽量写进受版本控制的文件，临时参数也要能追溯。

覆盖文件里没有出现的配置，还可能继续继承默认值。因此调整 Chart 默认值也属于发布变更。例如把默认日志从 info 改成 debug，所有未显式设置日志级别的环境都会受到影响。审查新版 Chart 时，不能只检查模板目录，也要比较默认值与参数含义。

升级时还要留意 `--reuse-values`：它会把已有 Release 的值带入，再合并这次的新值。若目标是从仓库完整重建配置，应明确选择取值策略，不能默认“旧值肯定消失了”。

Chart 可以提供 `values.schema.json`，用 JSON Schema 约束最终合并后的 values。例如下面只展示副本数约束：

```json
{
  "type": "object",
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 }
  },
  "required": ["replicaCount"]
}
```

这样把副本数写成字符串 `"three"` 就能被提前发现。Helm 的 lint、template、install、upgrade 等操作会在正常启用校验时检查 schema。但“整数且不小于 1”仍然允许生产只跑一个副本，环境要求还得另设检查。schema 也不能证明镜像能启动、数据库能连通。[Chart schema 文档](https://helm.sh/docs/topics/charts/#schema-files)说明了校验范围。

## 三种版本不要混在一起

`Chart.yaml` 中的 `version: 0.3.0` 是安装包版本，模板或默认参数变化时，应按发布规则更新它。`appVersion: "1.4.0"` 是应用版本的说明信息。容器实际运行什么，由渲染后的 `image` 字段决定；除非模板主动引用 `appVersion`，修改它不会自动更换镜像。

因此，“Chart 升到 0.4.0，但镜像仍为 1.4.0”完全可能。Helm Release 的 revision 又是某次安装的历史编号，不能拿它代替 Chart 版本或应用版本。查一次发布时，要把这些信息对应起来。[Chart 版本说明](https://helm.sh/docs/topics/charts/#charts-and-versioning)可以作为字段核对依据。

Chart 还可以通过支持 OCI 的仓库分发：

```shell
helm package ./notes-api
helm push notes-api-0.3.0.tgz oci://registry.example.com/charts
```

这里上传的是 Chart 包。目标路径不写 Chart 名称和版本，它们由包内元数据确定；使用时再指定具体 Chart 与版本。示例仓库只是占位地址，实际需要自己的仓库和相应权限。OCI 支持在 Helm 3.8 起已经默认启用，不必照旧教程设置实验性开关。[Helm OCI 文档](https://helm.sh/docs/v3/topics/registries/)说明了这套分发方式。

生产发布还应固定镜像版本，必要时固定 digest。把同一个已验证的镜像产物逐步推广，比到了生产环境再重新构建一次更容易追溯。Chart 包固定了，并不代表里面引用的可变镜像标签也固定了。[Kubernetes 镜像文档](https://kubernetes.io/docs/concepts/containers/images/)解释了标签与 digest 的区别。

<!-- figure:cn07-version-boundaries -->

[![同一发布记录包含 Chart 版本、appVersion、Deployment 镜像和 Release 历史编号，appVersion 只有被模板引用才可能影响镜像字段。](/collections-assets/cloudnative/cn07-version-boundaries.png)](/collections-assets/cloudnative/cn07-version-boundaries.png)

包版本、应用说明、镜像引用和安装历史各有用途，判断实际运行内容要继续核对镜像与 Pod。

<!-- /figure -->

## Kustomize 在基础清单上叠加差异

如果我们已经有能读懂的 Deployment 和 Service，又只是想调整少量字段，Kustomize 会比较直接。它不要求把 YAML 改成模板，而是组织基础资源，再声明要进行的变换。

可以把目录分成 `base/`、`overlays/dev/` 和 `overlays/prod/`。base 中放公共清单和 `kustomization.yaml`，overlay 引用 base，并描述环境差异。base 不需要知道有哪些 overlay，因此可以被多处复用；一个 overlay 也可以组合多个 base。[Kubernetes 官方指南](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/#bases-and-overlays)用的就是这个思路。

假设 base 里 Deployment 名叫 `notes-api`，生产环境的 `kustomization.yaml` 可以这样组织：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: notes-prod
replicas:
  - name: notes-api
    count: 3
images:
  - name: registry.example.com/notes-api
    newTag: "1.4.0"
patches:
  - path: resources.yaml
```

这里 `resources` 引入 base，`replicas` 改副本数，`images` 改镜像，`patches` 引入资源差异补丁。`resources.yaml` 只需针对名为 `notes-api` 的 Deployment、其中名为 `api` 的容器，填写生产环境的 requests 和 limits。这个文件是局部补丁，不能把它当作完整 Deployment 直接部署。

开发 overlay 保留一个副本和较小的资源，也可以先试 `1.5.0-rc.1` 镜像。调整某个环境时，查看它的 overlay 就知道差异在哪里。`namespace` 可以批量设置命名空间字段，但不会凭空创建对应的 Namespace，需要另外准备。

普通应用配置可以用 `configMapGenerator` 从文件生成，例如开发、生产分别提供包含 `LOG_LEVEL=debug` 和 `LOG_LEVEL=info` 的配置文件。生成器默认会给名称加内容哈希，并更新能识别的资源引用；若 Deployment 的 Pod 模板中引用了这个名字，内容变化导致引用变化，便能触发滚动更新。自定义字段里的引用仍需确认是否被识别。

不要把 overlay 叠得太深。读一个生产配置还要跨好几层目录查补丁顺序，很快又会变得难懂。

同样要注意修改范围：把公共健康检查加进 base，会影响引用它的每套环境；只提高生产内存，就应留在生产 overlay。补丁中的对象名和容器名相当于定位条件，改名之后要重新检查补丁是否仍然作用于预期位置。每次修改 base，都应重新生成所有相关环境的结果。

<!-- figure:cn07-environment-generation -->

[![Helm 用 Chart 加两套 values，Kustomize 用 base 加两套 overlay，分别生成开发和生产资源清单；开发一副本，生产三副本。](/collections-assets/cloudnative/cn07-environment-generation.png)](/collections-assets/cloudnative/cn07-environment-generation.png)

共同部分只维护一次，环境差异单独保留；两条路径都应审查最终生成的资源清单。

<!-- /figure -->

## 先看生成结果 再谈部署

给多个团队分发应用、提供稳定的参数接口和依赖管理，Helm 更合适。自己维护的应用，已有原生清单，环境之间主要是字段差异，可以先用 Kustomize。两者也能组合，但要说清谁负责哪一步，避免一个值同时被 values 和补丁修改。

无论选哪个，提交前都应展开成最终清单：

```shell
helm template notes-prod ./notes-api -f values-prod.yaml -n notes-prod
kubectl kustomize overlays/prod
```

这两条命令用于查看生成结果，不会执行部署。审查时重点看生产命名空间、镜像、副本数、资源、Service 选择器、配置引用和权限。有时源文件只改了一行，却会影响多个资源，展开后的差异更容易看清。

可以把“期望变化”写成一句具体的话：这次只把生产 API 从两个副本调到三个，镜像和配置不变。然后拿生成结果逐项对照。如果差异里突然出现 Service 选择器或数据库配置变化，就先停下来找原因。这比看到渲染命令正常退出便继续发布，多了一道实用的检查。

本地渲染成功，只能说明生成这一步通过了，不能代替目标集群的 API 校验，更不能证明业务可用。CI 可以逐环境渲染、校验并保存差异；发布后仍要检查健康状态和读书笔记的读写行为。[helm template 文档](https://helm.sh/docs/helm/helm_template/)也明确指出，本地渲染不包含完整的服务端有效性检查。

## 配置还需要一个可信来源

仓库写三个副本，有人临时在集群里改成五个，此时声明和实际状态出现了配置漂移。Helm 保存了 Release 历史，但单次安装或升级不会持续替你检查漂移；Kustomize 生成完清单也就完成了自己的工作。

GitOps 可以在这之外增加持续协调：把期望状态放进版本管理，让控制器拉取并比较实际状态，再按配置尝试恢复。Helm 和 Kustomize 都能成为其中的清单生成环节。紧急修改之后，要决定把变更补回仓库，还是恢复原配置，避免下次同步把它意外覆盖。[OpenGitOps 原则](https://opengitops.dev/)强调了版本化声明、自动拉取和持续协调。

数据库密码不要放进 Git 里的 values、普通配置文件或 Secret 清单。Secret 的 base64 是编码，拿到内容就能还原。`secretGenerator` 也不会自动保护输入文件。可以在仓库保留 Secret 引用，由受控的密钥系统提供实际内容；渲染产物和 CI 日志同样要检查泄露风险。[Kubernetes Secret 文档](https://kubernetes.io/docs/concepts/configuration/secret/)解释了这一边界。

最后，即使 Helm 能回滚资源配置，也不能自动撤销数据库迁移或已经写入的数据。配置复用解决了重复维护的问题，发布安全还需要兼容性设计、验证和恢复方案。

## 留几个问题

### 题目 1

Chart 默认两个副本，`values-prod.yaml` 写三个，发布命令又带了 `--set replicaCount=1`。最终是多少？应该先查哪里？

### 提示

把同一个键的所有来源按覆盖顺序列出来。

### 答案

最终是一个。先检查实际执行的命令及流水线参数，再核对 values 文件；不能仅凭文件内容认定生产有三个副本。

### 题目 2

把 `appVersion` 从 `1.4.0` 改成 `1.5.0`，就能确定 API 已经更新了吗？

### 提示

找到 Deployment 最后生成的 `image` 字段。

### 答案

不能。它首先是说明信息，模板是否引用它、最终镜像是什么，都要核对。即便镜像字段变了，也还要确认新 Pod 实际启动并通过业务验证。

### 题目 3

生产临时把日志改成 debug，问题处理完却没改回；Git 仍写 info。使用 Kustomize 能自动恢复吗？

### 提示

区分“生成配置”和“持续比较集群状态”。

### 答案

Kustomize 本身不会持续恢复。需要重新应用期望配置，或由配置好的 GitOps 控制器协调；同时确认 debug 日志是否记录了敏感内容，并按日志管理流程处理。
