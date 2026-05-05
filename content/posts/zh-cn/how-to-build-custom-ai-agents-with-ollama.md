---
image: "/og/how-to-build-custom-ai-agents-with-ollama.webp"
title: "Ollama自定义AI Agent：五步构建指南"
description: "了解如何在本地使用Ollama构建自定义AI Agent。本完整指南涵盖了针对安全自主工作流的设置、工具集成和框架。"
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["ai agents", "ollama", "local ai", "llm development"]
slug: "how-to-build-custom-ai-agents-with-ollama"
type: "informational"
---

_作为亚马逊联盟成员，我们通过符合条件的购买获得收益。本文可能包含联盟链接。_

# 如何使用Ollama构建自定义AI Agent：五步指南

> **快速解答：** 要使用Ollama构建自定义AI Agent，请安装Ollama运行时并下载支持工具调用的本地模型（如 Llama 3 8B 或 Hermes）。通过将LLM包装器指向 `http://localhost:11434`，将此本地实例连接到 LangChain 或 CrewAI 等编排框架。最后，将自定义Python函数定义为工具并分配给你的Agent，从而允许本地LLM自主执行操作并解决多步骤问题。

向本地语言模型的转变已经彻底改变了开发者处理自主系统的方式。在Agentic工作流中严格依赖云API通常会带来高延迟、不可预测的成本以及重大的[数据隐私](/zh-cn/posts/building-a-local-knowledge-base-with-llama-3/)风险。通过将推理引擎移至本地，开发者可以尝试多Agent编排和复杂的工具使用，而无需通过网络发送敏感数据或监控API仪表板。

Ollama作为这种本地化方法的运行时基础。它将模型权重、配置和数据打包到一个可运行的容器中，并公开了一个标准的 REST API。这使其成为现代AI框架中云提供商的直接替代品。在Ollama之上构建Agent需要了解如何为本地模型格式化提示（prompt）、如何管理上下文窗口，以及如何从参数明显少于云端同类产品的模型中可靠地提取结构化的工具调用。

本指南详细介绍了使用Ollama完全在本地硬件上配置、构建和部署自主AI Agent的架构要求和技术步骤。

## 了解本地AI Agent的架构

AI Agent并不是一个独立的软件，而是一种应用于大型语言模型的设计模式。标准的LLM交互是无状态和响应式的：你提供提示词，模型生成文本响应。Agentic工作流通过允许LLM决定执行流程来引入自主性。

功能齐全的本地AI Agent需要四个集成组件：

1.  **推理引擎（Ollama + LLM）：** 负责理解目标、决定采取哪些操作以及合成最终答案的核心模型。对于本地Agent，该模型由Ollama托管。
2.  **编排框架：** 像 LangChain、LlamaIndex 或 CrewAI 这样的库，用于处理认知循环（通常称为 ReAct：推理与行动）。框架解析LLM的输出，将请求的操作路由到相应的本地函数，并将结果反馈回LLM。
3.  **工具（函数）：** Agent可以触发的可执行代码块。这些可以从简单的计算器和网络抓取工具，到内部数据库查询引擎和文件系统修改器。
4.  **记忆：** 一种用于持久化对话状态和当前循环中已执行操作历史记录的机制，确保Agent不会重复失败的操作或偏离其总体目标。

## Ollama的先决条件和初始设置

在编写这个Agent逻辑之前，本地环境必须能够以可接受的推理速度运行生成式模型。Agentic工作流需要数十次连续的模型调用；缓慢的推理将导致系统无法使用。

### 硬件要求

模型的大小决定了你的硬件要求。模型参数与VRAM（显存）消耗直接相关。

*   **7B到8B参数模型：** 至少需要8GB的统一内存（Apple Silicon）或配备8GB VRAM的Nvidia GPU。这些模型在现代笔记本电脑上运行自如。
*   **11B到14B参数模型：** 需要16GB的VRAM或统一内存。
*   **30B+参数模型：** 需要32GB到64GB的RAM/VRAM，通常需要高端桌面硬件或Mac Studio配置。

对于大多数本地Agent任务，高度优化的8B模型在推理能力和快速生成速度之间提供了最佳平衡。

### 安装Ollama并下载模型

直接从其官方发布渠道或通过包管理器（如macOS上的Homebrew）安装Ollama运行时。一旦服务运行，它默认绑定到 `localhost:11434`。

你必须刻意选择一个针对指令遵循和JSON生成进行了优化的模型，因为Agent严重依赖结构化输出来格式化其工具请求。

```bash
# Pull a general-purpose model
ollama pull llama3:8b

# Pull a model specifically fine-tuned for tool calling
ollama pull adrienbrault/nous-hermes2pro:latest
```

Hermes 2 Pro 模型和基于 Mistral 的 Instruct 变体对本地Agent特别有效，因为它们在函数调用模式上进行了稳健的训练。

## 选择合适的编排框架

虽然你可以用原生Python编写自定义的 ReAct 循环，但使用成熟的框架可以减少样板代码并处理边缘情况，例如当LLM输出格式错误的JSON时的解析错误。

### LangChain

LangChain提供了用于构建Agent的最底层原语。它提供广泛的集成，并允许对提示词模板和特定解析逻辑进行精细控制。它非常适合需要严格执行路径或自定义记忆实现的单Agent系统。LangChain的 `ChatOllama` 模块原生支持将工具绑定到本地模型。

### CrewAI

CrewAI运行在一个更高的抽象层面，专注于多Agent编排。与构建单一的庞大Agent不同，CrewAI允许你定义一个由专业Agent组成的“团队”——例如，一个研究员Agent和一个作家Agent——它们可以相互委托任务。CrewAI与LangChain的LLM包装器无缝集成，这意味着你可以轻松地将CrewAI Agent指向Ollama实例。

### AutoGen

微软的AutoGen是另一个多Agent框架，它严重依赖Agent之间的对话模式来解决任务。虽然功能强大，但与CrewAI的任务驱动方法相比，在较小的本地模型上可靠运行通常需要更多的提示词工程(/zh-cn/posts/midjourney-parameter-guide-for-consistent-character-design/)。

## 第1步：将你的框架连接到Ollama

第一个实现步骤是在你的编排代码和Ollama API之间建立连接。框架需要知道LLM托管在哪里以及利用哪些特定的模型权重。

以LangChain为基础，连接需要导入特定的Ollama包装器。你必须确保 `temperature` 设置得很低（例如 0.0 或 0.1）。Agent需要确定性、合乎逻辑的输出来可靠地选择工具；高创造力设置将导致模型虚构工具名称或参数。

```python
from langchain_community.chat_models import ChatOllama

# Initialize the local LLM
llm = ChatOllama(
    model="llama3:8b",
    temperature=0.0,
    base_url="http://localhost:11434",
    format="json" # Optional: enforces JSON output if the framework expects it
)
```

这个 `llm` 对象现在将充当推理引擎。当框架调用此对象时，它会向本地Ollama服务发送 HTTP POST 请求。

## 第2步：为你的Agent配备工具

没有工具的Agent只是一个标准的聊天机器人。工具是LLM文本生成与你的本地系统或外部API之间的接口。

在为本地模型构建工具时，[文档](/zh-cn/posts/self-healing-knowledge-base-using-ai/)至关重要。像GPT-4这样的云模型通常仅从工具的名称就能推断出其作用。本地模型需要对工具的用途及其参数预期的确切数据类型进行明确、详尽的描述。框架会将这些描述注入到系统提示词中。

### 定义自定义工具

你可以通过应用由你的框架提供的装饰器，将任何标准的Python函数转换为工具。函数的文档字符串会被解析并发送给LLM。

```python
from langchain.tools import tool

 @ai-tools-pro/content/posts/zh-cn/best-local-llm-tools-for-developers-2026.md
def read_local_file(file_path: str) -> str:
    """
    Reads the content of a local file.
    Use this tool when you need to extract information from a specific document.
    Provide the absolute file path as the argument.
    """
    try:
        with open(file_path, 'r') as file:
            return file.read()
    except Exception as e:
        return f"Error reading file: {e}"

 @ai-tools-pro/content/posts/zh-cn/best-local-llm-tools-for-developers-2026.md
def calculate_system_metrics(metric_type: str) -> str:
    """
    Retrieves current system metrics.
    Valid inputs for metric_type are 'cpu' or 'memory'.
    Do not use any other string.
    """
    # Implementation logic here
    return "CPU Usage is at 45%"
```

在为8B或7B模型定义工具时，将所需的参数保持在最低限度。需要复杂嵌套JSON参数的函数通常会导致较小的模型在生成阶段失败。单参数工具是最可靠的。

## 第3步：管理Agent记忆与状态

当Agent执行其 ReAct 循环时，上下文窗口会填满其思考的历史记录、它调用的工具以及这些工具返回的原始输出。

本地模型有严格的上下文限制，通常在 4,096 到 8,192 个Token之间。如果一个工具返回大段文本——例如抓取完整的HTML网页或读取大型CSV文件——Agent将很快耗尽其上下文窗口。发生这种情况时，Ollama要么会截断提示词（导致Agent忘记其初始目标），要么会抛出错误。

要有效地管理状态：

1.  **限制工具输出：** 确保你的自定义工具总结或截断其返回值。与其使用一个返回整个文档的工具，不如构建一个在文档中搜索特定关键字并仅返回相关段落的工具。
2.  **使用窗口记忆：** 实现类似 `ConversationBufferWindowMemory` 的记忆结构，它仅保留最近的 *N* 次交互，丢弃较早的工具调用，以为当前任务保留Token。

## 第4步：测试和故障排除自主循环

一旦将LLM、工具和记忆绑定到Agent执行器中，你就可以调用系统。测试本地Agent需要密切监控终端输出，因为较小的模型会表现出需要调整提示词的特定故障模式。

通过Ollama运行Agent时最常见的问题是**解析错误**。当LLM决定使用一个工具，但格式化请求不正确时（例如，在JSON有效载荷中忘记了闭合括号，或者在工具调用旁边写入了对话文本），就会发生这种情况。

框架通常会捕获此错误，注入一条类似“无法解析工具调用，请输出有效的JSON”的消息，并将其发送回LLM。如果模型能力不足，它将陷入生成无效调用和接收错误消息的无限循环中。

为了缓解这种情况：
*   切换到为工具调用进行微调的模型（如 Hermes）。
*   简化你的工具定义。
*   编辑框架的默认系统提示词，以包含关于工具调用确切外观的清晰的少样本（few-shot）示例。

## 研究Agent的实用设置

为了可视化这个完整的管道，请考虑自主研究Agent的设置。该Agent接收一个主题，搜索网络，读取热门结果并合成摘要。

你将定义三个组件：
1.  **搜索工具：** 一个访问 DuckDuckGo 或 Google API 的函数，基于查询返回URL。
2.  **抓取工具：** 一个使用 BeautifulSoup 从提供的URL提取段落文本的函数，故意将输出截断为2000个字符以保护上下文窗口。
3.  **Agent：** 使用 LangChain 配置，通过Ollama使用 `llama3:8b`，使用系统提示词初始化：“你是一名研究助手。你必须首先使用搜索工具查找来源，然后使用抓取工具阅读它。不要用你自己的知识回答。”

当使用提示词“研究Rust编程语言的最新稳定版本”调用时，本地执行流程无缝进行：LLM生成搜索查询，框架执行Python搜索函数，LLM读取URL，调用抓取函数，最后处理文本以提供摘要——所有操作都在本地芯片上安全运行。

## 结论

使用Ollama构建自定义AI Agent民主化了对自主工作流的使用。通过利用高效的8B参数模型，清晰地定义基于Python的工具，并利用像 LangChain 或 CrewAI 这样的框架，开发者可以创建与本地环境和外部API交互的稳健系统。虽然管理上下文窗口和处理解析错误需要付出努力，但由此产生的架构提供了无与伦比的隐私、零API成本以及对Agentic执行循环的完全控制。

## 常见问题

### 构建Agent的最佳Ollama模型是什么？
专门为指令遵循和函数调用进行微调的模型表现最佳。截至2026年，强烈推荐 Llama 3 8B Instruct 模型以及 Nous Hermes 2 Pro 等变体，因为它们在速度和可靠的JSON生成之间取得了平衡。

### 我可以完全离线运行自定义AI Agent吗？
是的。一旦你通过Ollama拉取了模型权重并安装了Python依赖项，核心推理循环就不需要互联网连接。唯一的网络调用将是你的Agent提供的自定义工具明确进行的调用（例如，网络抓取工具）。

### 本地AI Agent需要多少RAM？
对于标准的7B到8B参数模型，8GB的统一内存或VRAM是绝对最低要求，但推荐使用16GB以便为你的操作系统和编排框架留出余量。对于更大的13B+模型，需要32GB的RAM以在复杂的Agent任务期间保持快速的推理速度。

### 为什么我的Agent会卡在无限循环中？
无限循环通常发生在本地LLM未能正确格式化其工具请求（解析错误）并且框架反复要求其纠正格式时。要解决此问题，请切换到能力更强的模型，将temperature设置降低到 0，或简化你的自定义工具所需的参数。

---

## 相关阅读

- [CrewAI vs AutoGen：哪个更适合构建自主Agent？](/zh-cn/posts/crewai-vs-autogen-for-building-autonomous-agents/)

- [2026年用于客户支持自动化的最佳AI Agent](/zh-cn/posts/ai-agent-for-customer-support-automation/)
- [2026年用于自动化LinkedIn互动的7个最佳AI Agent](/zh-cn/posts/ai-agents-for-automated-linkedin-engagement-2026/)