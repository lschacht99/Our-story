# Hamsa Nomads: The Missing Journey

A mobile-first point-and-click puzzle adventure based on Leah and Moshé’s travel story.

## Current playable chapter

**Chapter 1 — Three Flights East**

Paris → Istanbul → Muscat → Mumbai

- Original painted PNG backgrounds
- PNG-only visual asset pipeline
- Animated Leah and Moshé sprite atlases
- Moshé wears a kippah; Leah wears modest clothing and a scarf
- Ten interactive story puzzles with progressive hints
- Point-and-click hotspots, dialogue, Passport, route map and mystery notebook
- Rabbit Mark collectibles and local autosave
- Installable PWA with offline caching

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Asset rule

All game artwork must be committed as `.png`. Do not add SVG or PDF visual assets. See `ASSET_MANIFEST.json` for the runtime asset inventory.
