# Simple 2D PNG asset system

The game loads finished PNG files only. Character atlas sheets remain source material but are never displayed or sliced by the browser.

- Scene art: `assets/png/backgrounds/<scene-id>.png`
- Leah: `assets/png/characters/leah/<pose>.png`
- Moshé: `assets/png/characters/moshe/<pose>.png`
- Portraits: `assets/png/portraits/`
- Interface and hotspots: `assets/png/ui/`
- Story props: `assets/png/items/`
- Cutscenes: `assets/png/cutscenes/`

The generated pack contains direct scene backgrounds, seven transparent poses per lead character, portraits, story props, chapter art, cutscene art and small interaction icons.

Regenerate the complete pack with:

```bash
python -m pip install pillow
python tools/generate_2d_assets.py
```

Replacing an individual pose or background later requires only overwriting the PNG at its existing path. Do not add SVG, PDF, WebP, Base64 runtime images, CSS atlas slicing, or external image URLs.
