# Simple 2D PNG asset system

The game loads finished local PNG files only. It does not display sprite sheets, decode Base64 artwork, use external image URLs, or crop character artwork in the browser.

- Scene art: `assets/png/backgrounds/<scene-id>.png`
- Leah: `assets/png/characters/leah/<pose>.png`
- Moshé: `assets/png/characters/moshe/<pose>.png`
- Portraits: `assets/png/portraits/`
- Interface and hotspots: `assets/png/ui/`
- Story props: `assets/png/items/`
- Cutscenes: `assets/png/cutscenes/`

The installed pack contains a direct background for every scene, seven transparent poses per lead character, portraits, story props, chapter art, cutscene art and small interaction icons.

To replace artwork later, export a PNG with the same filename and overwrite the existing file. No code change is required when the path stays the same.
