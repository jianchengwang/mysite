---
title: "从域名到 Pod 的一次请求"
description: "沿着读书笔记 API 的请求路径，理解 Service、EndpointSlice、DNS、入口路由与就绪状态，并用分层证据定位网络故障。"
collection: "云原生"
order: 5
slug: "4-k8s/k8s-network"
---

上一章让读书笔记 API 有了两个副本。现在删除其中一个 Pod，控制器会补出新的实例，但新实例的 IP 可能已经不同。浏览器该向谁发送下一次请求？后台摘要任务又该把生成结果交给谁？

如果每次替换实例都要修改调用方配置，自动恢复就只完成了一半。我们需要把“我要调用读书笔记服务”与“此刻由哪个进程接收连接”分开。Service 提供这层稳定入口，服务发现和网络数据面再把入口接到变化中的后端。

## 先分清两个域名的用途

设想用户访问 `notes.example.com/api/notes/42`。这个域名先解析到对外入口地址，浏览器建立连接，再由入口按域名、路径等规则选择后端。它通常不会在公网 DNS 中直接找到某个 API Pod。

集群内部的摘要任务可以使用 `notes-api` 这样的 Service 名称。同一命名空间内通常可以使用短名；跨命名空间时，应明确写出命名空间。例如在集群域为 `cluster.local` 的示例环境中，完整名字是 `notes-api.reading.svc.cluster.local`。实际集群域可以不同。

对于普通、非 headless 的 Service，这个 DNS 名字解析到 Service 的 ClusterIP。客户端不必随着每个 Pod 的替换重新寻找地址。headless Service 则没有 ClusterIP，DNS 可以返回后端地址集合，调用方需要理解如何使用这些地址。两种模式解决的问题不同，不能把所有服务发现都想成“DNS 返回 Pod IP”。参见 [Kubernetes 的 DNS 规则](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)。

另一个特殊类型 `ExternalName` 通过 DNS CNAME 指向配置的外部名称，本身不建立到后端的代理。用它给外部数据库起别名时，仍需解决目标的网络可达性与认证。参见 [ExternalName](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)。

DNS 解析成功，只证明找到了名字对应的地址。它不会验证应用监听端口、数据库连接和后端就绪状态。反过来，直接访问某个地址成功，也不能证明调用方使用的域名正确。为了避免把这些结论混在一起，排障时应分别记录“解析得到什么”和“向这个地址发送请求发生了什么”。

摘要任务在集群内调用 API，也不必绕回公网域名。选择哪条路径，应该由身份认证、网络边界与依赖关系决定，而不是因为浏览器使用这个域名，就让所有内部调用共享外部入口的限制。

## Service 如何找到自己的后端

这里继续用上一章的 `app: notes-api` 标签，给 API 加一个 Service。示例假定它与 Deployment 位于同一命名空间：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: notes-api
spec:
  selector:
    app: notes-api
  ports:
    - name: http
      port: 80
      targetPort: http
```

`selector` 匹配 Pod 的标签，不是 Deployment 的名字。控制器观察匹配结果，把后端地址、端口和相关状态写入一个或多个 EndpointSlice。Pod 被替换时，这组记录随之调整；Service 的名字则可以保持不变。[Service 官方说明](https://kubernetes.io/docs/concepts/services-networking/service/)介绍了这层关联。

这里有一个很具体的发布风险。假如另建一个 Deployment，它的 selector 与 Pod 模板都使用 `app: notes-web`，而旧 Service 仍然选择 `app: notes-api`，新 Pod 即使运行正常，也不会成为这个 Service 的后端。此时再把旧 Deployment 缩到零，入口就找不到可用目标了。单独修改原 Deployment 的模板标签、让它与原 selector 不匹配，会被 API 拒绝，并不能形成这个故障现场。

所以，标签也是调用链的一部分。版本号标签可以用于观察或灰度分组，但稳定 Service 的 selector 是否包含版本号，需要有明确意图。随手修改标签，可能等价于修改了服务的连接契约。

## 请求不会穿过 EndpointSlice 对象

客户端连向 `ClusterIP:80` 时，Service 对象本身并不是一台接收请求的服务器。kube-proxy 或替代实现观察 Service 和 EndpointSlice，配置实际的转发机制，再把连接送到某个后端。普通业务请求不会先访问 API server，再请控制器代为转发。[虚拟 IP 与服务代理文档](https://kubernetes.io/docs/reference/networking/virtual-ips/)解释了控制信息与数据面的关系。

示例中的 `port: 80` 是客户端使用的 Service 端口，`targetPort: http` 引用 Pod 中名为 `http` 的端口。上一章把这个端口声明为 `8080`，所以后端连接到达的是 Pod 的 8080 端口。使用端口名，可以让新旧版本在不同数字端口上监听时，仍然遵守同一个服务端口约定。

但声明不会启动监听。假如程序实际只监听 9090，而声明写着 8080，网络配置再正确也无法把请求送进程序；如果只绑定 `127.0.0.1`，同一个容器里访问成功，也不能证明其他 Pod 能访问它。

ClusterIP 稳定，指的是 Service 存在期间提供稳定入口；删除再重建 Service 不应假定 IP 不变。它也不保证请求严格轮流落到两个副本。长连接、连接复用、会话亲和与具体实现都会影响分布。验证扩容效果，应观察各副本的真实负载，而不是只数 Pod。

<!-- figure:cn05-stable-request-entry -->

[![浏览器通过 DNS 找到对外入口，在示例中入口经 Service 的 ClusterIP 80 端口选择一个 API Pod 的 8080 端口，API 再查询数据库；两个 Pod 是候选后端，不会同时处理同一个请求。部分入口实现可直接连接后端地址。](/collections-assets/cloudnative/cn05-stable-request-entry.png)](/collections-assets/cloudnative/cn05-stable-request-entry.png)

稳定入口隐藏后端地址的变化，真正接收请求的是仍在监听的应用进程；图中只展示一种数据面路径。

<!-- /figure -->

## 用 iptables 看一次逐跳转发

为了把这件事看清楚，可以选 kube-proxy 的 Linux iptables 模式，顺着一条连接往下看。假定 Service 的虚拟 IP 是 `10.96.0.20`，后端是两个监听 8080 的 API Pod：

1. 客户端连接 `10.96.0.20:80`，数据包匹配 Service 入口规则
2. 入口规则跳到这个 Service 对应的规则链，在符合条件的后端中选择一个
3. 被选中的端点规则执行目标地址转换，也就是 DNAT，把目的地址与端口改成该 Pod 的 IP 和 8080
4. 改写后的数据包沿集群网络到达 Pod，最后才由应用进程处理

所以，VIP 提供了稳定的匹配条件，端点规则连接着实际后端。Pod 替换以后，需要更新的是后端规则，客户端仍然访问原来的 Service 地址。这就是[官方 iptables 模式示例](https://kubernetes.io/docs/reference/networking/virtual-ips/#iptables-proxy-mode)要表达的核心过程。

如果有三个等权后端，前一条规则以三分之一的概率选择 A，剩余流量再以二分之一的概率选择 B，最后才到 C，那么每个后端最终约得到三分之一的新连接。第二条的二分之一是剩余流量的条件概率，不能直接当成总流量占比。

这里的规则链只是特定实现，不能由此推出 Service 永远等于 iptables。kube-proxy 还有其他模式，也可以被其他数据面替代。旧资料中“大集群强烈推荐 IPVS”的结论也不能照搬：kube-proxy 的 IPVS 模式自 Kubernetes v1.35 起已弃用，选择方案需核对版本、内核与网络实现，详见 [v1.35 的版本说明](https://v1-35.docs.kubernetes.io/docs/reference/networking/virtual-ips/#ipvs-proxy-mode)。排障同样应测试实际的 TCP 或 HTTP 服务；`ping` 使用 ICMP，结果不能代表 Service 端口是否可用。

## 就绪状态如何影响流量

新 API 进程启动后，可能还在加载配置或建立必要资源。此时端口已经打开，业务却还不能处理。readiness 用来表达“现在是否适合接流量”，与“进程有没有退出”是两个问题。参见[就绪探针的职责](https://kubernetes.io/docs/concepts/workloads/pods/probes/)。

在通常配置下，未就绪后端不会被当作常规新流量的目标。不过，selector 仍可能选中这个 Pod，EndpointSlice 中也可能仍有它的地址，只是条件不同。排查时必须看地址对应的状态，不能把“有后端地址”直接当成“有可用后端”。

这一规则存在显式例外：Service 开启 `publishNotReadyAddresses` 时，相关端点会被发布为 ready；终止中的端点还涉及 `serving`、`terminating` 条件以及实现的转发行为。需要服务发现的特殊工作负载可能会用到这些能力，但普通 API 不宜为了让请求暂时通过就关闭就绪保护。具体语义见 [EndpointSlice 条件说明](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)。

状态变化到转发规则变化需要传播时间，已建立的连接也不会自动搬到另一个 Pod。图片上传可能持续几十秒，应用退出时应给正在处理的请求合理的完成时间，并配合入口的连接排空策略。否则，“已经不接新流量”与“可以立即杀掉进程”之间的差别，会表现为发布时偶发的上传失败。[Pod 终止流程](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)描述了这些并行发生的动作。

就绪检查本身也需要取舍。若每个实例都因为共享数据库的一次短暂抖动而退出服务，剩余请求并没有更健康的地方可去。应根据接口能否降级、故障是否局限于单个实例来决定检查内容，并使用合适的失败阈值。让检查始终返回成功，会把未准备好的进程暴露给用户；把所有依赖都塞进同一个苛刻检查，则可能放大全局故障。

<!-- figure:cn05-endpoint-rules -->

[![控制器观察 Service 的 selector、端口和两个 Pod 的标签、地址与状态，把就绪 A 与未就绪 B 都记录在 EndpointSlice。数据面观察记录并更新转发规则，在普通配置下将调用方常规新连接送往 A；请求不会穿过 EndpointSlice 或控制器。](/collections-assets/cloudnative/cn05-endpoint-rules.png)](/collections-assets/cloudnative/cn05-endpoint-rules.png)

selector 匹配、端点状态记录和流量选择是三个环节，地址存在不代表此刻适合接常规新流量。普通配置的简化示意，publishNotReadyAddresses 与终止中端点另有语义。

<!-- /figure -->

## 对外入口由谁实现

Service 解决稳定后端入口，外部怎么访问，还要看暴露方式。NodePort 在节点上提供服务端口，可以成为入口设施的一环；能否从外部访问，则取决于节点地址、路由与防火墙。是否适合生产，不能只看类型名，还要考虑流量管理和暴露范围。

LoadBalancer 把入口交给相应实现，可以是云上的公网或内网负载均衡，也可以由 [MetalLB](https://metallb.io/) 等方案在自建环境提供。是否新建独立实例、能否共享地址以及怎样计费，由具体实现和供应商决定，不能推导为“每个 Service 都新建一个收费公网实例”。边界见 [Service 类型说明](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)与 [MetalLB 地址共享](https://metallb.io/usage/#ip-address-sharing)。

如果还需要按 HTTP 域名、路径选择后端，就要增加入口路由。Ingress 可以声明这些关系，但必须有相应 Ingress controller。只创建对象，不会自动出现工作的反向代理。

Kubernetes 的 Ingress API 已冻结，但仍保持稳定 API 的承诺，官方并未表示要移除它。[Ingress 官方说明](https://kubernetes.io/docs/concepts/services-networking/ingress/)给出了这一边界。

这里要特别区分 API 与具体项目：社区的 ingress-nginx 已于 2026 年 3 月退役，之后不再提供发布、缺陷修复和安全更新。旧安装地址还能下载，不能说明它仍受维护；旧教程中的 `controller-v1.3.1` 安装命令不应继续作为部署建议。已有用户应评估迁移到仍受维护的控制器或 Gateway API 实现。参见[退役公告](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)与[退役后的官方说明](https://kubernetes.io/blog/2026/03/30/kubernetes-v1-36-sneak-peek/#ingress-nginx-retirement)。

Gateway API 把职责拆得更明确：GatewayClass 关联实现类别，Gateway 描述监听器等入口设置，HTTPRoute 描述 HTTP 请求如何匹配与转发。这让平台维护入口、应用团队维护路由的分工更容易表达。它是一组扩展 API，使用前需要安装相应 CRD 和控制器，不能假定所有集群内置可用。参见 [安装前提](https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/)、[Gateway](https://gateway-api.sigs.k8s.io/reference/api-types/gateway/) 与 [HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)。

入口实现也可能直接连接 Service 对应的后端地址，而不实际经过 ClusterIP，例如 [Traefik 的说明](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/gateway-api/#native-load-balancing)就区分了这两条路径。因此，“浏览器→入口→Service→Pod”适合作为职责图，不能被当成每个集群逐跳经过的物理线路。选型时还要核对控制器支持的功能、证书管理、请求大小与超时限制；图片上传往往最先暴露这些差异。

## 沿着失败的边界找证据

假设笔记列表正常，上传却失败。先记录失败请求的域名、路径、大小、耗时、状态码与请求标识，再看入口和应用日志。如果应用完全没收到请求，应优先检查入口限制与路由；如果应用已经收到且在等待对象存储，盲目重启 Service 没有帮助。

对于连最简单请求都不通的情况，可以按以下顺序缩小范围，而不是一次修改全部配置：

1. 在原调用方所在的网络位置检查域名解析。名字错误、命名空间错误与 DNS 不可达是不同假设
2. 查看 Service 的 selector、端口，以及 EndpointSlice 的实际地址和条件。确认选中了预期版本，且后端端口正确
3. 从合适的集群内诊断位置访问 Pod IP 与目标端口，再访问 ClusterIP 与 Service 端口，比较失败发生在哪一段
4. 如果集群内部正常而外部失败，检查入口控制器、监听器、证书、域名与路径匹配；如果 Pod 之间就不通，再检查网络实现与策略

这些检查与 [官方 Service 排障步骤](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)相呼应。诊断位置很重要：从笔记本访问不通 ClusterIP，并不能证明集群内部网络坏了；临时诊断 Pod 的标签不同，也可能受到不同策略约束。

NetworkPolicy 可以限制流量，但需要网络实现支持。受策略隔离时，源端出站与目标端入站都要允许连接；仅给数据库增加入站规则，未必能修复 API 被限制的出站流量。默认拒绝出站的策略还可能使 DNS 查询失败。参见 [NetworkPolicy 的隔离规则](https://kubernetes.io/docs/concepts/services-networking/network-policies/)。

最终，网络只负责把字节送到合适的进程，无法判断“保存笔记”是否已经完成。请求超时后重试，可能遇到第一次写入成功、响应丢失的情况。上传与异步摘要提交仍需设计请求标识、幂等处理和可查询的任务状态。稳定入口减少了地址变化带来的麻烦，业务正确性仍要由应用协议守住。

## 动手想一想

### 题目 1

两个 API Pod 都显示 Ready，但 Service 的 EndpointSlice 中没有它们的地址。首先检查什么？

### 提示

就绪条件决定能否接流量，selector 决定这是不是它要找的后端。

### 答案

先比较 Service selector 与同一命名空间下 Pod 的实际标签，确认没有选错版本或拼错字段；再检查控制器是否正常协调。不能因为 Pod Ready 就认为任何 Service 都能自动发现它。

### 题目 2

Service 使用 80 端口，targetPort 指向 8080。你直接访问 Pod IP 的 80 端口失败，能说明 Service 转发坏了吗？

### 提示

区分入口端口和应用监听端口。

### 答案

不能。直接访问 Pod 应使用后端实际监听的 8080；访问 Service 才使用 80。还需确认程序监听 Pod 可达的地址。只有把测试目标和端口对应起来，比较结果才有意义。

### 题目 3

把上传请求的入口超时从三十秒改成三分钟，会自动解决发布时的连接中断吗？

### 提示

入口等待时间、Pod 终止时间与应用处理中的请求是三个独立条件。

### 答案

不会。旧 Pod 仍可能在上传完成前退出，转发状态也需要传播。需要协调就绪变化、连接排空与终止宽限期，并让上传协议支持安全重试。单独延长超时还可能增加资源占用。
