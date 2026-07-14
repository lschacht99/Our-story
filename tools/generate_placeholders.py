#!/usr/bin/env python3
"""Create tiny flat-colour PNG placeholders at every asset path the game needs.

Real painted art will replace these files later (same paths, same names).
Every placeholder is a valid PNG so the game runs and asset tests pass.
See assets/ASSET_TEMPLATE.json for the art brief of each file.

Run from the repo root:  python3 tools/generate_placeholders.py
"""
import json
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG_DIR = os.path.join(ROOT, "assets", "png")


def write_png(path, rgb, w=32, h=48):
    """Write a minimal solid-colour PNG without external dependencies."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    row = b"\x00" + bytes(rgb) * w
    raw = row * h

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


PALETTE = {
    "backgrounds": (58, 84, 88),      # deep teal
    "cutscenes/backgrounds": (44, 60, 78),
    "cutscenes/layers": (198, 160, 82),
    "cutscenes/thumbnails": (90, 104, 110),
    "portraits": (196, 106, 74),      # terracotta
    "stamps": (122, 124, 78),         # olive
    "ui": (222, 198, 156),            # sand
    "ui/chapter-cards": (24, 40, 66), # navy
    "collectibles": (245, 237, 220),  # cream
    "characters": (150, 130, 104),
}


def main():
    template = json.load(open(os.path.join(ROOT, "assets", "ASSET_TEMPLATE.json")))
    count = 0
    for group in template["assets"]:
        rgb = PALETTE.get(group["group"], (120, 120, 120))
        for item in group["files"]:
            path = os.path.join(ROOT, item["path"])
            if item.get("keep") and os.path.exists(path):
                continue  # existing hand-made asset, do not overwrite
            w, h = item.get("placeholderSize", [32, 48])
            write_png(path, rgb, w, h)
            count += 1
    print(f"wrote {count} placeholder PNGs under {PNG_DIR}")


if __name__ == "__main__":
    main()
