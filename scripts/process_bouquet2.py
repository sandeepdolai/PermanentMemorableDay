#!/usr/bin/env python3
"""
Process the 2nd rose bouquet (user-pushed file_00000000eb648208815f11fd697efd3e.png)
into a stage-ready transparent PNG.

The upload is already a clean alpha cutout, so this is lighter than the first
bouquet pass: trim to the alpha bbox, kill any stray near-transparent noise
(alpha < 8 -> 0), re-save optimized, and build the square thumbnail.
"""
from PIL import Image
import numpy as np
import os

SRC = "file_00000000eb648208815f11fd697efd3e.png"
OUT = "public/models/bouquet2.png"
THUMB = "public/models/bouquet2-thumb.png"

img = Image.open(SRC).convert("RGBA")
a = np.array(img)
h, w = a.shape[:2]
print(f"source: {w}x{h}")

# Kill sub-perceptual alpha noise (<8 -> fully transparent)
a[:, :, 3] = np.where(a[:, :, 3] < 8, 0, a[:, :, 3])

# Trim to alpha bbox + small margin
alpha = a[:, :, 3]
ys, xs = np.where(alpha > 8)
m = 12
x0, x1 = max(0, xs.min() - m), min(w - 1, xs.max() + m)
y0, y1 = max(0, ys.min() - m), min(h - 1, ys.max() + m)
crop = Image.fromarray(a).crop((x0, y0, x1 + 1, y1 + 1))
print(f"cropped: {crop.size[0]}x{crop.size[1]} (content x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()})")

crop.save(OUT, optimize=True)
print(f"saved {OUT}: {os.path.getsize(OUT)//1024} KB")

# square transparent thumb, content-centered
cw, ch = crop.size
side = max(cw, ch)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(crop, ((side - cw) // 2, (side - ch) // 2), crop)
sq.resize((560, 560), Image.LANCZOS).save(THUMB, optimize=True)
print(f"saved {THUMB}: {os.path.getsize(THUMB)//1024} KB")

# preview composite on the stage gradient for VLM check
bgc1 = np.array([58, 21, 38]); bgc2 = np.array([29, 29, 31])
W, H = 460, 540
grad = np.zeros((H, W, 3), np.uint8)
for y in range(H):
    t = y / H
    grad[y, :] = (bgc1 * (1 - t * 0.9) + bgc2 * (t * 0.9)).astype(np.uint8)
bgimg = Image.fromarray(grad)
target_h = int(H * 0.9)
tw = int(crop.size[0] * target_h / crop.size[1])
bq2 = crop.resize((tw, target_h), Image.LANCZOS)
bgimg.paste(bq2, ((W - tw) // 2, (H - target_h) // 2), bq2)
bgimg.save("/tmp/stage_mock2.png")
print("preview saved /tmp/stage_mock2.png")
