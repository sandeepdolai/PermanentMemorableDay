#!/usr/bin/env python3
"""Process the user's clean Rose Bouquet PNG (file_00000000fb4081f49b22c2c3d431970e.png)
into the app asset public/models/bouquet.png + bouquet-thumb.png.

Steps: kill sub-perceptual alpha noise -> trim to alpha bbox (+small margin) ->
downscale to <=1200px height -> save RGBA. Thumb: 560x560 content-centered.
"""
from PIL import Image
import numpy as np
import os

SRC = "file_00000000fb4081f49b22c2c3d431970e.png"
OUT = "public/models/bouquet.png"
THUMB = "public/models/bouquet-thumb.png"

im = Image.open(SRC).convert("RGBA")
arr = np.array(im)
print("src:", im.size)

# 1) kill alpha noise: sub-perceptual alpha (<8) -> fully transparent
a = arr[:, :, 3]
noise = (a > 0) & (a < 8)
print("alpha-noise px:", int(noise.sum()))
arr[:, :, 3] = np.where(noise, 0, a)

# drop fully transparent rows/cols (trim to alpha bbox + 8px margin)
mask = arr[:, :, 3] > 0
rows = np.any(mask, axis=1)
cols = np.any(mask, axis=0)
r0, r1 = np.argmax(rows), len(rows) - np.argmax(rows[::-1]) - 1
c0, c1 = np.argmax(cols), len(cols) - np.argmax(cols[::-1]) - 1
m = 8
r0, c0 = max(0, r0 - m), max(0, c0 - m)
r1, c1 = min(arr.shape[0] - 1, r1 + m), min(arr.shape[1] - 1, c1 + m)
arr = arr[r0:r1 + 1, c0:c1 + 1]
im = Image.fromarray(arr)
print("trimmed:", im.size)

# 2) downscale to <=1200px height (stage renders ~330-430px -> ~3x retina)
w, h = im.size
if h > 1200:
    nw = round(w * 1200 / h)
    im = im.resize((nw, 1200), Image.LANCZOS)
    print("downscaled:", im.size)

im.save(OUT, optimize=True)
print("saved", OUT, os.path.getsize(OUT), "bytes", im.size)

# 3) thumb: square 560x560, content-centered on transparency
canvas = Image.new("RGBA", (560, 560), (0, 0, 0, 0))
tw, th = im.size
scale = min(560 / tw, 560 / th)
im_t = im.resize((round(tw * scale), round(th * scale)), Image.LANCZOS)
canvas.alpha_composite(im_t, ((560 - im_t.width) // 2, (560 - im_t.height) // 2))
canvas.save(THUMB, optimize=True)
print("saved", THUMB, os.path.getsize(THUMB), "bytes")
