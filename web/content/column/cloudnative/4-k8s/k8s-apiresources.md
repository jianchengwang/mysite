---
title: "Kubernetes 如何让应用持续运行"
description: "沿着一次 Deployment 提交理解 API、控制器、调度器与 kubelet，区分容器重启、Pod 替换和业务恢复。"
collection: "云原生"
order: 4
slug: "4-k8s/k8s-apiresources"
---


读书笔记 API 已经打成镜像。现在希望运行两个实例，而且任意一个实例退出后，系统能补上缺口。

如果只有一台机器，可以用进程管理器或容器重启策略。机器增加到三台后，问题多了起来：两个实例应该放在哪里，机器离线后谁来发现，更新版本时如何避免一起停掉，管理员从哪里看见实际状态？

Kubernetes 把这些工作分给一组协作的组件。理解它们，最有效的方法是跟踪一个请求，而不是先背组件清单。

## 先分清 Node、Pod 和容器

Node 是运行工作负载的节点，可以是物理机，也可以是虚拟机。容器中的进程最终还是在某个节点上消耗 CPU、内存和磁盘资源。

Pod 是 Kubernetes 创建和调度工作负载的基本单位。一个 Pod 通常包含一个应用容器，也可以包含需要紧密协作的多个容器。同一个 Pod 中的容器共享网络空间，可以用 localhost 相互访问；需要共享文件时，还要显式挂载相同的卷。把它们放进同一个 Pod，意味着接受共同调度、共同生命周期等约束。

因此，API 和数据库虽然会通信，也通常不该随意放进同一个 Pod。它们有不同的扩缩容和升级节奏：API 可能需要四个副本，数据库不应因此复制成四个互不协调的数据实例。是否共处一个 Pod，应看它们是否真的需要作为紧密耦合的运行单位。

Deployment 在更高一层描述一组可替换的应用实例。它通常适合读书笔记 API 这样的无状态服务。这里的“无状态”是说实例本地不保存必须永久保留的业务状态，并不是说整个业务没有数据。

## 提交声明并不等于完成部署

设想我们提交如下教学片段。镜像名代表已经构建并推送到可访问仓库的应用镜像，实际使用时应换成自己的地址和确定的版本。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notes-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notes-api
  template:
    metadata:
      labels:
        app: notes-api
    spec:
      containers:
        - name: api
          image: registry.example.com/notes-api:1.0.0
          ports:
            - name: http
              containerPort: 8080
```

这里暂时只保留看懂对象关系所需的字段。健康检查、资源声明和安全设置会在后续章节加入，不能把这个片段直接当作生产模板。

`replicas: 2` 是目标副本数；`template` 规定新 Pod 应当长什么样；标签把这一组对象联系起来。`selector.matchLabels` 必须与模板标签匹配。`containerPort` 记录应用使用的端口，不会凭空启动监听，也不会单独把服务发布到互联网。

当 kubectl 把声明交给 API server，API server 会处理认证、授权和准入等检查，并保存有效的资源对象。此时返回成功，只能说明对象已被接受，实际应用可能还没有运行。

后续工作由不同组件持续推进：[1][2]

1. Deployment 控制器管理 ReplicaSet，并协调版本变化
2. ReplicaSet 控制器按目标数量创建 Pod 对象
3. 调度器为尚未绑定节点的 Pod 选择满足条件的 Node
4. 对应节点上的 kubelet 观察分配给自己的 Pod，调用容器运行时启动容器
5. 各组件持续报告观察到的状态，供其他组件和用户查看

这不是一条必须按同步函数返回顺序执行的流水线。组件通过 API 中的对象与状态协作，任何一步都可能暂时失败，然后在后续协调中继续尝试。

<!-- figure:cn04-reconcile-control-chain -->

[![kubectl 向 API server 提交声明，Deployment 控制器管理 ReplicaSet，ReplicaSet 控制器创建 Pod 对象；scheduler 为未绑定 Pod 选择节点并写回绑定，Node 的 kubelet 观察本节点 Pod、调用运行时启动容器并回报状态。](/collections-assets/cloudnative/cn04-reconcile-control-chain.png)](/collections-assets/cloudnative/cn04-reconcile-control-chain.png)

API 接受声明后，各组件持续推进实际运行状态；提交成功不等于业务已经可用。图中控制器通过 API 对象协作，虚线表示控制与状态路径。

<!-- /figure -->

## 期望与实际之间为什么会有距离

你要求两个副本，实际只有一个，可以有很多原因。

如果第二个 Pod 一直 Pending，调度器可能找不到满足资源请求或节点约束的位置。若它已经绑定节点但显示镜像拉取失败，应查看仓库地址、镜像是否存在及拉取权限。若容器反复退出，则需要看启动参数、应用日志、退出原因和资源情况。

因此，排查时先确定“走到了哪一层”，再选择证据：

```bash
kubectl get deployment,replicaset,pods
kubectl describe pod <pod-name>
kubectl logs <pod-name> -c api
kubectl logs <pod-name> -c api --previous
```

`describe` 中的事件常能说明调度、拉取镜像、挂载卷等阶段发生了什么；应用日志解释进程启动之后做了什么。`--previous` 在有上一份已终止容器实例的日志可取时，用来查看其输出。它不是长期日志存储，节点日志轮转或清理之后不能保证仍可找回。

`CrashLoopBackOff` 常出现在 kubectl 的展示状态里，表示容器反复失败后的重试退避；它不是所有故障的根因名称，也不是 Pod phase 的一种。把“它在 CrashLoopBackOff”当成诊断结论，会遗漏真正需要解决的启动错误。

## 同一个容器重启，与创建新 Pod 有什么不同

假设 API 进程因一个未处理异常退出。根据重启策略，kubelet 可以在这个 Pod 中重新启动容器。Pod 的身份可能保持不变，而容器实例已经更换。

再假设整个节点故障。一个具有确定 UID 的 Pod 不会被原样搬到另一台机器。负责工作负载的控制器会在相应条件下创建替代 Pod，新 Pod 有新的 UID，再参与调度。即使某些工作负载允许替代 Pod 使用相同名字，它也仍然是新对象。[3]

这一区别直接影响应用设计。API 不能把自己的 Pod IP 写进永久业务配置，也不能把上传文件只留在某个容器的可写层中。需要在替换之后继续存在的信息，必须有更长的生命周期或可重建的来源。

更细一点看，替代也不一定立刻发生。系统需要发现故障，处理节点状态与容忍时间，并找到有容量的节点。如果剩下的机器都装不下新 Pod，声明仍然正确，目标却暂时无法实现。

<!-- figure:cn04-pod-identity -->

[![上半 Node N1 内同一 UID=A 的 Pod 先后运行容器 1 与容器 2；下半 Node N1 故障，旧 UID=A 的 Pod 被终止或删除，控制器创建 UID=B 的新 Pod 并调度到 Node N2。旧 Pod 没有跨节点移动。](/collections-assets/cloudnative/cn04-pod-identity.png)](/collections-assets/cloudnative/cn04-pod-identity.png)

容器重启可以留在同一 Pod；节点故障的恢复通常依靠新建的替代 Pod，需要故障检测与调度时间。

<!-- /figure -->

## 声明式系统也需要明确的责任人

一个团队用 Git 中的文件声明副本数为二，另一位同事临时用命令把副本数改成五。之后自动同步工具再次应用 Git 中的配置，数量又回到二。

两方都可能执行了合法操作，但在竞争同一个字段的控制权。类似问题也会出现在手工副本数与自动扩缩容器之间。解决方式不是反复执行命令，而是说明哪个系统负责哪个字段，临时变更如何被记录、保留或回收。

从软件工程角度看，声明文件相当于一份可以版本管理的运行契约。变更这份契约，应当像变更接口一样可审查：为什么需要两个副本，为什么要求这样的资源，哪些条件使更新安全。把所有字段都填满并不能替代这些决策。

标签也属于契约的一部分。让两个独立控制器意外选中同一批 Pod，会造成管理冲突。给资源起名和设计 selector，应该有明确范围，而不是在所有示例中随手使用同一组标签。

## 控制平面与业务流量分开看

API server、调度器和控制器主要参与控制决策；应用请求通常通过网络数据面到达已经运行的 Pod，而不会让每次业务请求都经过 API server。

这带来一个重要区别：控制平面暂时不可用时，已在节点上运行的业务进程可能仍能接流量；但新调度、变更发布和需要控制器推进的恢复会受到影响。反过来，API server 能响应，也不代表业务入口和数据库健康。

因此，检查集群是否“正常”至少要问两件事：系统能否继续管理变化，用户请求能否完成。后面讨论可观测性时，我们会把这两个问题分别落实成证据。

## 不同工作负载在等不同的结果

Deployment关注的是持续维持一组服务实例。读书笔记API需要一直接请求，就符合这个模型。

如果是一次性把历史笔记重新生成索引，目标是“这批工作完成”，更适合Job。Job可以创建或重试Pod，并记录完成情况；程序仍要考虑重复执行和幂等性。`restartPolicy: OnFailure`允许在Pod内重启失败容器，`Never`则不做这种容器重启，但Job控制器仍可能创建新的Pod重试，两层动作要分清。

每天凌晨清理过期临时文件，可以由CronJob按计划创建Job。定时调度并不保证业务副作用恰好发生一次；还要处理任务重叠、错过调度时间和时区。把执行记录与幂等键放在业务可持久保存的位置，比假定“定时器只会触发一次”可靠。

如果需要在符合条件的每个节点上采集日志，可以用DaemonSet。它维护的是节点覆盖范围，不是一个任意副本数；节点选择和污点容忍仍会影响它实际运行在哪里。

StatefulSet则提供稳定身份、存储关联和有序管理等能力。它适合某些需要这些约束的有状态应用，但不会自动实现数据库复制或恢复内存状态。配置与存储一章会继续解释这条边界。

理解这些对象，可以先问“控制器把什么看作成功”：是持续的副本数、任务完成次数、节点覆盖，还是稳定身份及其运行约束。对象名称就不再是一张需要死记的表。

## apply也要处理字段所有权与冲突

初学时可以先用 `kubectl explain deployment.spec` 查看字段说明，用 `--dry-run=client -o yaml`生成起点，再审查配置差异。客户端dry run没有替你完成服务端准入或实际运行验证，生成的内容也不会自动符合项目需求。

`kubectl diff -f`帮助查看待提交差异，`kubectl apply -f`按声明更新对象。`replace`更接近提交一个完整的新对象表示；apply采用补丁相关机制，但不能由此推断“replace只能单写、apply可以任意并发且没有冲突”。并发安全还涉及资源版本、字段所有权与具体更新方式。

Server-Side Apply会让服务端跟踪字段管理者，多个管理者对同一字段的意图冲突时可能报错。遇到冲突，先确认谁应该管理它，不能把强制抢占字段当成常规修复。对副本数、镜像和自动注入字段，尤其需要提前划清工具的职责。

## 动手想一想

### 题目 1

提交 Deployment 后命令返回成功，但用户请求失败。你能从“提交成功”推断应用已经启动了吗？应该先看什么？

### 提示

把 API 接受对象、Pod 被调度、容器启动和应用就绪分开。

### 答案

不能。先查看 Deployment 和 Pod 状态，确定副本是否创建、是否分配节点、容器是否启动、就绪条件是否成立。按阶段检查事件与日志。即使 Pod 就绪，还需验证 Service、入口和实际业务请求。

### 题目 2

一个节点宕机之后，新节点上出现了名字相似的 Pod。能认为原 Pod 被迁移过去了吗？

### 提示

查看 metadata.uid，并考虑本地文件和网络身份。

### 答案

不能。Pod 一生只绑定到一个节点，恢复通常依靠控制器创建新的替代 Pod。新对象拥有新的 UID，其 IP 和本地文件状态不能被假定延续。持久数据需要独立存储，服务发现需要稳定入口。

## 参考资料

1. [Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
2. [Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
3. [Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
4. [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

5. [Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/)
6. [Workload Management](https://kubernetes.io/docs/concepts/workloads/controllers/)
