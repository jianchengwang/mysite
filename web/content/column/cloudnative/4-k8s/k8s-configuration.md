---
title: "配置与数据为什么需要独立生命周期"
description: "从配置更新、图片持久化和数据库升级出发，理解 ConfigMap、Secret、PV、PVC 与 StatefulSet 的责任边界。"
collection: "云原生"
order: 6
slug: "4-k8s/k8s-configuration"
---

读书笔记 API 可以随时替换，但数据库密码、用户上传的图片和已经生成的摘要，不能都跟着容器一起消失。它们虽然都可能表现为一段字符串或一个文件，却有不同的来源、变更频率和恢复方式。

应用代码从构建产物恢复；配置由经过审查的配置版本恢复；凭据需要受控分发与轮换；用户数据只能从持久存储、备份或明确的重建来源恢复。先判断一个东西应当活多久，再选择 Kubernetes 对象，通常比先问“该挂什么卷”更有效。

## 把配置从镜像里取出来

假设测试环境与生产环境只差数据库地址、图片桶名和摘要任务并发数。为两个环境分别构建镜像，会让“同一份代码经过测试再发布”变得难以确认。将这些值在运行时提供，可以复用同一个镜像，也能单独审查配置变化。

ConfigMap 适合非机密配置，例如 `SUMMARY_CONCURRENCY=4`；Secret 用于密码、令牌等机密值。二者都可以独立于使用它们的 Pod 创建，再通过环境变量、挂载文件等方式提供给程序。通过 Pod 规范中的环境变量或普通卷引用时，配置对象要与 Pod 位于同一命名空间。它们面向小体量配置，ConfigMap 数据与单个 Secret 都有 1 MiB 上限，图片和大型模型文件应放在合适的存储里。[ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) 与 [Secret](https://kubernetes.io/docs/concepts/configuration/secret/)文档介绍了这些使用方式。

独立存放不等于自动安全。Secret 的 `data` 使用 base64 编码，它可以直接解码，不能提供加密保护。Kubernetes 默认不会替所有集群开启 Secret 的 etcd 静态加密；实际环境要核对加密配置、访问权限，以及哪些工作负载能够读取凭据。把 base64 字符串提交到公开仓库，仍然是在泄露秘密。

对这个应用，可以让 API 只获得读写业务数据库和图片存储所需的权限，摘要任务只获得它需要的那部分权限。排查配置时也应避免把全部环境变量打进日志。配置被分离以后，更容易限制分发范围，但权限边界仍需人为设计。

## 修改对象以后 程序看到了什么

把摘要并发数从四改成八，已经运行的任务进程会立刻改变吗？答案取决于它如何读取配置。

通过环境变量注入的值，在容器启动时形成进程环境。更新 ConfigMap 或 Secret 不会改写现有进程的环境变量。通常要以受控方式替换 Pod，让新容器读取新值；单独修改配置对象，也不会因为 Deployment 引用了它就自动触发滚动更新。Secret 环境变量的边界见[官方使用说明](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#define-container-environment-variables-using-secret-data)。

普通的 ConfigMap 或 Secret 卷挂载会最终收到对象更新，但从 API 变化到节点上的文件变化存在传播延迟。程序还必须重新读取文件，或实现可靠的配置重载；如果启动时只读一次，即使文件已经变了，内存中的值仍旧不变。两类对象通过 `subPath` 挂载时，都不会自动收到这类更新。具体边界见 [ConfigMap 更新机制](https://kubernetes.io/docs/concepts/configuration/configmap/#mounted-configmaps-are-updated-automatically)和 [Secret 文件更新机制](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod)。

挂载路径也值得单独看一下。把配置卷挂到 `/app/config`，会遮住镜像中这个目录原有的文件，而不是把新旧目录自动合并。若只想替换其中一个文件，可以考虑 subPath，但同时接受它不自动更新的限制。[挂载示例](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#add-configmap-data-to-a-volume)说明了这点。

程序也可以在获得必要权限后直接读取、监听 Kubernetes API 中的配置变化，这条路径由应用负责订阅与处理。因此，不能把“只有目录挂载才可能动态更新”当成所有配置方案的结论；讨论更新行为时，要先说明使用的是哪种消费方式。

实际选择时，可以考虑两种不同的工程策略。配置重载能避免替换进程，但要处理校验失败、并发读取和不同实例短暂使用不同配置的问题；把配置版本与一次发布绑定，更容易重现和回退，但每次变化都要经历发布过程。给配置使用明确版本，并让 Pod 模板引用该版本，是后一种策略的常见做法。

密码轮换还多了一方：数据库。只更新 Secret，数据库并不会自动接受新密码；只修改数据库，旧连接池重建连接时可能开始报错。应先设计凭据生效与撤销顺序，再验证各调用方已经切换。应用发布成功，并不能替代这项验证。

<!-- figure:cn06-configuration-consumption -->

[![配置对象把示例摘要并发数由 4 改为 8 后，现有进程环境变量仍为 4，受控替换时重新注入；普通卷文件延迟更新，需要应用重新读取和校验才改变内存配置；subPath 挂载不会自动接收对象更新。](/collections-assets/cloudnative/cn06-configuration-consumption.png)](/collections-assets/cloudnative/cn06-configuration-consumption.png)

Kubernetes 把新配置投影成文件，与应用接受新配置，是两个独立步骤；环境变量和 subPath 还有不同的更新边界。

<!-- /figure -->

## 文件留在了哪个生命周期里

上传接口把图片写进容器的可写层，容器被重新创建时文件就可能丢失。把目录换成 `emptyDir`，可以让数据跨越同一 Pod 中的容器崩溃，但 Pod 从节点移除时，它的数据也会被删除。因此，它适合摘要生成时的可重建临时文件，不适合作为用户图片的唯一副本。参见 [emptyDir 的生命周期](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)。

我们的图片可以存入具有独立生命周期的对象存储，数据库保存对象标识；读书笔记、摘要状态等结构化数据则由数据库管理。如果数据库运行在集群中，数据目录需要能跨越数据库 Pod 的替换。

PV 描述集群中的持久存储资源，PVC 表达应用对容量、访问模式和存储类别的请求。PVC 与满足条件的 PV 绑定，Pod 引用 PVC 使用卷。这样，替换 Pod 不必同时创建一份空数据库。这里的“持久”只说明存储生命周期可以独立于 Pod，不承诺磁盘永远不会坏。[PV 与 PVC 的关系](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)是理解这层分离的起点。

如果用软件开发来类比，PVC 很像应用提出的接口要求：“我要多少空间，需要什么访问能力”；PV 则描述满足要求的具体存储资源及连接信息。真正执行存取的是存储系统与驱动，PV 对象本身不会保存业务文件。这样应用不必把 NFS 地址或云盘标识到处写进部署文件，平台也可以在满足契约的前提下选择实现。

这个类比也有边界。应用仍需关心延迟、可用区和一致性语义，不能只看容量相同就随意更换后端。PV 可以对应网络文件存储、远程块设备或本地存储，并不等同于宿主机的一个目录；`volumeMode: Block` 还可以把原始块设备交给 Pod，应用直接操作设备，不经过文件系统目录。参见[卷模式说明](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-mode)。

StorageClass 进一步描述由什么 provisioner、按什么参数提供存储。具备相应驱动和后端时，PVC 可以触发动态供应；写出一个类别名称，并不会凭空安装存储系统。对于受可用区等拓扑限制的卷，`WaitForFirstConsumer` 可以等到结合 Pod 调度约束后再绑定或供应，避免先在不合适的位置创建磁盘。[StorageClass 文档](https://kubernetes.io/docs/concepts/storage/storage-classes/)解释了这项取舍。

手工预先创建 PV 是静态供应，按 PVC 需求创建资源是动态供应。文件系统卷的使用过程还可能涉及把设备附加到节点，再挂载并提供给容器；是否需要附加、是否分阶段，以及原始块设备如何提供，取决于驱动与卷类型。不能要求每一种存储都照着同一组 Attach、Mount 步骤工作，例如 [CSI 驱动可以声明跳过 Attach](https://kubernetes-csi.github.io/docs/skip-attach.html)。

因此，数据库 Pod Pending 时，除了 CPU 和内存，还应查看 PVC 是否绑定、存储供应事件、可用区约束及挂载错误。PVC 显示 Bound 也只是完成了资源绑定，不能证明文件权限正确，更不能证明数据库完成了恢复。

## 有稳定身份 还需要数据库自己的协议

Deployment 中的 API 副本应当可以互换。数据库成员可能需要更稳定的身份，例如 `notes-db-0` 与其对应的数据卷。StatefulSet 可以通过稳定名称、存储关联和有序管理帮助维持这种关系；替代 Pod 仍是新对象，只是重新使用相应身份和持久存储。参见 [StatefulSet 的职责](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)。

将数据库 StatefulSet 的副本数从一改成三，只会请求更多工作负载实例。主从复制、选主、写入一致性和故障切换，仍要由数据库及其部署方案实现。如果三个独立数据库没有正确配置复制，却一起挂到 API 的普通负载均衡后面，同一条笔记可能时有时无。

卷的访问模式也容易被误读。`ReadWriteOnce` 表达单节点读写，允许该节点上的多个 Pod 访问；`ReadOnlyMany`、`ReadWriteMany` 分别表达多节点只读与多节点读写能力。需要把卷限制到集群内单个 Pod 使用时，应评估 `ReadWriteOncePod`，并核对 CSI 驱动和集群支持情况。参见[访问模式说明](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)及 [ReadWriteOncePod 前提](https://kubernetes.io/docs/tasks/administer-cluster/change-pv-access-mode-readwriteoncepod/)。

这些模式不能替应用实现并发控制。即使底层允许多个节点写入，也不能因此让多个独立数据库进程随意共享同一数据目录。存储允许访问，与文件格式允许怎样写入，是两层契约。

## 数据留下来 与数据能够恢复

删除或缩容 StatefulSet 时，由模板创建的 PVC 默认保留，但可以配置 PVC 保留策略。PVC 被删除后，底层卷是否保留还取决于 PV 的回收策略；动态供应的卷常继承 StorageClass 的 `Delete` 或 `Retain` 设置。不能凭“这是有状态服务”就假定数据不会被自动删除。相关规则见 [PVC 保留策略](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention)与 [StorageClass 回收策略](https://kubernetes.io/docs/concepts/storage/storage-classes/#reclaim-policy)。

即使 PVC 与磁盘都完好，一条错误的删除语句也会立即改变数据。保留卷解决不了误删回退，数据库复制也可能迅速复制错误。备份需要另外保留可恢复的历史状态，并限制它与生产数据共同失效的机会。

以 PostgreSQL 为例，逻辑导出、文件级备份和连续归档有不同的恢复能力与操作要求。不能随意复制运行中数据库目录就称为备份；一致性快照也需要满足数据库与存储的条件。参见 [PostgreSQL 备份与恢复](https://www.postgresql.org/docs/18/backup.html)及[文件级备份限制](https://www.postgresql.org/docs/18/backup-file.html)。

设计备份时，应先回答最多能丢多久的数据、愿意等待多久恢复，再选择频率与技术。验证则应恢复到隔离环境，检查笔记数量、图片引用、权限和摘要任务状态。备份作业显示成功，只能说明某个步骤完成了，不能证明整套服务恢复后可用。

图片和数据库分开存储还有一个额外问题：数据库回到昨天，图片却保持今天的状态，两边可能不一致。需要明确恢复时点、对象版本或保留策略，并准备核对缺失引用与孤立对象的流程。

<!-- figure:cn06-volume-versus-backup -->

[![上半新 UID 的同名 notes-db-0 Pod 引用原 PVC，PVC 绑定 PV，驱动连接底层数据卷；替代 Pod 挂载后读取当前数据。下半生产数据库生成独立备份，在隔离环境恢复到选定时点并验证笔记、图片引用与任务状态。持久卷与备份有不同职责。](/collections-assets/cloudnative/cn06-volume-versus-backup.png)](/collections-assets/cloudnative/cn06-volume-versus-backup.png)

重新挂载卷读取的是当前状态；找回误删前的数据，需要另行保留历史并验证恢复。PVC 和 PV 描述请求与资源，并不直接保存文件。

<!-- /figure -->

## 数据库迁移也要允许新旧版本共处

最后考虑一次看似简单的修改：把笔记表的 `summary` 字段改成 `summary_text`。滚动发布期间，旧 API 和旧摘要任务可能仍在读写原字段。直接重命名，会让尚未升级的实例失败；回滚镜像也无法自动把数据结构还原。

可以采用先扩展、后收缩的迁移思路：先添加兼容的新字段，部署能够处理过渡状态的代码，再回填并验证数据；等旧 API、后台任务和回滚窗口都不再依赖旧字段后，才删除它。[Prisma 的迁移模式说明](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern)介绍了这种跨版本协作。

过渡期仍要决定谁是权威数据源。旧任务继续写旧字段时，简单做完一次回填就切换读取，可能漏掉后续更新；双写又必须处理失败、顺序和一致性。迁移应有单一执行协调、进度记录和验证条件，避免让每个 API 副本启动时竞争执行破坏性操作。

到这里就能看出，一次发布要检查的不只是新镜像能否启动。它能否读懂现有配置和数据，旧代码在过渡期间还能不能工作，都需要一起考虑。

## 动手想一想

### 题目 1

ConfigMap 已更新，容器中的配置文件也变了，但摘要任务仍然使用旧并发数。最值得检查什么？

### 提示

文件内容变化与程序内存中的配置变化不是同一个事件。

### 答案

检查程序是否只在启动时读取文件，以及重载机制是否成功。若使用环境变量，现有进程不会自动更新；若使用 subPath，文件也不会自动收到对象更新。应先确认注入方式，再决定重载还是受控替换 Pod。

### 题目 2

数据库已有 ReadWriteOnce PVC，可以保证只有一个 Pod 写入，也可以省略备份吗？

### 提示

分别检查访问范围和历史恢复能力。

### 答案

两者都不能保证。ReadWriteOnce 的范围是单节点，同节点多个 Pod 仍可能访问；PVC 也不会自动保留误删之前的数据。需要单 Pod 约束时评估 ReadWriteOncePod，备份与恢复演练则需独立设计。

### 题目 3

新 API 已发布完成，为什么删除旧摘要字段前，还要检查后台任务和回滚方案？

### 提示

数据库的使用者不只有当前接收 HTTP 请求的副本。

### 答案

旧后台进程、排队任务或回滚后的旧代码可能仍依赖旧字段。必须确认所有读写方已兼容新结构，过渡数据验证通过，并结束相应兼容窗口，才能执行收缩步骤。
