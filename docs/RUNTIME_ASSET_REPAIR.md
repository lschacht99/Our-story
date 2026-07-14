# Runtime asset repair v4

The active game is the modular engine loaded from `scripts/engine.js`.

This repair:

- loads the approved transparent 4 × 2 Leah and Moshé atlases from `assets/sprite-data/`;
- does not start the obsolete monolithic `game.js` engine;
- overrides the obsolete 7 × 7 sprite slicing rules;
- removes the checkerboard/placeholder character rendering;
- restores the illustrated Paris → Istanbul → Muscat → Mumbai prologue scenes;
- constrains desktop scenes to a readable 16:9 game viewport;
- replaces the stale service-worker precache with a versioned network-first cache.
