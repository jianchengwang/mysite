---
title: "从最小权限建立安全边界"
description: "沿着镜像、进程、集群身份、网络与凭据逐层缩小权限，理解每项保护能挡住什么以及挡不住什么。"
collection: "云原生"
order: 11
slug: "4-k8s/k8s-namespace"
---


读书笔记服务增加图片缩略图功能，需要解析用户上传的文件。假设图片处理库存在漏洞，攻击者让处理进程执行了原本不该执行的指令。接下来会发生什么，取决于我们此前给这个进程多少权力。

它能读取数据库管理员密码吗？能调用Kubernetes API创建新Pod吗？能访问其他业务的数据库吗？安全设计要逐个回答这些问题，并尽量限制一次失守的影响范围。

最小权限的起点很具体：先列出工作负载完成任务必须做的事，再给对应权限。读书笔记API、图片处理进程和摘要worker即使属于同一产品，也未必需要相同能力。

## 先知道镜像从哪里来

第三章讲过digest给镜像内容一个确定身份。安全上还要追问：这份内容由谁发布、经过什么构建和检查，是否仍有人维护？固定digest有助于防止引用悄悄漂移，但也会固定住旧漏洞，需要明确的更新流程。

图片处理镜像应尽量只包含运行必需的依赖。减少无关工具可以缩小攻击面和维护面，但镜像很小并不能证明安全，漏洞可能就在核心解析库里。选择可信来源、记录依赖、持续检查并更新，才让“可信”有可复查的依据。

构建凭据尤其容易被误放。为了下载私有依赖，把令牌写进Dockerfile的 `ARG`、`ENV`，或先复制进镜像再在后续层删除，都可能留下可提取的内容。删除后可见文件，不等于历史层已经消失。

BuildKit的secret mount可以在某条构建指令执行期间临时提供凭据。[1] 但构建脚本若把它打印到日志、复制到输出目录，仍然会泄漏。构建时应使用受限的短期身份，避免把生产数据库密码交给整个构建流程。

## 限制进程能做的事情

图片处理进程通常不需要root身份、不需要修改自己的程序文件，也不需要管理宿主机。可以从下面的Linux容器配置片段开始讨论；它不是可以直接部署的完整清单：

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

这段配置放在相应容器的 `securityContext` 下。非root身份限制通常的用户权限；禁止权限提升避免进程通过某些执行路径获得更多权限；移除capabilities继续收窄Linux能力；seccomp限制系统调用；只读根文件系统减少对镜像文件的修改。[2]

这里要结合程序的实际需要来看。UID和GID 10001必须能够读取程序和必要配置。若缩略图程序要写临时文件，可以给指定目录挂载大小受控的可写临时卷。只读根文件系统并不自动把所有挂载卷也设为只读。

配置收紧后启动失败，应查清是哪一条文件或系统调用需求受限。直接改回root、打开privileged或挂载宿主机目录，会把刚建立的边界重新放开。非root也无法消除共享内核、危险挂载和应用漏洞的风险；需要更强租户隔离时，还要评估节点、沙箱或集群层面的隔离方式。

## 给工作负载独立的集群身份

ServiceAccount是工作负载访问Kubernetes API时使用的身份之一。RBAC继续决定这个身份能对哪些资源执行哪些动作。[3] 它们不等于读书笔记用户的登录系统，也不自动授予数据库或对象存储权限。

普通API如果只连接数据库，可能根本不需要调用Kubernetes API。可以为它使用独立ServiceAccount，并按实际需要设置 `automountServiceAccountToken: false`，减少无用令牌暴露。若工作负载身份集成依赖令牌，应检查所需投影和受众，而不是机械关闭所有身份路径。

确实需要读取某个ConfigMap时，可以把权限限定到相应命名空间、资源和必要动词。不要为了省事给API和摘要worker共用 `cluster-admin`。否则图片解析漏洞就可能进一步变成集群控制权问题。

RBAC权限是允许规则的累加。新建一个只读Role，不会抵消另一个RoleBinding已经授予的写权限。[4] 审查时要看全部有效绑定，而非只看刚编辑的文件。还要关注间接权限：允许创建Pod的人，可能通过挂载读取同命名空间的Secret，即使没有直接 `get secrets` 权限。[3]

namespace便于组织对象、划分部分授权和配额。比如两个团队可以分别拥有名为api的Deployment，而不会因为同名冲突。但它本身不提供完整的网络或计算隔离。把生产与测试放进两个namespace，还不足以保证它们互相访问不到。

## 让网络只留下必要通路

NetworkPolicy描述哪些Pod之间、哪些方向和端口的连接被允许。它需要支持该能力的网络实现执行，API接受了对象并不证明流量已经受控。[5]

在上游NetworkPolicy模型中，没有被相应方向策略选中的Pod，默认不受该方向隔离。入站和出站独立判断。常见做法是先为目标命名空间建立入站、出站默认拒绝，再按工作负载逐项放行实际依赖。

读书笔记API可能需要接受入口流量、查询DNS、连接数据库和对象存储；摘要worker需要访问队列、数据库及外部摘要服务。图片处理进程未必需要访问Kubernetes API。依赖清单越清楚，策略越容易审核。

放行API到数据库时，要同时满足源Pod的出站策略和目标Pod的入站策略。多条策略的允许集合会叠加，没有“最后一条deny覆盖前面allow”的规则。因此，加了默认拒绝后，如果旧的allow-all仍适用，允许的流量不会自动消失。[5]

最常见的误伤是忘记DNS：数据库名字解析失败，看起来像数据库宕机。测试应覆盖必要连接成功、无关连接失败，并使用实际业务协议。标准策略不自动加密连接，也不能直接表达“只允许访问这个HTTP路径”；域名规则、NAT和现有连接行为还要看具体实现。

<!-- figure:cn11-networkpolicy-gates -->

[![API连接数据库需要源端出站和数据库入站同时允许，任一侧未允许连接即被阻断；图中另示必要DNS流量](/collections-assets/cloudnative/cn11-networkpolicy-gates.png)](/collections-assets/cloudnative/cn11-networkpolicy-gates.png)

一侧放行不能代替另一侧授权；默认拒绝之后，还要显式留下DNS和业务依赖

<!-- /figure -->

## Secret需要完整的生命周期

Kubernetes Secret适合承载敏感配置，但其中base64只是编码，可以还原。上游默认也不会把Secret在etcd中的内容自动加密，需要配置静态加密；托管集群可能提供不同默认值，应检查实际设置。[6]

静态加密保护的是特定存储环节。获得合法API读取权限的人、能够挂载Secret的工作负载，以及已经读到明文的应用进程，仍可能接触内容。还要考虑etcd备份、日志、转储和密钥本身的保管，不能只检查一个开关。

API数据库账号只授予必要表和操作权限；摘要worker只取得完成摘要任务需要的凭据；对象存储权限也应限定到必要范围。这样某个进程泄漏凭据时，影响较有机会被限制住。真实密钥不应明文或仅经base64处理后提交到Git。

轮换要按应用实际消费方式设计。先准备新凭据，分发并验证应用开始使用，再撤销旧凭据；新旧并存窗口是否可行，要看数据库或密钥服务能力。若发现泄漏，需要把尽快撤销与业务中断风险一起评估。

第六章已经区分环境变量和卷的更新：修改Secret不会自动改进程环境变量；普通挂载卷可以随后更新，但程序仍要重读；使用subPath又有不同限制。[7] 数据库连接池还可能保留旧连接，所以轮换验收应包含用新凭据建立新连接，不能只看到旧请求继续成功就宣布完成。

<!-- figure:cn11-credential-rotation -->

[![凭据轮换依次准备新值、分发、使用新值建立连接验证、撤销旧值，并在撤销后复查业务；环境变量、普通卷和subPath更新方式不同](/collections-assets/cloudnative/cn11-credential-rotation.png)](/collections-assets/cloudnative/cn11-credential-rotation.png)

轮换跨越凭据服务、配置分发、应用重读和连接池，必须确认新凭据真的建立过连接

<!-- /figure -->

## 把供应链证据接到发布决策上

SBOM记录镜像中包含的组件，帮助新漏洞出现时定位哪些制品可能受影响。构建来源证明记录制品怎样构建。签名验证则需要核对被签内容以及预期签名者身份。[8][9]

这些证据各有用途：组件清单帮助查找，构建记录帮助追溯，签名帮助验证身份与完整性。都不能单独保证程序没有漏洞。一个被信任的构建流程，也可能忠实打包存在漏洞的依赖。

因此应在发布入口做实际检查：是否来自允许的仓库和构建身份、digest是否与已验证制品一致、已知高风险问题是否处理。漏洞扫描发现的是已知线索，还要考虑漏洞是否可触达、修复可用性和补偿措施。例外应有负责人、理由与复查期限，避免临时放行变成永久缺口。

## 明确每一层由谁负责

云厂商管理控制面，不代表替应用检查越权读取笔记的漏洞。平台维护者需要确认身份授权、节点与运行时更新、网络策略和审计能力；应用维护者需要处理输入校验、用户授权、依赖升级和凭据使用。数据库与对象存储的权限也各有独立边界。

这些责任可以由同一个人承担，但不能因此省略。对读书笔记服务，安全验收可以从几条可证明的事实开始：图片进程以预期身份运行；访问非必需服务被拒绝；API不能读取无关Secret；泄漏的旧凭据可以撤销；一个有问题的镜像能追溯到构建与部署位置。

最小权限会增加配置和维护成本，也可能在依赖变化时暴露缺失规则。把这些失败作为明确需求逐项修正，比长期保留全开权限更容易理解系统的真实边界。

## 动手想一想

### 题目 1

创建了只读Role，某个ServiceAccount却仍然能够修改Deployment，应该查什么？

### 提示

RBAC是否存在覆盖其他授权的deny规则？

### 答案

检查该身份全部RoleBinding和ClusterRoleBinding，以及绑定角色的权限。允许规则累加，新角色不会撤销旧授权；需要找到多余授权的真正来源并有针对性地收窄。

### 题目 2

默认拒绝出站之后，API连数据库时报域名解析失败，怎样恢复必要访问？

### 提示

数据库连接之前，还有哪项网络依赖？

### 答案

核实实际DNS路径，放行必要解析流量，再核对数据库目标和端口，以及双方策略。测试允许和拒绝场景，不把allow-all当作最终修复。

### 题目 3

Secret更新后页面还能正常打开，是否足以证明数据库密码轮换完成？

### 提示

应用是否重读了值，连接池是否仍复用旧连接？

### 答案

不足以证明。应确认新值已到达应用、程序已采用，并能使用新凭据建立连接；按计划撤销旧凭据后再检查业务。过程不要把真实密码打印到日志。

## 参考资料

1. [Docker：Build secrets](https://docs.docker.com/build/building/secrets/)
2. [Kubernetes：Configure a Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
3. [Kubernetes：RBAC Good Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
4. [Kubernetes：Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
5. [Kubernetes：Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
6. [Kubernetes：Good practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
7. [Kubernetes：Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
8. [Docker：Build attestations](https://docs.docker.com/build/metadata/attestations/)
9. [Sigstore：Verifying Signatures](https://docs.sigstore.dev/cosign/verifying/verify/)
