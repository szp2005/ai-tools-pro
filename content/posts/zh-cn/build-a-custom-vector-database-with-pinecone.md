---
image: "/og/build-a-custom-vector-database-with-pinecone.webp"
title: "Pinecone 向量数据库：5步构建指南"
description: "了解如何使用 Pinecone 构建自定义向量数据库。本实用指南涵盖了嵌入生成、索引、相似性搜索和 RAG 集成。"
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["pinecone", "vector database", "machine learning", "rag architecture"]
slug: "build-a-custom-vector-database-with-pinecone"
type: "informational"
---

_作为 Amazon 联盟成员，我们从符合条件的购买中赚取收益。本文可能包含联盟链接。_

# 如何使用 Pinecone 构建自定义向量数据库：5步指南

> **快速解答：** 要使用 Pinecone 构建自定义向量数据库，您首先需要使用类似 [OpenAI](/zh-cn/posts/automate-customer-sentiment-analysis-with-openai-api/) 的 `text-embedding-3-small` 模型为您的数据生成嵌入。接下来，创建一个维度与您的模型相匹配的 Pinecone 索引，然后将您的向量数据与元数据一起进行更新插入（upsert）。最后，您可以执行最近邻搜索，为搜索引擎或检索增强生成（RAG）应用程序检索与上下文相关的信息。

现代应用程序所需的不仅仅是精确的关键字匹配。无论您是构建智能语义搜索引擎、推荐系统，还是通过检索增强生成（RAG）为大型语言模型（LLMs）提供长期记忆，您都需要具备按含义而非语法进行搜索的能力。

这种转变是由向量嵌入（vector embeddings）推动的——即文本、图像或音频的数值表示。然而，在传统关系型数据库中存储和搜索数百万个密集的高维向量是非常低效的。您需要专门的基础设施。

Pinecone 已成为领先的完全托管、云原生的向量数据库。它处理了扩展和基础设施的复杂性，使开发者能够专注于构建 AI 应用程序。本指南详细介绍了如何从零开始使用 Pinecone 构建自定义向量数据库，重点关注文本数据，并涵盖从原始数据到可查询索引的全过程。

## 了解向量数据库与 Pinecone

在[编写](/zh-cn/posts/ai-writing-assistant-for-long-form-content/)代码之前，了解您所构建系统的机制非常重要。当您将文本输入到嵌入模型时，它会输出一个浮点数数组。例如，OpenAI 的最新模型会输出 1536 或 3072 维的数组。

这些维度代表了语义概念。含义相似的单词或句子在这个多维向量空间中会彼此靠近。

向量数据库的主要工作是接收新的“查询向量”（query vector），并使用余弦相似度（Cosine Similarity）、欧几里得距离（Euclidean Distance）或点积（Dot Product）等相似性度量指标，快速找到最接近的存储向量。Pinecone 通过近似最近邻（ANN）算法（如 HNSW）来处理这一过程，该算法以牺牲极其微小的准确度为代价，在数十亿条记录中换取了搜索速度的巨大提升。

Pinecone 的托管服务抽象了索引维护、分片管理和内存配置等底层细节，使其成为开发者快速构建生产级 AI 应用程序的理想选择。

## 第一步：设置您的环境和 Pinecone 账户

首先，您需要 API 密钥以及必要的库。

首先，注册一个 Pinecone 账户。免费套餐（Starter 计划）提供了一个 Serverless 索引，这对于开发和原型制作来说已经绰绰有余。登录后，导航到 API Keys 部分并创建一个新密钥。记下您的密钥以及分配给您项目的云区域。

接下来，您需要一个嵌入提供商。在本指南中，OpenAI 是标准选择。请确保您拥有一个有效的 OpenAI API 密钥。

通过安装所需的 Python 包来初始化您的开发环境：

```bash
pip install pinecone-client openai pandas
```

您的脚本将需要这些凭证进行身份验证。使用环境变量来确保它们的安全：

```python
import os
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI

os.environ["PINECONE_API_KEY"] = "your-pinecone-key"
os.environ["OPENAI_API_KEY"] = "your-openai-key"

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
```

## 第二步：生成向量嵌入

没有向量，向量数据库就毫无用处。您必须将原始文本转换为嵌入。这里关键的规则是一致性：您用于嵌入数据库文档的模型，必须与您稍后用于嵌入用户查询的模型完全相同。

假设您有一个包含公司内部文档或产品描述的小型数据集。

```python
documents = [
    {"id": "doc1", "text": "Pinecone is a managed vector database designed for fast similarity search.", "category": "technology"},
    {"id": "doc2", "text": "Astro is a modern web framework for building fast content-driven websites.", "category": "technology"},
    {"id": "doc3", "text": "To make a perfect espresso, use 18 grams of finely ground coffee.", "category": "lifestyle"}
]
```

要对它们进行嵌入操作，请遍历文本并调用 OpenAI 嵌入 API：

```python
def get_embedding(text, model="text-embedding-3-small"):
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding

# Process documents into a format Pinecone accepts
vectors_to_upsert = []
for doc in documents:
    embedding = get_embedding(doc["text"])
    vectors_to_upsert.append({
        "id": doc["id"], 
        "values": embedding, 
        "metadata": {"text": doc["text"], "category": doc["category"]}
    })
```

请注意 `metadata` 有效载荷。默认情况下，向量数据库仅返回匹配向量的 ID。通过将原始文本和类别作为元数据附加，您可以避免在单独的 PostgreSQL 或 MongoDB 数据库中执行二次查找。

## 第三步：初始化并填充您的 Pinecone 索引

准备好向量后，您必须创建一个位置来存储它们。在 Pinecone 中，这就是索引（Index）。

创建索引时，您必须指定向量的精确维度和距离度量。OpenAI 的 `text-embedding-3-small` 会生成 1536 维的向量。对于文本嵌入，建议使用余弦相似度（Cosine similarity）作为度量标准。

```python
index_name = "custom-knowledge-base"

# Check if index exists, if not, create it
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

# Connect to the index
index = pc.Index(index_name)
```

Pinecone 的 Serverless 架构会根据您的使用情况自动扩展，从而消除了手动选择实例大小的需要。

现在，将您的数据加载到索引中。在向量数据库的术语中，这被称为“upsert”（更新/插入）。Pinecone 允许批量 upsert，强烈推荐对大型数据集使用该功能，以避免速率限制并减少网络开销。

```python
# Upsert the vectors
index.upsert(vectors=vectors_to_upsert)
```

对于拥有数百万个向量的生产级应用程序，请将您的 upsert 操作分块，每次请求批量处理 100 到 500 个向量。

## 第四步：查询和检索相似向量

自定义向量数据库的核心价值在于根据上下文检索信息。当用户提出问题时，您将他们的查询转换为嵌入，将该向量发送给 Pinecone，并检索最匹配的结果。

```python
query_text = "What is a good tool for semantic search?"
query_embedding = get_embedding(query_text)

results = index.query(
    vector=query_embedding,
    top_k=2,
    include_metadata=True
)

for match in results["matches"]:
    print(f"Score: {match['score']:.4f}")
    print(f"Text: {match['metadata']['text']}\n")
```

即使查询中没有出现“Pinecone”这个词，数据库也会返回 `doc1`，因为“semantic search”和“vector database designed for fast similarity search”的语义概念在嵌入空间中紧密映射。

### 使用 元数据 (Metadata) 进行过滤

元数据在用于预过滤结果时非常强大。如果您只想要“technology”类别的搜索结果，您可以向查询传递一个过滤器。这可以同时提高速度和相关性。

```python
results = index.query(
    vector=query_embedding,
    top_k=2,
    include_metadata=True,
    filter={
        "category": {"$eq": "technology"}
    }
)
```

## 第五步：与 LLMs 集成（RAG 架构）

构建自定义向量数据库通常不是最终目标；它通常是检索增强生成（RAG）的基础层。

当被问及未包含在其训练数据中的专有数据、近期事件或内部[文档](/zh-cn/posts/self-healing-knowledge-base-using-ai/)时，LLMs 会产生幻觉。通过首先查询 Pinecone，您可以将具体、真实的事实上下文直接注入到 LLM 的提示词中。

1. 用户提问：“我该如何构建一个快速的网站？”
2. 您将查询转换为嵌入，并搜索 Pinecone。
3. Pinecone 返回 `doc2`（Astro 框架）。
4. 您构建一个提示词：`仅使用以下上下文回答用户的问题：[doc2 文本]。问题：我该如何构建一个快速的网站？`
5. LLM 生成准确、有依据的回答。

这种模式完全基于您构建的自定义向量数据库，将通用的 AI 模型转变为高度专业化的领域专家。

## 实用架构建议

当从教程走向生产环境时，数据准备对向量数据库质量的决定性作用远大于数据库本身。

**分块策略：** 您不能将一份 50 页的 PDF 文件作为单个向量进行嵌入，否则语义含义会被稀释。您必须将文档拆分为逻辑上的“块（chunks）”。可以从 500-1000 个 tokens 的块大小开始，并在块之间保留 10-15% 的重叠部分。重叠部分可以防止句子从中间被截断时丢失上下文。

**处理更新：** 文档数据很少是静态的。当主数据库中的文章或产品描述发生更新时，您必须重新嵌入新文本，并使用相同的 ID 将其 upsert 到 Pinecone。这会覆盖旧的向量。可以通过实施 Webhooks 或异步 worker 来保持您的向量数据库与关系型数据库同步。

**选择维度：** 虽然 1536 维是 OpenAI 的标准，但一些开源模型（如通过 HuggingFace 使用的 `all-MiniLM-L6-v2`）会输出 384 维。较小的维度意味着更快的查询和更低的存储成本，但也可能导致语义细微差别的降低。请严格根据您选择的模型来匹配维度大小。

## 结论

使用 Pinecone 构建自定义向量数据库需要弥合原始数据和语义理解之间的差距。通过系统地生成高质量的嵌入、管理您的索引配置并利用元数据过滤，您即可为高级 AI 功能创建一个高度可扩展的后端。无论您是在构建智能语义搜索，还是通过 RAG 管道为 LLM 提供记忆层，Pinecone 的 Serverless 基础设施都能让您以最小的运维开销部署生产级的相似性搜索。

## 常见问题解答

### 传统数据库和向量数据库之间有什么区别？
传统数据库依赖于精确的关键字匹配和关系表（例如，查找精确的字符串“apple”）。向量数据库则存储概念的数值表示，并执行数学相似性搜索，这使得它们能够找到在上下文和含义上相关的结果，即使不存在精确的关键字也是如此。

### 数据存入 Pinecone 后我可以更改嵌入模型吗？
不可以。如果您切换到不同的嵌入模型（例如，从 OpenAI 切换到 Cohere，或者从 1536 维模型切换到 3072 维模型），您必须完全重新嵌入整个数据集并创建一个新的 Pinecone 索引。来自不同模型的向量存在于不同的数学空间中，无法进行比较。

### 使用 Pinecone 需要多少费用？
Pinecone 提供 Starter 层级，提供免费的 Serverless 索引，非常适合评估和小型项目。对于生产环境，Serverless 架构会根据存储的数据量（每月 GB 数）和用于读/写操作的计算量进行收费，并随您的流量动态扩展。

### 我需要将原始文本存储在 Pinecone 中吗？
强烈建议将原始文本块存储在 Pinecone 的 `metadata` 有效载荷中。这允许 Pinecone 在一次查询中返回实际文本以及相似度分数，从而避免了您必须获取返回的向量 ID 并在 PostgreSQL 数据库中执行二次查找才能获取人类可读内容的麻烦。

---

## 相关阅读

- [如何在本地微调 Flux 模型：2026 完整指南](/zh-cn/posts/how-to-fine-tune-flux-models-locally/)
- [2026 年最佳自动化客户支持 AI Agent](/zh-cn/posts/ai-agent-for-customer-support-automation/)

---

## Related Reading

- [Best Local LLM Tools for Developers in 2026: Top 7 Ranked](/posts/best-local-llm-tools-for-developers-2026/)

- [2026年面向开发者的最佳本地LLM工具：排名前7位](/posts/best-local-llm-tools-for-developers-2026/)

- [Midjourney Parameter Guide for Consistent Character Design: Complete Workflow](/posts/midjourney-parameter-guide-for-consistent-character-design/)

- [Best AI Tools for Architectural Data Visualization in 2026](/posts/best-ai-tools-for-architectural-data-visualization/)
