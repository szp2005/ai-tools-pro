---
image: "/og/how-to-automate-content-with-n8n-and-claude.webp"
title: "使用 n8n 和 Claude 自动化内容创作：完整指南"
author: "Alex Chen"
date: 2026-04-29
slug: how-to-automate-content-with-n8n-and-claude
description: "在这份完整指南中掌握如何使用 n8n 和 Claude 自动化内容创作。下载我们的 JSON 工作流并导入，立即开始生成 AI 驱动的文章。"
keywords: ["n8n workflow automation", "Claude API integration", "AI content generation", "automated blog writing", "n8n tutorial for beginners", "Anthropic Claude node n8n", "content creation pipeline", "no-code AI automation"]
draft: false
type: "informational"
tags: ["automate", "content", "n8n", "claude"]
---

# 如何使用 n8n 和 Claude 自动化内容创作（写给非开发者的分步指南）

---

**太长不看 (TL;DR)**
- 构建一个完全自动化的内容管道：从 Google Sheet 中提取关键词，通过 n8n 将其发送给 Claude，并将草稿直接发布到 WordPress——无需任何编码。
- 获得高质量输出的秘诀在于 n8n 表达式中的提示词工程 (prompt engineering)，而不仅仅是连接节点。
- 在文章末尾下载现成的 JSON 工作流，只需不到两分钟即可导入使用。

---

## 目录

1. [为什么使用 n8n 和 Claude 自动化内容创作？](#why)
2. [前提条件：准备工具和密钥](#prerequisites)
3. [第 1 步：构建基础工作流结构](#step1)
4. [第 2 步：为 Claude 编写完美的提示词](#step2)
5. [第 3 步：生成完整内容](#step3)
6. [第 4 步：自动发布内容](#step4)
7. [进阶技巧：错误处理与成本管理](#advanced)
8. [对比：n8n + Claude vs. 竞品技术栈](#comparison)
9. [常见问题 (FAQ)](#faq)
10. [结语](#conclusion)

---

## 为什么使用 n8n 和 Claude 自动化内容创作？ {#why}

如果你正在为五位客户管理内容，或者试图在自己的网站上每周发布三篇博客文章，你会发现瓶颈总是一样的：把时间耗费在遵循可预测模式的重复性任务上。研究关键词、编写大纲、起草文章、调整格式、发布。每一次都是如此。

n8n 是一个开源的工作流[自动化](/zh-cn/posts/ai-tools-for-email-writing/)平台——可以把它想象成 Zapier，但没有按任务计费的门槛，并且在节点功能和数据流转方面具有极高的灵活性。你可以在云端运行它，也可以在每月 6 美元的 VPS 上自行托管。其节点库开箱即用，支持 400 多种服务，而任何其他不支持的服务都可以通过通用的 HTTP Request 节点来处理。

Claude 是 Anthropic 的大型语言模型系列。Claude 3.5 Sonnet 在生成长篇结构化文本方面尤其表现出色。它能够可靠地遵循详细的系统指令，在处理 Markdown 格式时不会产生多余的幻觉代码块，并能在 200,000 token 的上下文窗口中始终紧扣主题——当你在串联多步内容生成流程时，这一点至关重要。

将它们结合起来，你能获得切实的回报：

- **节省时间：** 一份原本需要 45 分钟研究和撰写的大纲，现在只需约 90 秒的 API 处理时间。
- **规模化：** 在周日晚上对 50 个关键词运行相同的工作流，一觉醒来就能看到 50 篇博客草稿。
- **一致性：** 每份大纲都遵循相同的结构、字数目标和 SEO 要求。不再因写手不同而产生质量波动。

本指南聚焦于一个特定且高价值的使用场景：**根据存储在 Google Sheet 中的关键词列表，自动生成经过 SEO 优化的博客大纲**，然后将草稿发布到 WordPress。一旦你理解了这个数据管道，你就可以根据需要随意替换触发器和目标端。

---

## 前提条件：准备工具和密钥 {#prerequisites}

在开始配置 n8n 之前，请将所有必要的信息准备好。

**n8n 实例**
最快的途径是使用 n8n Cloud，它提供托管实例，无需服务器设置。Starter 计划对于低频使用是免费的。如果出于成本或数据隐私的原因你更倾向于自行托管，可以在 DigitalOcean 上启动一个 Droplet，或在 Hetzner 上租用一台服务器——两者都支持通过 Docker Compose 一键安装 n8n。规模化使用时自行托管成本更低，但前期需要花十分钟进行配置。

**Anthropic Claude API 密钥**
前往 console.anthropic.com，创建一个账户，并在 Settings → API Keys 下生成一个 API 密钥。为你的账户充值至少 5 美元。使用 Claude 3.5 Sonnet 生成一篇 1,500 字的完整博客文章，大约需要花费 0.015 到 0.03 美元，具体取决于输入 token 的长度。

**数据源：Google Sheet**
创建一个表格，至少包含三列：`Keyword`、`Target URL` 和 `Status`。工作流处理完成后会更新 Status 列，以确保同一行不会被触发两次。如果你更喜欢结构化的数据库，Airtable 或 Google Workspace Sheets 都可以，并且 n8n 中都有专门的节点支持。

**目标端：WordPress**
你需要你的 WordPress 网站 URL 以及应用程序密码（Application Password）的凭据（在 WordPress 后台的 Settings → Users → Profile → Application Passwords 中获取）。请将它们记录下来；稍后需要粘贴到 n8n 中。

---

## 第 1 步：构建基础工作流结构 {#step1}

打开 n8n。点击 **New Workflow**。

**触发节点 — [Google Sheets](/zh-cn/posts/automating-google-sheets-with-chrome-extension-ai/)**
添加一个 **Google Sheets** 节点。将操作设置为 **Get Many Rows**。通过 OAuth 连接你的 Google 账户。选择你的电子表格和工作表选项卡。在 Filters 下添加一个过滤器：`Status` is empty（为空）。这可确保工作流只处理未处理过的行。设置定时触发器（添加一个额外的 **Schedule** 节点）使其每天早上 6 点运行，或者在测试期间手动触发。

**Anthropic Claude 节点**
n8n 拥有原生的 **Anthropic** 节点（从 1.30 版本开始提供）。将其添加到 Google Sheets 节点之后。在 Credentials 下，粘贴你的 Claude API 密钥。设置：

- **Model:** `claude-3-5-sonnet-20241022`（截至 2025 年中期性价比最高的模型）
- **Max Tokens:** 生成完整博客草稿设为 `4000`，生成大纲设为 `800`
- **Temperature:** `0.5` — 低于默认值，有助于保持输出的结构化和一致性

你将在第 2 步中填写提示词（prompt）。

---

## 第 2 步：为 Claude 编写完美的提示词 {#step2}

这是许多教程未能深入的地方。连接节点只是最简单的部分。提示词才是决定输出质量的关键。

**在 n8n 中向 Claude 编写提示词的黄金法则**

1. 使用 **System message** 编写固定不变的指令。使用 **Human message** 传递每一行的动态数据。
2. 明确输出格式。如果你清晰地告诉 Claude 你想要什么，它会精确地遵循 Markdown 指令。
3. 同时设定角色和限制：“你是一位经验丰富的 SEO 内容策略师。不要包含笼统的介绍。不要使用被动语态。”

**如何使用 n8n 表达式传递动态数据**

n8n 使用双大括号表达式来提取前置节点的数据。在 Anthropic 节点的 Human message 字段中，你的表达式应该类似于以下格式：

```
Write a detailed SEO blog brief for the following keyword: {{ $json.Keyword }}

Target URL to internally link to: {{ $json["Target URL"] }}

Brief requirements:
- Suggested H1 title (include keyword near the front)
- Meta description (155 characters max, include keyword)
- Outline with 5–7 H2 headings, each with 2-sentence summary of what to cover
- Target word count: 1,600 words
- 3 suggested internal links relevant to the topic
- 2 suggested external authority sources to cite
```

表达式 `{{ $json.Keyword }}` 会精准提取当前正在处理的 Google Sheet 行中的值。如果你的表格中有一行的内容是 `[content marketing](/zh-cn/posts/ai-tools-for-seo-writing/) automation`，该字符串就会被插入到提示词中。系统会自动为每一行生成定制的大纲，无需任何额外工作。

**系统消息 (System Message，请原样粘贴)**

```
You are an expert SEO content strategist with 10 years of experience writing
for SaaS and digital marketing brands. Your briefs are concise, actionable,
and follow on-page SEO best practices. Always respond in clean Markdown.
Never add preamble like "Sure!" or "Great question!". Start directly with the H1 title.
```

最后一条指令可以消除那些让人一眼看出是 AI 生成内容的废话。

---

## 第 3 步：生成完整内容 {#step3}

生成大纲只需一个 Claude 节点即可。若要生成一篇约 1,500 字的完整博客文章，请使用两个串联的 Claude 节点：

- **节点 A：** 生成大纲（速度快、成本低，约 300 token 输出）
- **节点 B：** 接收大纲作为输入，并逐节撰写完整的草稿

在节点 B 中，Human message 将引用节点 A 的输出：

```
Using the following outline, write a complete blog post.
Each H2 section should be 200–250 words. Use short paragraphs (3 sentences max).
Include the primary keyword "{{ $('Google Sheets').item.json.Keyword }}"
naturally in the first 100 words and in at least two H2 headings.

Outline:
{{ $('Anthropic').item.json.content[0].text }}
```

请注意表达式 `$('Anthropic').item.json.content[0].text` ——这就是你如何通过名称引用特定节点的方法。Claude API 会将内容作为一个数组返回；索引 `[0]` 用于获取第一个（通常也是唯一一个）消息块。

**处理 Markdown 输出**
WordPress 节点接受的是 HTML 格式，而不是原始的 Markdown。因此需要在 Claude 和 WordPress 之间添加一个 **Code** 节点，并包含以下三行 JavaScript 代码：

```javascript
const md = require('marked');
items[0].json.html_content = md.parse(items[0].json.content[0].text);
return items;
```

n8n 处于沙盒环境的 Code 节点内置了 `marked` 库。它可以自动将标题、粗体文本和列表等格式转换为标准的 HTML。

---

## 第 4 步：自动发布内容 {#step4}

添加一个 **WordPress** 节点。设置如下：

- **Operation:** Create Post
- **Status:** Draft（始终保持草稿状态——在人工审核之前，切勿自动发布 AI 生成的内容）
- **Title:** `{{ $('Anthropic - Outline').item.json.content[0].text.split('\n')[0].replace('# ','') }}` ——这将截取并移除 Claude 输出第一行中的 H1 标签。
- **Content:** `{{ $json.html_content }}` ——从 Code 节点转换后的 HTML 内容。

在 WordPress 节点之后，添加另一个 **Google Sheets** 节点并将其设置为 **Update Row**。将 `Status` 列的值映射为 `Done`。这可以防止该行在下次运行时再次触发工作流。

非 WordPress 的发布目标端：可以将 WordPress 节点替换为 **Google Docs** 节点（在指定文件夹中创建新文档），或者使用纯粹的 **HTTP Request** 节点调用任何 CMS API——Ghost、Webflow、Contentful 都接受标准的 REST 调用。

---

## 进阶技巧：错误处理与成本管理 {#advanced}

**错误触发节点 (Error Trigger Node)**
每个生产级工作流都需要错误处理机制。创建一个独立的工作流并添加一个 **Error Trigger** 节点。当任何节点失败时，它会通过邮件或 Slack 发送包含完整错误详情的消息。如果没有这一步，运行失败将在无声无息中发生。

**基于内容类型使用 Switch 节点**
如果你的 Google Sheet 需要处理多种内容类型（大纲、社交媒体帖子、邮件主题等），请在触发器后添加一个 **Switch** 节点。将 `Type = Brief` 的行路由到一个 Claude 节点，将 `Type = Social` 的行路由到具有不同提示词和 token 限制的另一个节点。

**监控 API 成本**
在每次成功运行的最后添加一个 **HTTP Request** 节点，调用 Anthropic 的用量 API (`GET /v1/usage`)，并将消耗的 token 数量记录到另一个 Google Sheet 选项卡中。两周后，你就能获得基于内容类型的真实成本数据。Claude 3.5 Sonnet 每百万输入 token 的成本为 3 美元，每百万输出 token 的成本为 15 美元——对于每周 50 篇博客大纲的体量，预期每月的 API 成本不到 10 美元。

---

## 对比：n8n + Claude vs. 竞品技术栈 {#comparison}

| 比较维度 | n8n + Claude | Zapier + OpenAI | Make + OpenAI |
|---|---|---|---|
| **每月成本（50 个工作流）** | 云端约 $24 / 自托管约 $6 | $49 起（按任务计费） | $29（按操作计费） |
| **Claude 模型支持** | 原生节点，完整的模型选择 | 仅可通过 HTTP Request 节点 | 仅可通过 HTTP Request 节点 |
| **自托管选项** | 支持（Docker，完全控制） | 不支持 | 不支持 |
| **工作流复杂度上限** | 高（循环、子工作流、代码节点） | 中 | 高 |
| **学习曲线** | 中 | 低 | 中 |
| **数据隐私** | 极高（自托管方案） | 低 | 低 |

对于需要大量生成内容且注重数据处理的内容营销人员来说，n8n + Claude 是更长远、更可靠的选择。Zapier 上手快，但成本上升极快，且缺乏对 Claude 的原生支持。

---

## 结语 {#conclusion}

本文所述的数据管道——Google Sheet 触发、Claude 生成内容、WordPress 发布草稿——并不是一个原型概念。它是一个生产级工作流，可以无人值守运行，并持续产出可用的初稿。最初的配置投入大约需要两小时，但在此之后，每产出一篇内容只需占用你约 90 秒的等待时间和 0.02 美元的 API 费用。

真正能产生巨大成效的关键决策在于：选择 Claude 处理结构化长文，而不是使用通用的 GPT 包装器；使用 n8n 表达式将动态数据注入到每个提示词中，而不是使用静态提示词；始终发布为 Draft（草稿）状态，以便在内容上线前进行人工审查。

你可以先从大纲生成工作流开始，运行两周，然后进一步扩展。一旦打好基础，这套结构可以扩展至任何内容类型。

**准备好动手构建了吗？** 在此开启你的 n8n Cloud 账户 并 从 Anthropic 控制台获取你的 Claude API 密钥。如果你想自行托管，DigitalOcean 的 n8n Droplet 是从零搭建到实例运行的最快途径。

---

*价格和模型名称截至 2025 年 6 月。Claude 模型版本更新频繁——构建前请查阅 Anthropic 模型文档 了解最新版本。*

## 常见问题 (FAQ)

### 我需要编码经验才能构建这个工作流吗？

不需要。本指南中的每一步都使用了 n8n 的可视化界面和原生节点。第 3 步中的唯一一个 Code 节点可以直接复制粘贴——你完全不需要理解 JavaScript 也能使用它。

### 这个工作流每月的实际成本是多少？

如果你每周使用 Claude 3.5 Sonnet 生成 50 篇博客大纲，预计每月的 API 成本大约在 8 到 12 美元之间（外加你的 n8n 订阅费用）。若在 Hetzner CX11 服务器上自行托管 n8n，服务器费用约为每月 4 美元。

### 我可以使用如 Haiku 等其他 Claude 模型来节省成本吗？

可以。Claude 3 Haiku 的成本要低得多，而且速度极快。对于社交媒体帖子或 Meta 描述等较短的内容输出，它的表现非常出色。但对于 1,500 字的长文草稿，Sonnet 能生成明显更连贯的文章结构。

### 如何防止同一个 Google Sheet 行被触发两次？

该工作流包含一个步骤，在每次成功运行后将 `Done` 写入到 Status 列。触发器节点会过滤 Status 为空的行，因此已经被标记为 Done 的行会被自动忽略。

### 从哪里可以获取文章中提到的可下载的工作流 JSON？

点此下载完整的 n8n 工作流 JSON。通过 n8n 中的 **Settings → Import from File** 导入它。你仍然需要连接自己的凭据（Google、Anthropic、WordPress），但节点结构、表达式和提示词模板都是预先构建好的。

### 使用 n8n 和 Claude 进行内容自动化的主要好处是什么？

将 n8n 和 Claude 结合使用，可以让你创建高度定制化的多步骤工作流，从而自动生成、编辑和发布内容。得益于 Claude 强大的自然语言处理能力和 n8n 灵活的基于节点路由的机制，这种集成方案能在保证输出质量的同时，大幅节省时间。

### 在 n8n 自动化工作流中，Claude 与 ChatGPT 相比表现如何？

与许多 ChatGPT 模型相比，Claude 往往能提供更细腻、更拟人化的文本，在处理包含长上下文的指令时表现更好。将其集成到 n8n 中，生成的内容所需的修改量更少，并且能够更一致地遵循特定的品牌语调指南。

### 搭建 n8n 和 Claude 内容管道需要编码经验吗？

尽管 n8n 提供了对非开发者友好的可视化拖拽界面，但了解 API 和 JSON 的基础知识将大有裨益。不过，现在有大量现成的模板，使得初学者无需编写任何代码即可开始利用 Claude 自动化内容创作。

### 这种自动化配置也能处理 SEO 研究和发布吗？

是的，n8n 可以连接到 SEO 工具来获取关键词数据，将这些信息输入给 Claude 以生成经过优化的内容，然后自动将最终结果发布到诸如 WordPress 等平台。这构建了一条几乎无需人工干预、无缝连接的端到端 SEO 内容管道。

## 相关阅读

- [如何使用 Claude API 进行内容生成：开发者指南](/zh-cn/posts/how-to-use-claude-api-for-content/)
- [终极指南：2026 年最佳 AI 内容创作工具](/zh-cn/posts/best-ai-tools-for-content-creation/)
- [如何利用 AI 进行 SEO 内容规划：2026 年蓝图](/zh-cn/posts/how-to-use-ai-for-seo-content-planning/)
- [如何使用 Gemini 进行内容写作：专家指南](/zh-cn/posts/how-to-use-gemini-for-content-writing/)

---

## Related Reading

- [Self Hosting n8n on Docker for Privacy: Complete Setup Guide](/posts/guide-to-self-hosting-n8n-on-docker-for-privacy/)

- [Self Hosting n8n on Docker for Privacy: Complete Setup Guide](/posts/guide-to-self-hosting-n8n-on-docker-for-privacy/)

- [Best AI Workflow Automation for Shopify Store Owners in 2026](/posts/ai-workflow-automation-for-shopify-store-owners/)

- [Best AI Workflow Automation for Shopify Store Owners in 2026](/posts/ai-workflow-automation-for-shopify-store-owners/)
