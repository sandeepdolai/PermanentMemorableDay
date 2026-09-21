#!/usr/bin/env python3
"""
Process the replacement rose bouquet (user-pushed "New Project 517 [A2CF96C].png")
and REPLACE the primary bouquet asset (public/models/bouquet.png).

The upload is a clean alpha cutout on a 2160x3840 canvas (content 2125x2664).
Steps: kill sub-perceptual alpha noise, trim to alpha bbox, downscale to a
web-friendly size (max 1200px content height — plenty for the ~330px stage at
3x retina), optimize, and rebuild the square thumbnail.
"""
from PIL import Image
import numpy as np
import os

SRC = "New Project 517 [A2CF96C].png"
OUT = "public/models/bouquet.png"
THUMB = "public/models/bouquet-thumb.png"

img = Image.open(SRC).convert("RGBA")
a = np.array(img)
h, w = a.shape[:2]
print(f"source: {w}x{h}")

# Kill sub-perceptual alpha noise
a[:, :, 3] = np.where(a[:, :, 3] < 8, 0, a[:, :, 3])

# Trim to alpha bbox
alpha = a[:, :, 3]
ys, xs = np.where(alpha > 8)
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
crop = Image.fromarray(a).crop((x0, y0, x1 + 1, y1 + 1))
cw, ch = crop.size
print(f"trimmed: {cw}x{ch}")

# Downscale to max 1200px height (stage shows ~330px; 1200 = ~3.6x retina)
MAX_H = 1200
if ch > MAX_H:
    nw = round(cw * MAX_H / ch)
    crop = crop.resize((nw, MAX_H), Image.LANCZOS)
    print(f"downscaled: {nw}x{MAX_H}")

crop.save(OUT, optimize=True)
print(f"saved {OUT}: {os.path.getsize(OUT)//1024} KB")

# square transparent thumb, content-centered
cw, ch = crop.size
side = max(cw, ch)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(crop, ((side - cw) // 2, (side - ch) // 2), crop)
sq.resize((560, 560), Image.LANCZOS).save(THUMB, optimize=True)
print(f"saved {THUMB}: {os.path.getsize(THUMB)//1024} KB")
