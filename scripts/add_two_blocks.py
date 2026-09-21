#!/usr/bin/env python3
"""Process the user's new Flower PNG (New Project 517 [CA9D68C].png) into
public/models/bouquet3.png + bouquet3-thumb.png, and stage the rose GLB
as public/models/rose-3d.glb (checking whether textures can be shrunk).
"""
from PIL import Image
import numpy as np
import os, struct, json, io

# ---------- 1) PNG: trim + downscale ----------
SRC = "New Project 517 [CA9D68C].png"
OUT = "public/models/bouquet3.png"
THUMB = "public/models/bouquet3-thumb.png"

im = Image.open(SRC).convert("RGBA")
arr = np.array(im)
print("src:", im.size)

a = arr[:, :, 3]
noise = (a > 0) & (a < 8)
print("alpha-noise px:", int(noise.sum()))
arr[:, :, 3] = np.where(noise, 0, a)

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

w, h = im.size
if h > 1200:
    nw = round(w * 1200 / h)
    im = im.resize((nw, 1200), Image.LANCZOS)
    print("downscaled:", im.size)

im.save(OUT, optimize=True)
print("saved", OUT, os.path.getsize(OUT), "bytes", im.size)

canvas = Image.new("RGBA", (560, 560), (0, 0, 0, 0))
tw, th = im.size
scale = min(560 / tw, 560 / th)
im_t = im.resize((round(tw * scale), round(th * scale)), Image.LANCZOS)
canvas.alpha_composite(im_t, ((560 - im_t.width) // 2, (560 - im_t.height) // 2))
canvas.save(THUMB, optimize=True)
print("saved", THUMB, os.path.getsize(THUMB), "bytes")

# ---------- 2) GLB: inspect images, copy as-is ----------
GLB = "tripo-model-7ffeee1a (1).glb"
with open(GLB, "rb") as f:
    data = f.read()

magic, version, length = struct.unpack("<III", data[:12])
offset = 12
chunks = []
while offset < len(data):
    clen, ctype = struct.unpack("<II", data[offset:offset+8])
    chunks.append((clen, ctype, offset+8))
    offset += 8 + clen

gltf = json.loads(data[chunks[0][2]:chunks[0][2]+chunks[0][0]])

# images reference bufferViews — check each image's byte size + inferred dims
bin_start = chunks[1][2]
for i, img in enumerate(gltf.get("images", [])):
    bv = gltf["bufferViews"][img["bufferView"]]
    blob = data[bin_start + bv.get("byteOffset", 0): bin_start + bv.get("byteOffset", 0) + bv["byteLength"]]
    try:
        timg = Image.open(io.BytesIO(blob))
        print(f"image {i}: {img.get('mimeType','?')} {timg.size} {len(blob)/1024:.0f}KB")
    except Exception as e:
        print(f"image {i}: {img.get('mimeType','?')} {len(blob)/1024:.0f}KB (decode failed: {e})")

import shutil
shutil.copy(GLB, "public/models/rose-3d.glb")
print("staged GLB:", os.path.getsize("public/models/rose-3d.glb"), "bytes")
