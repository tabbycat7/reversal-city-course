# 反转之城角色素材：最终提示词

生成方式：内置 image_gen；每张素材各调用一次，没有后处理绘制，也未更改原始透明通道。

## 1. 阿岚四状态表情图

输出：alan-expressions-2x2.png

```text
Use case: stylized-concept.
Asset type: production character expression sprite sheet for a light-toned browser learning adventure called Reversal City, aimed at high-school students.
Generate ONE square PNG image with a TRUE TRANSPARENT ALPHA BACKGROUND. This is a cutout asset sheet, not a concept-art board. Arrange precisely FOUR separate waist-up illustrations of THE SAME character in a strict 2 columns by 2 rows grid of equal size. There are no visible cell lines.
Subject in every cell: Alan (阿岚), a 17-year-old androgynous Chinese high-school student companion, short dark-brown hair with a natural slightly tousled silhouette, an apricot-orange lightweight jacket worn open over a teal top, a small plain crossbody bag. Friendly confident face, age-appropriate natural youthful human anatomy and proportions, tasteful expressive eyes. Normal teenager head-to-body proportions; not chibi and not a small child. Sophisticated cinematic animated-film illustration, polished soft painterly 3D shading, clean readable silhouette, warm gentle light. Same face, hairstyle, skin tone, clothes and bag in every pose.
Grid poses, in reading order: TOP LEFT: calm friendly small smile, neutral relaxed pose. TOP RIGHT: thoughtful, one hand gently at the chin. BOTTOM LEFT: explaining something and pointing toward the RIGHT side of the canvas, warm engaging expression. BOTTOM RIGHT: just made a discovery, a lightly raised hand and a bright but restrained interested expression.
Composition: consistent waist-up framing and similar body scale in all four cells, center each pose inside its own equal cell. Keep the entire hair, full head, both shoulders, complete hands and fingertips inside each cell. The waist-up figure should have a clean intentional lower torso crop; do not crop any hair or gesture. Leave generous fully transparent padding around every illustration, including a clear transparent horizontal and vertical gutter so exact half-width and half-height cuts separate all four cleanly. Arms never cross into another cell. No overlap.
Constraints: transparent pixels everywhere except the four character cutouts; do NOT paint a checkerboard pattern, white card, colored rectangle, scene, floor or drop-shadow background. Absolutely NO words, letters, numbers, captions, logos, watermarks, frame borders, panels or decorative symbols. Only the four character poses.
```

## 2. 机器人四帧眨眼动画条

输出：robot-blink-4x1.png

```text
Use case: stylized-concept.
Asset type: production 4-frame blinking sprite strip for a browser learning game, CSS steps(4) animation.
Generate ONE panoramic horizontal PNG image with a TRUE TRANSPARENT ALPHA BACKGROUND. Precisely FOUR equal-width frame cells in ONE single horizontal row. Four columns, one row only. There are NO visible frame borders.
The subject is the SAME small charming rounded robot companion in every frame: warm off-white ceramic shell, muted sage-green accents, small sky-cyan ear tabs, a soft rounded compact body, simple friendly two-eye display on the front of its face. Sophisticated polished animated-film 3D illustration, suitable for a beautiful light-themed learning game for high-school students. Restrained detail, consistent geometry, soft lighting, no cartoon baby proportions. A small rounded hovering companion with two tiny side arms and a compact lower body.
Animation must be stationary: exact same front-facing camera, body shape, size, scale, silhouette, position, center, ear shapes, arms, shading and lighting in every frame. Only the eye state changes. Frame 1 at far LEFT: two normal open friendly eyes. Frame 2: both eyes half closed during a blink. Frame 3: both eyes fully closed as two short gentle horizontal lines. Frame 4 at far RIGHT: the exact same normal open eyes as frame 1. No other pose or expression change.
Composition: center each robot precisely at the center of its equal-width cell, on the same horizontal baseline, with exactly equal surrounding transparent margins. Keep the complete body, ears and arms inside each cell. Generous transparent spacing separates adjacent robots. For cropping, the full image width will be divided into exactly four equal sections. All four cells have identical dimensions.
Constraints: real alpha transparency, no checkerboard texture, no white rectangular background, no floor, no scenery, no glow or drop shadow extending into gaps. Absolutely NO text, letters, numbers, captions, labels, watermarks, borders, speech bubbles or extra objects. Only these four robot frames.
```

