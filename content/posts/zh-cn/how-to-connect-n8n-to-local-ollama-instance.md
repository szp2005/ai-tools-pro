---
image: "/og/how-to-connect-n8n-to-local-ollama-instance.webp"
title: "n8n 与本地 Ollama 实例集成：完整设置指南"
description: "通过这份循序渐进的指南，学习如何将 n8n 连接到本地 Ollama 实例。安全私密地自动化您的 AI 工作流，无需支付云 API 费用。"
pubDate: "2026-05-05"
author: "Alex Chen"
tags: ["n8n", "Ollama", "workflow automation", "local AI", "LLMs"]
slug: "how-to-connect-n8n-to-local-ollama-instance"
type: "informational"
---

_As an Amazon Associate we earn from qualifying purchases. This post may contain affiliate links._

_作为亚马逊合作伙伴，我们从符合条件的购买中赚取收益。本文可能包含联盟链接。_

# 如何将 n8n 连接到本地 Ollama 实例：完整设置指南

> **快速解答：** 要将 n8n 连接到本地 Ollama 实例，请确保两个应用程序运行在同一个网络上。在启动 Ollama 之前，通过设置环境变量 `OLLAMA_HOST=0.0.0.0` 来公开您的 Ollama 主机。然后，在 n8n 中，使用 HTTP Request 节点或社区版 Ollama 节点，将基础 URL 设置为 `http://<your-machine-ip>:11434`，即可在自动化工作流中直接发送提示词并接收 AI 生成的响应。

过去，将强大的大语言模型（LLMs）集成到日常工作流中意味着需要支付定期的订阅费用，并将敏感数据发送给第三方云提供商。然而，开源权重模型和用户友好的执行环境的兴起，已经彻底改变了这一模式。

通过将 n8n（一个灵活的、自托管的工作流自动化工具）与 Ollama（一个允许您在自有硬件上本地运行 LLMs 的应用程序）相结合，您可以构建完全私密、免费运行且响应极其迅速的复杂 AI 管道。

无论您是要自动化客户支持工单分类、从 RSS 订阅源生成内容草稿，还是总结内部文档，将这两个工具连接起来都能为本地 AI 自动化创建一个强大的引擎。本指南将逐步指导您如何让 n8n 与本地 Ollama 实例实现无缝通信。

## 了解架构

在深入配置之前，了解 n8n 和 Ollama 的交互方式会很有帮助。n8n 作为一个编排器，根据触发器按定义的顺序执行步骤。Ollama 作为一个后台服务（REST API 服务器）运行，它将模型加载到计算机的内存（RAM 或 VRAM）中，并处理文本生成请求。

当您连接两者时，n8n 充当客户端。它向 Ollama 的 API 端点发送一个包含提示词的 HTTP POST 请求。Ollama 通过选定的模型（如 Llama 3、Mistral 或 Phi-3）处理提示词，并将生成的文本返回给 n8n，n8n 随后将该数据传递给工作流中的下一个节点。

### 为什么要本地运行模型？

这种设置的主要优势在于数据隐私和成本控制。由于模型运行在您自己的硬件上，任何信息都不会离开您的网络。这对于处理敏感客户数据、专有代码或机密内部通信的企业来说至关重要。此外，除了初始的硬件投资外，本地推理的每个 token 的 API 成本为零，让您可以无限扩展自动化操作，而无需担心预算。

## 第 1 步：配置 Ollama 的网络访问

默认情况下，Ollama 将其 API 服务器严格绑定到 `localhost` (`127.0.0.1`)。这是一种防止未经授权访问的安全措施。如果您通过 Docker 或在本地网络的另一台机器上运行 n8n，n8n 将无法使用 `localhost` 访问 Ollama，因为 Docker 容器内的 `localhost` 指的是容器本身，而不是您的宿主机。

您必须将 Ollama 配置为接受来自其他 IP 地址的连接。

### 设置主机环境变量

要将 Ollama 暴露给您的本地网络，您需要在启动 Ollama 服务之前设置 `OLLAMA_HOST` 环境变量。

**在 Linux 上：**
编辑您的 systemd 服务文件（通常位于 `/etc/systemd/system/ollama.service`）。在 `[Service]` 部分下添加以下行：
`Environment="OLLAMA_HOST=0.0.0.0"`
保存文件，重新加载守护进程（`sudo systemctl daemon-reload`），然后重启服务（`sudo systemctl restart ollama`）。

**在 macOS 上：**
如果您通过终端运行 Ollama，可以使用以下命令启动它：
`OLLAMA_HOST=0.0.0.0 ollama serve`
如果您使用 macOS 应用程序，可以使用 `launchctl` 全局设置该变量：
`launchctl setenv OLLAMA_HOST "0.0.0.0"`
然后重启 Ollama 应用程序。

**在 Windows 上：**
打开“开始”菜单，搜索“环境变量”，然后点击“编辑系统环境变量”。点击“环境变量”按钮。在“系统变量”下，点击“新建”。将变量名设置为 `OLLAMA_HOST`，将变量值设置为 `0.0.0.0`。点击确定，并重启 Ollama 应用程序。

### 验证连接

在转到 n8n 之前，验证 Ollama 是否可通过您的本地网络访问。找到您宿主机的本地 IP 地址（例如，`192.168.1.50`）。在同一网络上的另一台设备上打开浏览器，并导航到 `http://192.168.1.50:11434`。您应该会看到消息：“Ollama is running”。

## 第 2 步：准备您的 n8n 环境

如果您通过 Docker 运行 n8n，您需要确保它可以将流量路由到您的宿主机。 

### 使用 Docker 内部路由

如果 n8n 运行在与 Ollama *同一台机器*的 Docker 容器中，您不需要使用特定的本地 IP 地址（这可能会改变）。相反，您可以使用 Docker 内置的主机解析。

在 n8n 中配置 URL 时，使用：
`http://host.docker.internal:11434`

如果您在 Linux 上使用 Docker Compose，可能需要在您的 `docker-compose.yml` 文件中的 n8n 服务下明确定义此映射：
`extra_hosts:`
`  - "host.docker.internal:host-gateway"`

## 第 3 步：将 n8n 连接到 Ollama

将 n8n 连接到 Ollama 主要有两种方法：使用原生的 HTTP Request 节点，或安装专门为 Ollama 设计的社区版节点。

### 方法 1：使用 HTTP Request 节点

这种方法无需额外安装，并在 API 负载上提供了最大的灵活性。

1.  打开您的 n8n 画布并添加一个 **HTTP Request** 节点。
2.  将 **Method** 设置为 `POST`。
3.  将 **URL** 设置为 `http://<your-machine-ip>:11434/api/generate`（或 `http://host.docker.internal:11434/api/generate`）。
4.  将 **Authentication** 设置为 `None`（Ollama 默认不需要身份验证）。
5.  在 **Body Parameters** 中，选择 `JSON`。
6.  构建您的 JSON 负载。一个基本的生成请求需要模型名称、提示词和一个用于禁用流式的标志（因为 n8n 处理离散数据块比连续流更好）。

示例 JSON：
`{`
`  "model": "llama3",`
`  "prompt": "Summarize this text: {{ $json.textToSummarize }}",`
`  "stream": false`
`}`

执行该节点。您应该会收到一个包含 `response` 字段的 JSON 响应，其中包含生成的文本。

### 方法 2：使用 LangChain 集成

现代版本的 n8n 包含强大的 Advanced AI (LangChain) 节点。如果您想构建具有记忆功能的多步骤对话代理（agents），或者希望使用模型调用特定工具，这是推荐的方法。

1.  在您的画布中添加一个 **Basic LLM Chain** 或 **Agent** 节点。
2.  在该节点的 'Model' 输入连接中，添加一个 **Ollama Chat Model** 节点。
3.  配置 Ollama Chat Model 节点。将 **Base URL** 设置为您的 Ollama 端点（例如，`http://192.168.1.50:11434`）。
4.  输入您通过 Ollama 提取的**Model**的准确名称（例如，`mistral`，`llama3:8b`）。
5.  调整 **Temperature** 设置。较低的值（0.1 - 0.3）会使输出更具确定性和事实性，而较高的值（0.7 - 0.9）则鼓励创造力。

## 实用设置建议与故障排除

让本地 AI 管道顺利运行需要管理硬件资源并[有效地处理超时。

### 管理节点超时

本地 LLM 推理可能需要时间，尤其是在消费级硬件上或处理大型提示词时。默认的 n8n HTTP Request 节点超时可能会在 Ollama 完成生成响应之前触发。

如果您在 n8n 中遇到 "Timeout" 错误，请打开您的 HTTP Request 节点（或 Advanced AI 节点）的设置。找到 "Timeout" 设置并大幅增加它——通常根据您硬件的能力和任务的复杂性，从默认的 10,000ms（10 秒）增加到 60,000ms（1 分钟），甚至是 300,000ms（5 分钟）。

### 硬件注意事项

n8n 工作流的速度将完全受限于您的 Ollama 推理[速度。
*   **VRAM 为王：** 为获得最佳性能，请确保您的模型能完全装入 GPU 的 VRAM 中。将层卸载到系统 RAM 会大幅降低生成速度。
*   **模型大小：** 对于标准的 8GB VRAM GPU，坚持使用量化为 4 位（Ollama 默认执行此操作）的 7B 或 8B 参数模型。 
*   **并发：** Ollama 默认会对请求进行排队。如果您的 n8n 工作流同时触发多个实例（例如，处理一批 50 封电子邮件），Ollama 将逐一处理它们。除非您已经显式配置了多 GPU 设置以进行并发执行，否则不要对 Ollama 的 HTTP 请求进行并行化，因为这将导致内存耗尽和崩溃。

## 结论

将 n8n 连接到本地 Ollama 实例，为任何自动化爱好者或注重隐私的企业解锁了一项巨大的能力。通过公开 Ollama 主机，正确地通过 Docker 或本地 IP 路由网络流量，并利用 n8n 的 HTTP 或 Advanced AI 节点，您创建了一个私密、无成本的智能层。从文本摘要或数据提取等简单任务开始，随着您对硬件限制和本地模型所需的提示词工程越来越熟悉，逐步扩展到复杂的多代理工作流。

## 常见问题解答

### 为什么尝试访问 Ollama 时 n8n 显示连接被拒绝？
这通常意味着 Ollama 仍然只绑定到 localhost，或者您的防火墙阻止了 11434 端口。请确保您在运行 Ollama 的机器上设置了 `OLLAMA_HOST=0.0.0.0` 环境变量并重启了服务。

### 我可以将 n8n Advanced AI 节点与 Ollama 一起使用吗？
可以。n8n 在 Advanced AI 类别下包含了原生的 Ollama Chat Model 和 Ollama Embeddings 节点。这些允许您构建复杂的类似 LangChain 风格的代理，为模型提供记忆，并直接在 n8n 界面中执行工具调用。

### 我该如何处理超出模型上下文窗口的大型文档？
本地模型通常具有 4k 到 8k 个 tokens 的上下文限制。在 n8n 中，您应该使用 Advanced AI 的文本拆分节点来对大型文档进行分块，通过 Ollama 生成嵌入，将它们存储在本地向量存储（如 Qdrant 或 Postgres）中，并在向模型发送最终提示词之前，查询向量存储以仅检索相关的上下文。

### n8n 是否需要与 Ollama 在同一台机器上？
不需要，它们可以在不同的机器上。只要两台设备在同一个本地网络上（或通过安全的 VPN/Tailscale 连接），且运行 Ollama 的机器允许在 11434 端口上接收传入连接，n8n 就可以使用主机的本地 IP 地址与之通信。

---

## 相关阅读

- [使用 n8n 和 Claude 自动化内容：完整指南](/zh-cn/posts/how-to-automate-content-with-n8n-and-claude/)

---

## Related Reading

- [n8n vs Zapier for Advanced Workflow Automation: Which Is Better in 2026?](/posts/n8n-vs-zapier-for-advanced-workflow-automation/)

- [How to Build an n8n Integration for Automated CRM Data Entry: 5-Step Guide](/posts/n8n-integration-for-automated-crm-data-entry/)

- [n8n Automation for Automated Invoice Processing 2026: Setup Guide](/posts/n8n-automation-for-automated-invoice-processing-2026/)

- [2026 年 n8n 自动化发票处理：设置指南](/posts/n8n-automation-for-automated-invoice-processing-2026/)

- [Multi Agent Systems for Complex Business Tasks: Complete Guide](/posts/multi-agent-systems-for-complex-business-tasks/)

- [Automate Content with n8n and Claude: Complete Guide](/posts/how-to-automate-content-with-n8n-and-claude/)