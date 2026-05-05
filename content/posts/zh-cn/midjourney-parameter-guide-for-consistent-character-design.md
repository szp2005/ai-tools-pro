---
image: "/og/midjourney-parameter-guide-for-consistent-character-design.webp"
title: "Midjourney 角色设计一致性参数指南：完整工作流"
description: "通过我们的完整参数指南，掌握 Midjourney 中的角色一致性。学习精确的 seeds、weights 和提示词，以保持面部和服装的完全一致。"
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["midjourney", "ai art", "character design", "prompt engineering"]
slug: "midjourney-parameter-guide-for-consistent-character-design"
type: "informational"
---

_作为亚马逊联盟成员，我们从符合条件的购买中赚取收益。本文可能包含联盟链接。_

# Midjourney 角色设计一致性参数指南：完整[工作流](/zh-cn/posts/how-to-automate-slack-notifications-with-n8n/)

> **快速解答：** 在 Midjourney 中实现一致的角色设计，需要将 `--cref`（Character Reference，角色参考）参数与源图像 URL 结合使用，将 `--cw`（Character Weight，角色权重）在 0 到 100 之间进行调整，并利用静态的 `--seed` 值。为了获得最大的可靠性，请在每次生成时将这些参数与对主体物理特征完全相同且高度具体的文本描述结合使用。

[生成式 AI](/zh-cn/posts/stable-diffusion-vs-midjourney-for-beginners/) 艺术中长期存在的最大障碍一直是叙事的连续性。生成一个令人惊叹的角色概念很容易；但将这个完全相同的角色放置在不同的环境、服装和情绪状态中，而不让他们变成一个完全不同的人，这在过去是出了名的困难。Midjourney 的[架构](/zh-cn/posts/best-ai-tools-for-architectural-data-visualization/)本质上更倾向于多样性而非精确性，它会在每次输入提示词时重新计算噪点模式。

然而，最近的更新引入了专门设计用于锁定角色特征的专用参数。通过摆脱纯描述性的提示词并利用技术参数，你可以强制模型遵循特定的视觉基准。

本指南详细分解了在数百次生成中保持相同的面部几何形态、发型和服装所需的精确参数、数学权重和结构化工作流。

## 掌握角色参考参数 (--cref)

Midjourney 中现代角色一致性的基础依赖于角色参考参数，通过输入 `--cref` 后跟基础图像的 URL 来调用。与旧的图像提示（image prompt）功能（混合图像的风格和构图）不同，`--cref` 经过专门训练，用于映射和复制人类（以及类人）的特征。

### --cref 如何分析你的主体

当 你 附加 将 `--cref <URL>` 添加到你的提示词中时，Midjourney 会将主体从背景中分离出来，并映射其核心识别特征：下颌线结构、眼距、鼻子形状、肤色、头发纹理和服装图案。它会为该特定角色创建一个内部视觉标记，然后尝试将其投影到新提示词的请求中。

为了有效地使用它，你的基础图像 URL 必须指向 Midjourney 内生成的图像或上传的照片。Discord 图像链接可以完美运行。

**基本语法：**
`/imagine prompt: A cinematic shot of a young woman walking through a cyberpunk city, neon lights --cref https://link-to-your-image.png`

### 寻找完美的参考图像

有效性 关于 `--cref` 的效果与你参考图像的清晰度成正比。风格化严重、光线昏暗或模糊的参考图像将导致不可预测的生成结果。

为了创建理想的锚点图像（anchor image）：
1. 生成你的角色的正面或略微四分之三侧面的肖像。
2. 确保光线平滑且中性（使用如 "studio lighting, plain white background" 等提示词）。
3. 避免遮挡面部的道具，例如厚框眼镜、口罩或浓重的阴影。
4. 放大（Upscale）最佳结果。这将成为你永久的 `--cref` 锚点。

## 使用角色权重微调 (--cw)

`--cref` 参数不是单独起作用的；它受角色权重参数（`--cw`）的调节。该参数精确决定了 Midjourney 应该将*多少*参考图像的特征转移到新生成的内容中。该值范围从 0 到 100。

### 使用 --cw 100 实现精确复制

在 默认情况下，如果你不指定权重，Midjourney 默认使用 `--cw 100`。在此设置下，模型会尝试完全复制该角色。这包括他们精确的面部、发型以及他们在参考图像中穿着的特定服装。

当你想要改变角色的环境或姿势，但保持他们的服装完全相同时，这个设置非常理想。

**示例：**
`/imagine prompt: [character description] sitting in a cafe --cref <URL> --cw 100`

### 使用 --cw 0 实现仅面部一致性

如果你需要你的角色换衣服或采用 一种 新的 发型，你必须使用 `--cw 0` 将权重降至 0。

在权重为零的情况下，Midjourney 会丢弃参考图像中的服装和头发数据，仅映射面部几何形态和肤色。这允许你在保留核心人物特征的同时，通过提示词生成完全不同的服装和风格。

**示例：**
`/imagine prompt: [character description] wearing a heavy winter coat and a beanie, standing in the snow --cref <URL> --cw 0`

1 到 99 之间的权重提供了一个滑动的特征影响比例，但在实际操作中，大多数工作流都依赖于 100（完全复制）或 0（仅面部）来保持可预测的控制。

## Seeds 在角色设计中的作用 (--seed)

在引入 `--cref` 之前，保持一致性的主要方法是使用 `--seed` 参数。虽然现在它不再是绝对核心，但它仍然是强大角色设计工作流中不可或缺的工具，充当着额外的稳定性保障。

Midjourney 在每次生成时都会从一片视觉噪点开始。这种噪点的模式由一个随机的 seed（种子）数字决定。如果你使用完全相同的提示词和完全相同的 seed 数字，你将获得完全相同的图像。

### 寻找并应用你的 Seed

当你生成你最初的 完美的 角色 概念时，你需要提取其 seed 数字。你可以通过使用信封表情符号（✉️）对 Midjourney 机器人的消息进行反应来实现这一点。机器人将向你发送包含任务详细信息的直接消息（私信），其中包括数字 seed 值（例如，`Seed: 284759392`）。

通过将此数字附加到未来的提示词中（`--seed 284759392`），你就可以强制 Midjourney 从相同的初始噪点模式开始生成。

### Seed 参数的局限性

Seeds 是 非常 脆弱的。即使你在文本提示词中只改变一个词，seed 的影响也会发生剧烈转变。因此，seeds 最好与 `--cref` 结合使用。锁定的噪点模式（seed）和锁定的角色映射（cref）相结合，可最大程度地减少模型发生偏移的倾向。

## 多重提示词与图像权重 (--iw)

有时，仅靠 `--cref` 难以捕捉特定的风格细微差别，特别是在处理动漫、漫画书风格或 3D 渲染等非真实感角色时。在这些情况下，将 `--cref` 与标准图像提示结合使用可提供必要的强化。

你可以将 URL 作为标准图像提示与 `--cref` 参数一起包含进去。执行此操作时，你将利用图像权重（`--iw`）参数来控制参考图像的整体构图和风格对新输出的影响程度。`--iw` 的比例范围是 0.5 到 2.0。

**语法示例：**
`/imagine prompt: https://link-to-image.png A character running through a forest --cref https://link-to-image.png --iw 1.5 --cw 100`

这种双层方法强制模型在进行角色映射和整体风格指导时都参考该图像。

## 实用工作流：实现一致性角色的 5 步流程

要达到专业级别的一致性，请遵循这一严格的顺序工作流。不要跳过步骤或依赖近似值。

### 第 1 步：建立锚点
通过提示词生成一个中性、光线充足的角色肖像。不要包含复杂的背景或戏剧性的灯光。使用文本描述来定义三个核心特征：头发颜色/款式、眼睛颜色以及种族/肤色。放大最佳结果并复制图像链接。通过信封表情符号提取 seed。

### 第 2 步：测试面部映射 (--cw 0)
使用锚点 URL，运行一个测试提示词，将角色放置在完全不同的服装中并带有 `--cw 0` 参数。
*提示词：* `A medium shot of [character name], wearing a spacesuit, inside a spaceship --cref [Anchor URL] --cw 0`
验证尽管衣柜发生了变化，面部特征是否仍然完全相同。

### 第 3 步：构建角色设定表
使用相同的锚点 URL，通过提示词生成一个角色设定表，以锁定多个角度。
*提示词：* `Multiple views of [character name], character design sheet, front view, side profile, back view --cref [Anchor URL] --cw 100`
如果模型稍后在处理侧面视角时遇到困难，该设定表可以作为次要参考图像。

### 第 4 步：锁定文本提示词
永远不要改变你的角色的核心描述。如果你最初的提示词是“一个 30 岁的斯堪的纳维亚男人，留着金发短发和蓝眼睛（A 30-year-old Scandinavian man with short blonde hair and blue eyes）”，你必须在随后的每个提示词中包含这句完全相同的短语，然后加上动作或环境。不要仅仅依赖图像 URL。

### 第 5 步：迭代生成
开始生成你的场景素材。当服装必须与锚点匹配时，使用 `--cw 100`。当换衣服时，使用 `--cw 0`。如果角色的面部开始发生偏移，请应用最初的 `--seed` 值，强制模型回到其基线噪点模式。

## 结论

Midjourney 中一致的角色生成不再是一个 单纯的 碰 运气问题；它是一个技术参数管理的过程。通过经由 `--cref` 使用清晰的参考图像锚定你的工作流，使用 `--cw` 调节保留程度，并使用 `--seed` 稳定基础噪点，你可以覆盖模型倾向于变化的自然趋势。成功需要你的提示词结构具备纪律性——始终将这些参数与对你的主体的严格、不变的文本描述配对，以实现真正的叙事连续性。

## 常见问题解答

### 为什么我的角色侧身时面部会发生变化？
生成模型通常难以从 2D 参考中插值 3D 几何形态。如果你的 `--cref` 图像是一张正面的肖像，Midjourney 就必须猜测其侧面的样子。通过生成包含多个角度的角色设定表并将其用作你的参考 URL 可以解决此问题。

### 我可以在一个提示词中使用多个 --cref URL 吗？
是的，你可以在 `--cref` 参数后将多个 URL 串联在一起，用空格分隔。Midjourney 将尝试混合所有提供图像的面部特征。这对于创建一个一致的混合角色很有用，但对于保持单一、特定的身份则不太有效。

### --cref 适用于风格化插画，还是仅适用于照片？
`--cref` 参数适用于所有风格，从照片级真实感到扁平的 2D 动画。然而，如果你的参考图像高度风格化，你可能需要在文本提示词中添加描述性的风格标签（例如，“anime style”、“watercolor”），以防止模型默认生成真实的解释。

### 为什么 --cw 100 稍微改变了我角色的衣服？
在 `--cw 100` 下，Midjourney 试图复制服装，但这并不是复制粘贴功能。如果你新的文本提示词暗示了不同的环境（例如，“in a blizzard”），模型可能会巧妙地改变服装以适应上下文（增加冰霜或厚度）。为了最大程度地减少这种情况，请保持环境提示词的简单。

### 我是否总是需要使用 --seed 参数？
不，如果你使用的是强有力的 `--cref` 图像，`--seed` 参数不是绝对强制的。然而，使用原始的 seed 可以充当安全网，减少长时间生成过程中光线、背景纹理和轻微面部偏移方面产生不必要的微小变化。

---

## 相关阅读

- [如何使用 Llama 3 构建本地知识库：完整设置指南](/zh-cn/posts/building-a-local-knowledge-base-with-llama-3/)
- [2026 年适合自由开发者的最佳 AI 驱动合同审查工具](/zh-cn/posts/ai-powered-contract-review-for-freelance-developers/)