---
title: "Midjourney Parameter Guide for Consistent Character Design: Complete Workflow"
description: "Master character consistency in Midjourney with our complete parameter guide. Learn the exact seeds, weights, and prompts to keep faces and outfits identical."
pubDate: "2026-05-02"
author: "Alex Chen"
tags: ["midjourney", "ai art", "character design", "prompt engineering"]
slug: "midjourney-parameter-guide-for-consistent-character-design"
type: "informational"
---

# Midjourney Parameter Guide for Consistent Character Design: Complete Workflow

> **Quick Answer:** Achieving consistent character design in Midjourney requires combining the `--cref` (Character Reference) parameter with a source image URL, adjusting the `--cw` (Character Weight) from 0 to 100, and utilizing a static `--seed` value. For maximum reliability, combine these parameters with identical, highly specific text descriptions of the subject's physical traits in every generation.

The most persistent hurdle in generative AI art has always been narrative continuity. Generating a stunning character concept is easy; placing that exact same character into different environments, outfits, and emotional states without them morphing into a completely different person is notoriously difficult. Midjourney’s architecture inherently favors variety over precision, recalculating the noise pattern with every prompt. 

However, recent updates have introduced dedicated parameters designed explicitly to lock down character traits. By moving away from purely descriptive prompting and utilizing technical parameters, you can force the model to adhere to a specific visual baseline. 

This guide breaks down the exact parameters, mathematical weights, and structural workflows required to maintain identical facial geometry, hair styles, and clothing across hundreds of generations.

## Mastering the Character Reference Parameter (--cref)

The foundation of modern character consistency in Midjourney relies on the Character Reference parameter, invoked by typing `--cref` followed by the URL of your base image. Unlike the older image prompt functionality (which blended the style and composition of an image), `--cref` is specifically trained to map and replicate human (and humanoid) features.

### How --cref Analyzes Your Subject

When you append `--cref <URL>` to your prompt, Midjourney isolates the subject from the background and maps their core identifying features: jawline structure, eye spacing, nose shape, skin tone, hair texture, and clothing patterns. It creates an internal visual token of that specific character, which it then attempts to project onto the new prompt's request.

To use it effectively, your base image URL must point to an image generated within Midjourney or an uploaded photograph. Discord image links work flawlessly.

**Basic Syntax:**
`/imagine prompt: A cinematic shot of a young woman walking through a cyberpunk city, neon lights --cref https://link-to-your-image.png`

### Sourcing the Perfect Reference Image

The effectiveness of `--cref` is directly proportional to the clarity of your reference image. A heavily stylized, dimly lit, or obscured reference will result in unpredictable generations.

To create the ideal anchor image:
1. Generate a front-facing or slight three-quarter view portrait of your character.
2. Ensure the lighting is flat and neutral (use prompts like "studio lighting, plain white background").
3. Avoid props that cover the face, such as thick glasses, masks, or heavy shadows.
4. Upscale the best result. This becomes your permanent `--cref` anchor.

## Fine-Tuning with Character Weight (--cw)

The `--cref` parameter does not work alone; it is modulated by the Character Weight parameter (`--cw`). This parameter dictates exactly *how much* of the reference image Midjourney should transfer to the new generation. The value ranges from 0 to 100.

### Using --cw 100 for Exact Replicas

By default, if you do not specify a weight, Midjourney assumes `--cw 100`. At this setting, the model attempts to replicate the character entirely. This includes their exact face, their hairstyle, and the specific outfit they are wearing in the reference image.

This setting is ideal when you want to change the character's environment or pose but keep their wardrobe identical. 

**Example:**
`/imagine prompt: [character description] sitting in a cafe --cref <URL> --cw 100`

### Using --cw 0 for Face-Only Consistency

If you need your character to change clothes or adopt a new hairstyle, you must drop the weight to 0 using `--cw 0`. 

At a weight of zero, Midjourney discards the clothing and hair data from the reference image and only maps the facial geometry and skin tone. This allows you to prompt for completely different garments and styles while retaining the underlying person.

**Example:**
`/imagine prompt: [character description] wearing a heavy winter coat and a beanie, standing in the snow --cref <URL> --cw 0`

Weights between 1 and 99 provide a sliding scale of influence, but practically, most workflows rely on either 100 (full replication) or 0 (face only) to maintain predictable control.

## The Role of Seeds in Character Design (--seed)

Before the introduction of `--cref`, the primary method for consistency was the `--seed` parameter. While less critical now, it remains an essential tool in a robust character design workflow, acting as an additional layer of stability.

Midjourney begins every generation with a field of visual noise. The pattern of this noise is determined by a random seed number. If you use the exact same prompt with the exact same seed number, you will get the exact same image. 

### Finding and Applying Your Seed

When you generate your initial perfect character concept, you need to extract its seed number. You can do this by reacting to the Midjourney bot's message with the envelope emoji (✉️). The bot will send you a direct message containing the job details, including a numeric seed value (e.g., `Seed: 284759392`).

By appending this number to future prompts (`--seed 284759392`), you force Midjourney to start with the same initial noise pattern. 

### Limitations of the Seed Parameter

Seeds are highly fragile. If you change even one word in your text prompt, the impact of the seed shifts dramatically. Therefore, seeds are best used in conjunction with `--cref`. The combination of a locked noise pattern (seed) and a locked character map (cref) minimizes the model's tendency to drift.

## Multi-Prompting and Image Weights (--iw)

Sometimes, `--cref` alone struggles to capture specific stylistic nuances, particularly with non-photorealistic characters like anime, comic book styles, or 3D renders. In these cases, combining `--cref` with standard image prompting provides necessary reinforcement.

You can include the URL as a standard image prompt alongside the `--cref` parameter. When doing this, you utilize the Image Weight (`--iw`) parameter to control how much the overall composition and style of the reference image influences the new output. The `--iw` scale ranges from 0.5 to 2.0.

**Syntax Example:**
`/imagine prompt: https://link-to-image.png A character running through a forest --cref https://link-to-image.png --iw 1.5 --cw 100`

This double-layered approach forces the model to look at the image both for character mapping and for overarching stylistic guidance.

## Practical Workflow: A 5-Step Process for Consistent Characters

To achieve professional-level consistency, follow this strict sequential workflow. Do not skip steps or rely on approximations.

### Step 1: Establish the Anchor
Prompt a neutral, well-lit portrait of your character. Do not include complex backgrounds or dramatic lighting. Use text descriptions to define three core traits: hair color/style, eye color, and ethnicity/skin tone. Upscale the best result and copy the image link. Extract the seed via the envelope emoji.

### Step 2: Test Face Mapping (--cw 0)
Using the anchor URL, run a test prompt placing the character in a completely different outfit with `--cw 0`. 
*Prompt:* `A medium shot of [character name], wearing a spacesuit, inside a spaceship --cref [Anchor URL] --cw 0`
Verify that the facial features remain identical despite the wardrobe change.

### Step 3: Build a Character Sheet
Using the same anchor URL, prompt for a character sheet to lock in multiple angles. 
*Prompt:* `Multiple views of [character name], character design sheet, front view, side profile, back view --cref [Anchor URL] --cw 100`
This sheet can serve as a secondary reference image if the model struggles with profile shots later.

### Step 4: Lock the Text Prompt
Never change the core description of your character. If your original prompt was "A 30-year-old Scandinavian man with short blonde hair and blue eyes," you must include that exact phrase in every subsequent prompt, followed by the action or environment. Do not rely solely on the image URL.

### Step 5: Iterative Generation
Begin generating your scene assets. Use `--cw 100` when the outfit must match the anchor. Use `--cw 0` when changing clothes. If the character's face begins to drift, apply the original `--seed` value to force the model back to its baseline noise pattern.

## Conclusion

Consistent character generation in Midjourney is no longer a matter of luck; it is a process of technical parameter management. By anchoring your workflow with a clear reference image via `--cref`, modulating the adherence with `--cw`, and stabilizing the foundational noise with `--seed`, you can override the model's natural tendency toward variation. Success requires discipline in your prompt structure—always pair these parameters with rigid, unchanging text descriptions of your subject to achieve true narrative continuity.

## Frequently Asked Questions

### Why does my character's face change when they turn sideways?
Generative models often struggle to interpolate 3D geometry from a 2D reference. If your `--cref` image is a straight-on portrait, Midjourney has to guess the profile. Solve this by generating a character sheet with multiple angles and using that as your reference URL.

### Can I use multiple --cref URLs in one prompt?
Yes, you can string multiple URLs together after the `--cref` parameter, separated by spaces. Midjourney will attempt to blend the facial features of all provided images. This is useful for creating a consistent hybrid character, but less effective for maintaining a single, specific identity.

### Does --cref work on stylized illustrations or only photographs?
The `--cref` parameter works across all styles, from photorealism to flat 2D animation. However, if your reference image is highly stylized, you may need to add descriptive style tags (e.g., "anime style," "watercolor") to your text prompt to prevent the model from defaulting to a realistic interpretation.

### Why is --cw 100 changing my character's clothes slightly?
At `--cw 100`, Midjourney attempts to replicate the clothing, but it is not a copy-paste function. If your new text prompt implies a different environment (e.g., "in a blizzard"), the model may subtly alter the clothing to fit the context (adding frost or thickness). To minimize this, keep environmental prompts simple.

### Do I always need to use the --seed parameter?
No, the `--seed` parameter is not strictly mandatory if you are using a strong `--cref` image. However, using the original seed acts as a safety net, reducing unwanted minor variations in lighting, background texture, and slight facial drift during long generation sessions.
