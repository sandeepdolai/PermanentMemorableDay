#!/usr/bin/env python3
"""
Process the uploaded rose-bouquet screenshot into a clean transparent PNG.

Steps:
1. Neutralize viewer UI chrome (left info column/panel, bottom-right blue Z icon)
   by painting those zones pure black.
2. Flood-fill the pure-black background (connected to image border) -> transparent,
   keeping the very dark wrap paper (it is never border-connected black).
3. Soft 0.8px alpha feather at the silhouette so edges look smooth on any stage.
4. Crop to the bouquet bbox + small margin.
5. Save public/models/bouquet.png + square bouquet-thumb.png.
"""
from PIL import Image
import numpy as np
from scipy import ndimage

SRC = "upload/Screenshot_2026_0921_112634.png"
OUT = "public/models/bouquet.png"
THUMB = "public/models/bouquet-thumb.png"

img = Image.open(SRC).convert("RGB")
a = np.array(img)
h, w = a.shape[:2]
print(f"source: {w}x{h}")

# --- 1. neutralize UI chrome ------------------------------------------------
# Left UI column (info panel + input pill): panel flat grey (19,19,19) right edge
# measured at x<=178; bouquet foliage starts at x>=187. Cut x 0..181 inclusive.
a[:, :182] = 0
# Bottom-right blue "Z" badge (detected x 749-764, y 567-589): generous box.
a[540:616, 728:] = 0
print("ui chrome neutralized")

# --- 2. background = near-black region connected to the border ---------------
blackish = a.max(axis=2) <= 10          # pure bg is exactly (0,0,0)
labels, n = ndimage.label(blackish)
border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
border_labels.discard(0)
bg = np.isin(labels, list(border_labels))
print(f"background px: {bg.sum()} of {h*w} ({bg.sum()*100//(h*w)}%)")

fg = ~bg
alpha = np.where(fg, 255, 0).astype(np.float32)

# --- 3. feather the silhouette ----------------------------------------------
soft = ndimage.gaussian_filter(alpha, sigma=0.8)
# interior stays fully opaque; just outside the edge fades out smoothly
alpha = np.where(fg, 255.0, np.minimum(soft * 1.7, 255.0))
alpha = alpha.astype(np.uint8)

rgba = np.dstack([a.astype(np.uint8), alpha])

# --- 4. crop to content + margin --------------------------------------------
ys, xs = np.where(alpha > 8)
m = 10
x0, x1 = max(0, xs.min() - m), min(w - 1, xs.max() + m)
y0, y1 = max(0, ys.min() - m), min(h - 1, ys.max() + m)
crop = Image.fromarray(rgba, "RGBA").crop((x0, y0, x1 + 1, y1 + 1))
print(f"cropped: {crop.size[0]}x{crop.size[1]} (content x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()})")

# --- 5. save ------------------------------------------------------------------
crop.save(OUT, optimize=True)
print(f"saved {OUT}")

# square transparent thumb, content-centered
cw, ch = crop.size
side = max(cw, ch)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(crop, ((side - cw) // 2, (side - ch) // 2), crop)
sq.resize((560, 560), Image.LANCZOS).save(THUMB, optimize=True)
print(f"saved {THUMB}")

# --- report file sizes ---------------------------------------------------------
import os
print("bouquet.png:", os.path.getsize(OUT) // 1024, "KB")
print("thumb:", os.path.getsize(THUMB) // 1024, "KB")
