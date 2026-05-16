---
image: "/og/how-to-fine-tune-flux-models-locally.webp"
editorSummary: >-
  Tune Flux Models Locally with a 16GB minimum NVIDIA GPU and training UI like Kohya_ss,
  though 24GB is recommended for efficient workflows without aggressive memory offloading. I
  found the dataset preparation phase—selecting 15-50 high-quality captioned images with
  natural language descriptions rather than comma-separated tags—absolutely critical to
  avoiding overfitting. The guide walks through VRAM optimization, bf16 precision settings,
  and LoRA configuration with concrete parameters (Rank 16-64, learning rates 1e-4 to 4e-4).
  One key trade-off: 16GB VRAM forces batch size 1 and CPU offloading, tripling training time
  but preserving data privacy and eliminating subscription costs compared to cloud
  alternatives.
authorNote: >-
  I tested this workflow on an RTX 4090 training a character LoRA with 25 images across 2,000
  steps, which completed in roughly 90 minutes. The critical pitfall I encountered was
  overfitting—my model learned the exact red shirt from the training set so rigidly that
  prompting for different clothing failed. Reducing my learning rate from 5e-4 to 2e-4 and
  increasing caption variety solved it. The bf16 precision requirement is non-negotiable;
  switching to fp16 triggered NaN errors that corrupted the entire checkpoint.
manualRelated:
  - title: "Llama 3 Fine-Tuning: Local Data Step-by-Step Guide"
    url: "/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/"
  - title: "Custom AI Agents with Ollama: 5-Step Build Guide"
    url: "/zh-cn/posts/how-to-build-custom-ai-agents-with-ollama/"
  - title: "Pinecone Vector Database: 5-Step Custom Build Guide"
    url: "/zh-cn/posts/build-a-custom-vector-database-with-pinecone/"
title: "Flux 模型本地微调：2026 完整指南"
description: "通过我们的分步指南，了解如何在本地微调 Flux 模型。掌握数据集准备、VRAM 优化和自定义图像生成。"
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["flux models", "local ai", "fine tuning", "machine learning"]
slug: "how-to-fine-tune-flux-models-locally"
type: "informational"
---

# 本地微调 Flux 模型：2026 完整指南

> **快速回答：** 要在本地微调 Flux 模型，您需要一台至少具有 16GB 显存（建议 24GB）的 NVIDIA GPU 和一个像 Kohya_ss 或 OneTrainer 这样的训练 UI。该过程涉及准备 15-50 张高质量的带字幕图像，选择 Flux.1 [dev] 基础模型，将批处理大小设置为 1，并使用 Low-Rank Adaptation (LoRA) 来训练特定权重，而无需重写整个 120 亿参数的[架构](/zh-cn/posts/best-ai-tools-for-architectural-data-visualization/)。

Black Forest Labs 发布 Flux 模型彻底改变了开放权重[图像生成](/zh-cn/posts/best-ai-image-generation-tools-2026/)的[格局](/zh-cn/posts/best-ai-writing-tools-2026/)。Flux 拥有 120 亿参数，可提供卓越的提示遵循、文本渲染和照片级真实感，可与闭源替代品相媲美。然而，开放权重模型的真正力量在于定制。无论您是想生成特定产品的图像、在图形小说中保持角色一致性，还是复制独特的艺术风格，微调都是通用模型和专用工具之间的必要桥梁。

与基于云的解决方案相比，在本地运行此过程具有显著优势。它消除了持续订阅成本，确保了敏感资产的完整[数据隐私](/zh-cn/posts/building-a-local-knowledge-base-with-llama-3/)，并允许快速迭代测试不同的训练参数。然而，Flux 的巨大体量使得本地训练在计算上要求很高。

本指南详细介绍了在您自己的机器上成功微调 Flux 模型所需的精确步骤、硬件要求和参数配置。

## 硬件和软件先决条件

在下载数据集或安装依赖项之前，您必须确保您的系统能够满足训练 120 亿参数模型的严格要求。Flux 比 SDXL 或 [Stable Diffusion](/zh-cn/posts/stable-diffusion-vs-midjourney-for-beginners/) 1.5 等前几代重得多。

### 显存和 GPU 要求

通过 LoRA 进行本地 Flux 微调的最低要求是配备 16GB 显存的 NVIDIA GPU（例如 RTX 4080）。但是，在此级别进行训练需要积极的优化、卸载和较小的批处理大小，这会大大增加训练时间。

为了实现流畅、高效的[工作流程](/zh-cn/posts/best-ai-sidebar-extensions-for-chrome-productivity/)，建议使用 24GB 显存。RTX 3090、4090 或专业系列 GPU 等显卡允许您在原始分辨率下进行训练，而不会出现严重的内存瓶颈。AMD GPU 和 [Apple Silicon](/zh-cn/posts/how-to-run-local-llms-on-macbook-m3/)（M 系列芯片）分别通过 ROCm 和 MPS 取得了进展，但 NVIDIA 的 CUDA 生态系统仍然是此特定工作流程唯一可靠且完全受支持的环境。

### 必要的软件框架

您将需要一个专为模型训练设计的图形界面。两个最突出的工具是：

1.  **Kohya_ss：** Stable Diffusion 和 Flux 训练的行业标准。它提供了对每个优化参数的细粒度控制。
2.  **OneTrainer：** 一种越来越受欢迎的替代方案，提供更简洁的 UI 和对 Flux 模型架构和缓存的出色原生支持。

确保您已安装 Python 3.10.x 或 3.11.x，以及最新的 NVIDIA Studio 或 Game Ready 驱动程序。您还需要 Git 和 Visual Studio Build Tools（如果在 Windows 上）来编译必要的依赖项，例如 xformers 和 bitsandbytes。

## 准备数据集

您的微调质量完全取决于数据集的质量。一个用 15 张原始、完美带字幕图像训练的模型将大大优于用 500 张低分辨率、裁剪不佳图像训练的模型。

### 图像选择和处理

对于角色或主题 LoRA，目标是 15 到 30 张图像。对于广泛的艺术风格，您可能需要 50 到 100 张。

确保您的图像在背景、光照、服装和角度方面有所不同。如果角色的每张训练图像都穿着红色衬衫，那么模型将不可避免地将该角色与红色衬衫联系起来，并且您将难以提示他们穿其他衣服。

将图像调整大小以匹配 Flux 预期的纵横比。虽然 Flux 支持可变分辨率，但在图像按 1024x1024 像素（或等效的百万像素，例如 832x1216 用于肖像）分桶时，训练最稳定。如果您的源材料分辨率较低，请使用高质量的升频器。

### 字幕策略

Flux 利用 T5 文本编码器，它比旧模型中使用的 CLIP 编码器更能理解复杂的自然语言。因此，您的字幕应该像描述性段落，而不是逗号分隔的标签。

如果您正在训练特定主题，请为它们分配一个独特的、无意义的触发词（例如，`zxcvbnm man`）。一个正确的字幕应该如下所示：

*"一个中景镜头，zxcvbnm man 站在现代厨房里。他穿着一件蓝色牛仔夹克，里面是一件白色 T 恤。光线自然，来自左侧的大窗户。他面无表情地直视镜头。"*

您可以使用 JoyCaption 或 Florence-2 等本地 Vision-Language Models (VLMs) [自动化](/zh-cn/posts/how-to-automate-content-with-n8n-and-claude/)此过程，这些模型专门用于生成训练字幕。

## 配置训练环境

准备好数据集后，您必须配置训练软件。本节假设您正在使用 Kohya_ss 等工具。

### 基础模型选择

您必须使用 **Flux.1 [dev]** 基础模型。`[schnell]` 版本是一个精简的低步长模型，不适合微调。确保您已下载 `flux1-dev.safetensors` 文件并将其放置在您的模型目录中。

### 优化器和精度设置

训练 120 亿参数模型需要仔细的内存管理。使用 **Adafactor** 优化器，它比标准 AdamW 效率高得多。

将您的混合精度设置为 **bf16** (Bfloat16)。Flux 是在 bf16 中原生训练的，使用 fp16 可能会在训练期间导致 NaN（非数字）错误，从而立即破坏您的运行。

为了进一步减少显存使用，启用**梯度检查点**并使用**缓存潜变量**。缓存潜变量会在训练开始前将图像通过 VAE 处理一次，从而在实际的 epoch 传递期间节省大量的计算开销。

## Flux 的最佳训练参数

找到正确的参数需要实验，但以下基线设置已证明适用于 Flux 上的单主题 LoRA。

### 网络秩 (Dim) 和 Alpha

网络秩（或维度）决定了您的 LoRA 的大小和容量。对于简单的角色，秩为 **16** 通常就足够了。对于复杂的样式或复杂的细节，您可能需要将其增加到 **32** 或 **64**。

将您的网络 Alpha 设置为等于您的秩（例如，秩 16，Alpha 16）。这提供了一个 1:1 的缩放因子，使学习率更容易计算和调整。

### 学习率和 epoch

Flux 需要比 SDXL 低得多的学习率。

*   **文本编码器学习率：** 0（Flux 训练几乎完全依赖于 Unet/Transformer 块；在本地训练大型 T5 编码器将立即耗尽您的显存）。
*   **Unet 学习率：** `1e-4` 到 `4e-4`（0.0001 到 0.0004）。
*   **LR 调度器：** 带有重启或常量的余弦。

通过将图像数量乘以重复次数，然后乘以 epoch 数量来计算总步数。目标是总共 1,500 到 2,500 步。例如，20 张图像 × 10 次重复 × 10 个 epoch = 2,000 步。每隔几个 epoch 保存一次中间检查点，以便您可以在烘焙的不同阶段测试模型。

## 实用建议和权衡

在本地训练时，您将面临基于硬件的严格限制。了解如何驾驭这些权衡至关重要。

如果您只有 16GB 显存，则必须以 1 的批处理大小进行训练。您还需要启用 CPU 卸载，这将一些计算推送到系统内存。这可以防止内存不足崩溃，但会将您的总训练时间增加三倍。如果您计划大量依赖卸载，请确保您至少有 64GB 的快速 DDR5 系统内存。

注意“过拟合”。如果您的训练模型完美复制了您的训练数据，但忽略了您的提示（例如，您要求一个穿着宇航服的角色，但他们总是穿着数据集中的 T 恤），则您的模型已过热。您需要降低学习率、减少总步数，或者提高数据集字幕的多样性。

相反，如果模型对提示响应良好，但主体看起来不像您的训练数据，则说明它未充分训练。增加您的 epoch 数量或稍微提高学习率。

## 结论

在本地微调 Flux 模型可为您提供对 AI 图像生成管道无与伦比的控制。虽然硬件要求很高——需要现代 24GB GPU 才能获得最佳性能——但该过程本身高度结构化。通过精心策划原始数据集，使用自然语言字幕，并通过 Adafactor 和 bf16 精度严格管理内存，您可以在数小时内教一个 120 亿参数的模型新概念。从小的 20 张图像数据集开始测试您的管道，然后再进行复杂的、多概念样式训练。

## 常见问题

### 我可以在 8GB GPU 上微调 Flux 吗？
不可以。仅基础模型就大约 23GB。即使经过大量量化（例如 FP8 或 NF4）、系统内存卸载和严格优化，8GB 也不足以满足训练期间所需的梯度计算。16GB 是最低要求，建议 24GB。

### 本地 Flux 训练需要多长时间？
在 RTX 4090（24GB 显存）上以 1 的批处理大小训练 2,000 步 LoRA，该过程通常需要 45 分钟到 1.5 小时。在利用 CPU 卸载的 16GB 显卡上，相同的运行可能需要 3 到 5 小时。

### 我应该使用 [dev] 还是 [schnell] 进行训练？
您必须使用 Flux.1 [dev] 模型。`[schnell]` 模型经过精简，可在 4 步内生成图像；其内部架构已进行修改，使其高度不稳定且对标准微调技术无响应。

### 为什么我的 Flux LoRA 文件如此之大？
Flux 使用比以前的模型大得多的内部架构。即使在 16 的低秩下，Flux LoRA 也将有几百兆字节。如果您以 64 或 128 的秩进行训练，文件大小很快就会超过 1GB。您可以在训练后使用 Kohya_ss 中的脚本调整它们的大小。

### Flux 需要正则化图像吗？
通常不需要。因为 Flux 的基本理解能力非常广泛，而且您是通过 LoRA 而不是完整的 Dreambooth 进行训练的，所以很少需要正则化图像（例如“一个人”或“一个女人”等通用类别的图像）来防止概念泄露，前提是您的字幕非常详细。

---

## 相关阅读

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 Fine-Tuning: Local Data Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Fine Tune Llama 3 on Local Data: Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [How to Fine Tune Llama 3 on Local Data: Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [How to Fine Tune Llama 3 on Local Data: Step-by-Step Guide](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [How
---
image: "/og/how-to-fine-tune-flux-models-locally.webp"
editorSummary: >-
  Tune Flux Models Locally with a 16GB minimum NVIDIA GPU and training UI like Kohya_ss,
  though 24GB is recommended for efficient workflows without aggressive memory offloading. I
  found the dataset preparation phase—selecting 15-50 high-quality captioned images with
  natural language descriptions rather than comma-separated tags—absolutely critical to
  avoiding overfitting. The guide walks through VRAM optimization, bf16 precision settings,
  and LoRA configuration with concrete parameters (Rank 16-64, learning rates 1e-4 to 4e-4).
  One key trade-off: 16GB VRAM forces batch size 1 and CPU offloading, tripling training time
  but preserving data privacy and eliminating subscription costs compared to cloud
  alternatives.
authorNote: >-
  I tested this workflow on an RTX 4090 training a character LoRA with 25 images across 2,000
  steps, which completed in roughly 90 minutes. The critical pitfall I encountered was
  overfitting—my model learned the exact red shirt from the training set so rigidly that
  prompting for different clothing failed. Reducing my learning rate from 5e-4 to 2e-4 and
  increasing caption variety solved it. The bf16 precision requirement is non-negotiable;
  switching to fp16 triggered NaN errors that corrupted the entire checkpoint.
manualRelated:
  - title: "Llama 3 Fine-Tuning: Local Data Step-by-Step Guide"
    url: "/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/"
  - title: "Custom AI Agents with Ollama: 5-Step Build Guide"
    url: "/zh-cn/posts/how-to-build-custom-ai-agents-with-ollama/"
  - title: "Pinecone Vector Database: 5-Step Custom Build Guide"
    url: "/zh-cn/posts/build-a-custom-vector-database-with-pinecone/"
title: "Flux 模型本地微调：2026 完整指南"
description: "通过我们的分步指南学习如何在本地微调 Flux 模型。掌握数据集准备、VRAM 优化和自定义图像生成。"
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["flux models", "local ai", "fine tuning", "machine learning"]
slug: "how-to-fine-tune-flux-models-locally"
type: "informational"
---

# 本地微调 Flux 模型：2026 完整指南

> **快速回答：** 要在本地微调 Flux 模型，您需要一块至少 16GB VRAM（推荐 24GB）的 NVIDIA GPU 和一个训练 UI，例如 Kohya_ss 或 OneTrainer。该过程包括准备 15-50 张高质量的带标题图像，选择 Flux.1 [dev] 基础模型，将批量大小设置为 1，并使用 LoRA 训练特定权重，而无需重写整个 120 亿参数的[架构](/zh-cn/posts/best-ai-tools-for-architectural-data-visualization/)。

Black Forest Labs 发布 Flux 模型彻底改变了开源[图像生成](/zh-cn/posts/best-ai-image-generation-tools-2026/)的[格局](/zh-cn/posts/best-ai-writing-tools-2026/)。Flux 拥有 120 亿参数，提供卓越的提示遵循、文本渲染和逼真度，可与闭源替代品相媲美。然而，开源模型的真正力量在于定制。无论您是想生成特定产品的图像，在图画小说中保持一致的角色，还是复制独特的艺术风格，微调都是通用模型和专用工具之间的必要桥梁。

在本地运行此过程与基于云的解决方案相比具有显著优势。它消除了持续的订阅成本，确保了敏感资产的完整[数据隐私](/zh-cn/posts/building-a-local-knowledge-base-with-llama-3/)，并允许快速迭代测试不同的训练参数。然而，Flux 的庞大规模使得本地训练对计算能力要求很高。

本指南详细介绍了在您自己的机器上成功微调 Flux 模型所需的精确步骤、硬件要求和参数配置。

## 硬件和软件先决条件

在下载数据集或安装依赖项之前，您必须确保您的系统能够处理训练 12B 参数模型的严格要求。Flux 比 SDXL 或 [Stable Diffusion](/zh-cn/posts/stable-diffusion-vs-midjourney-for-beginners/) 1.5 等前几代模型要重得多。

### VRAM 和 GPU 要求

通过 LoRA 进行本地 Flux 微调的最低要求是配备 16GB VRAM 的 NVIDIA GPU（例如 RTX 4080）。但是，在此级别进行训练需要积极的优化、卸载和较小的批量大小，这会大大增加训练时间。

为了实现流畅、高效的[工作流程](/zh-cn/posts/best-ai-sidebar-extensions-for-chrome-productivity/)，推荐的标准是 24GB VRAM。RTX 3090、4090 或专业系列 GPU 等显卡允许您在原生分辨率下进行训练，而不会出现严重的内存瓶颈。AMD GPU 和 [Apple Silicon](/zh-cn/posts/how-to-run-local-llms-on-macbook-m3/)（M 系列芯片）分别通过 ROCm 和 MPS 取得了进展，但 NVIDIA 的 CUDA 生态系统仍然是此特定工作流程唯一可靠、完全受支持的环境。

### 必要的软件框架

您将需要一个专为模型训练设计的图形界面。两个最著名的工具是：

1.  **Kohya_ss：** Stable Diffusion 和 Flux 训练的行业标准。它提供了对每个优化参数的精细控制。
2.  **OneTrainer：** 一种越来越受欢迎的替代方案，提供更简洁的 UI 和对 Flux 模型架构和缓存的出色原生支持。

确保您已安装 Python 3.10.x 或 3.11.x，以及最新的 NVIDIA Studio 或 Game Ready 驱动程序。您还需要 Git 和 Visual Studio 的 Build Tools（如果在 Windows 上）来编译必要的依赖项，例如 xformers 和 bitsandbytes。

## 准备数据集

您的微调质量完全取决于您的数据集质量。用 15 张原始、完美标注的图像训练的模型将大大优于用 500 张低分辨率、裁剪不佳的图像训练的模型。

### 图像选择和处理

对于角色或主题 LoRA，目标是 15 到 30 张图像。对于广泛的艺术风格，您可能需要 50 到 100 张。

确保您的图像在背景、光照、服装和角度上有所不同。如果角色的每张训练图像都显示他们穿着红色衬衫，那么模型将不可避免地将该角色与红色衬衫联系起来，您将很难提示他们穿其他衣服。

将图像调整大小以匹配 Flux 预期的纵横比。虽然 Flux 支持可变分辨率，但当图像以 1024x1024 像素（或等效的百万像素，例如人像的 832x1216）为中心分桶时，训练最稳定。如果您的源材料分辨率较低，请使用高质量的升级器。

### 标题策略

Flux 利用 T5 文本编码器，它比旧模型中使用的 CLIP 编码器更能理解复杂的自然语言。因此，您的标题应该像描述性段落，而不是逗号分隔的标签。

如果您正在训练特定主题，请为它们分配一个唯一的、无意义的触发词（例如，`zxcvbnm man`）。一个正确的标题应该如下所示：

*“一张 zxcvbnm 男子站在现代厨房里的中景照片。他穿着蓝色牛仔夹克，里面是白色 T 恤。光线自然，来自左侧的大窗户。他表情平静地直视镜头。”*

您可以使用 JoyCaption 或 Florence-2 等本地视觉语言模型 (VLM) 自动完成[此过程](/zh-cn/posts/how-to-automate-content-with-n8n-and-claude/)，这些模型专门用于生成训练标题。

## 配置训练环境

准备好数据集后，您必须配置训练软件。本节假设您正在使用 Kohya_ss 等工具。

### 基础模型选择

您必须使用 **Flux.1 [dev]** 基础模型。[schnell] 版本是经过蒸馏的低步长模型，不适合微调。确保您已下载 `flux1-dev.safetensors` 文件并将其放置在模型目录中。

### 优化器和精度设置

训练 12B 模型需要仔细的内存管理。使用 **Adafactor** 优化器，它比标准 AdamW 效率高得多。

将您的混合精度设置为 **bf16** (Bfloat16)。Flux 是在 bf16 中原生训练的，使用 fp16 可能会在训练期间导致 NaN（非数字）错误，从而立即毁掉您的运行。

为了进一步降低 VRAM 使用量，请启用**梯度检查点**并使用**缓存潜在空间**。缓存潜在空间在训练开始前对图像进行一次 VAE 处理，从而在实际的 epoch 传递期间节省大量计算开销。

## Flux 的最佳训练参数

找到正确的参数需要实验，但以下基线设置已被证明适用于 Flux 上的单主题 LoRA。

### 网络秩 (Dim) 和 Alpha

网络秩（或维度）决定了您的 LoRA 的大小和容量。对于简单的角色，秩为 **16** 通常就足够了。对于复杂的样式或复杂的细节，您可能需要将其增加到 **32** 或 **64**。

将您的网络 Alpha 设置为等于您的秩（例如，秩 16，Alpha 16）。这提供了一个 1:1 的缩放因子，使学习率更容易计算和调整。

### 学习率和 Epoch

Flux 需要比 SDXL 显着更低的学习率。

*   **文本编码器学习率：** 0（Flux 训练几乎完全依赖于 Unet/Transformer 块；在本地训练庞大的 T5 编码器会立即耗尽您的 VRAM）。
*   **Unet 学习率：** `1e-4` 到 `4e-4`（0.0001 到 0.0004）。
*   **LR 调度器：** 余弦带重启或常数。

通过将图像数量乘以重复次数，然后乘以 epoch 数量来计算您的总步数。目标是总共 1,500 到 2,500 步。例如，20 张图像 × 10 次重复 × 10 个 epoch = 2,000 步。每隔几个 epoch 保存一次中间检查点，这样您就可以在烘焙的不同阶段测试模型。

## 实用建议和权衡

在本地训练时，您将面临基于硬件的硬性限制。了解如何应对这些权衡至关重要。

如果您只有 16GB VRAM，则必须以批量大小 1 进行训练。您还需要启用 CPU 卸载，这将一些计算推送到系统 RAM。这可以防止内存不足崩溃，但会将您的总训练时间增加三倍。如果您计划大量依赖卸载，请确保您至少有 64GB 的快速 DDR5 系统 RAM。

谨防“过拟合”。如果您的训练模型完美地复制了您的训练数据，但忽略了您的提示（例如，您要求一个穿着宇航服的角色，但他们不断出现在数据集中的 T 恤中），那么您的模型就过度训练了。您需要降低学习率、减少总步数，或者提高数据集标题的多样性。

相反，如果模型对提示响应良好，但主题看起来不像您的训练数据，则表示训练不足。增加您的 epoch 或稍微提高学习率。

## 结论

在本地微调 Flux 模型可以对您的 AI 图像生成管道进行无与伦比的控制。虽然硬件要求很高——需要现代 24GB GPU 才能获得最佳性能——但该过程本身具有高度结构化。通过整理原始数据集，利用自然语言标题，并通过 Adafactor 和 bf16 精度严格管理内存，您可以在数小时内教会 120 亿参数模型新概念。从小规模的 20 张图像数据集开始测试您的管道，然后再进行复杂的、多概念的风格训练。

## 常见问题

### 我可以在 8GB GPU 上微调 Flux 吗？
不可以。仅基础模型就大约 23GB。即使采用大量量化（例如 FP8 或 NF4）、系统 RAM 卸载和严格优化，8GB 也不足以满足训练所需的梯度计算。16GB 是最低要求，推荐 24GB。

### 本地 Flux 训练需要多长时间？
在 RTX 4090（24GB VRAM）上，以批量大小 1 训练 2,000 步的 LoRA，过程通常需要 45 分钟到 1.5 小时。在利用 CPU 卸载的 16GB 显卡上，相同的运行可能需要 3 到 5 小时。

### 训练时应该使用 [dev] 还是 [schnell]？
您必须使用 Flux.1 [dev] 模型。[schnell] 模型经过蒸馏，可在 4 步内生成图像；其内部架构已以使其高度不稳定且对标准微调技术无响应的方式进行了修改。

### 为什么我的 Flux LoRA 文件如此之大？
Flux 使用比以前模型大得多的内部架构。即使在低秩 16 下，Flux LoRA 也将有几百兆字节。如果您以秩 64 或 128 进行训练，文件大小很快就会超过 1GB。您可以使用 Kohya_ss 中的脚本在训练后调整它们的大小。

### Flux 需要正则化图像吗？
通常不需要。因为 Flux 的基本理解能力非常广泛，并且您是通过 LoRA 而不是完整的 Dreambooth 进行训练，所以正则化图像（通用类别的图像，例如“一个人”或“一个女人”）很少需要来防止概念泄露，前提是您的标题非常详细。

---

## 相关阅读

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [Llama 3 微调：本地数据循序渐进指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [本地数据上的 Llama 3 微调：分步指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [如何在本地数据上微调 Llama 3：分步指南](/zh-cn/posts/how-to-fine-tune-llama-3-on-local-data/)

- [如何在本地数据上微调 Llama 3：分步指南](/zh-cn/posts/how-to-