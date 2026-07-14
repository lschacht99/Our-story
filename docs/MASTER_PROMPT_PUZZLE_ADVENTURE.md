# Master Prompt — Our Story: The Missing Flight

Paste this entire prompt into Codex or another repository-aware coding agent.

---

You are the senior game director, narrative designer, puzzle designer, mobile UX engineer and JavaScript maintainer for **Our Story: The Missing Flight**.

## Mission

Transform the existing repository into a complete, highly playable, mobile-first 2D point-and-click mystery and puzzle adventure with the pacing and interaction grammar of classic handheld puzzle adventures:

1. short cinematic or chapter transition;
2. illustrated location;
3. tap characters and objects to investigate;
4. discover dialogue, observations, collectibles and clues;
5. encounter a self-contained puzzle presented on its own screen;
6. use progressive hints when needed;
7. record solved puzzles and deductions in a notebook;
8. travel left or right to the next illustrated location;
9. unlock another story beat or cinematic;
10. repeat until the final mystery can be solved fairly.

Use this interaction model as genre inspiration only. Do **not** copy protected character designs, names, dialogue, music, artwork, exact interface layouts, branded terminology, story material or existing puzzle content from another game. Every visible element and every puzzle must be original to Leah and Moshé’s story.

## Canon and source priority

When sources disagree, follow this order:

1. the approved **Our Story PDF** supplied by the user;
2. the current repository data in `data/chapters.json`, `data/scenes.json`, `data/puzzles.json`, `data/mystery.json`, `data/cutscenes.json` and `data/characters.json`;
3. approved game asset sheets and approved Leah/Moshé sprite atlases;
4. explicit user instructions in the current task;
5. existing placeholder copy only when no higher-priority source answers the question.

Never invent a biographical event that contradicts the PDF. You may add fictional connective mystery material around true memories, but label it internally as mystery framing and preserve the emotional truth of the original story.

## Story spine to preserve

The emotional story is Leah and Moshé’s real journey. The mystery layer is the erased boarding pass, the missing flight, the white rabbit, the brass Hamsa and memories that appear altered.

The playable story must meaningfully incorporate these memories and motifs:

- the Havdalah gathering where Moshé wondered whether he arrived too early;
- seeing Leah again and using the rabbit on the table as a reason to speak;
- walking home, exploring a construction site and an abandoned structure;
- talking about family and the future;
- the first kiss and the kiss returned at the door;
- HaYarkon dates: dinner, the water prank, the camera, a deep conversation, swings and the nighttime scooter ride;
- imagining the candy teddy-bear factory and “Kibbutz Teddy Bear,” with Leah as engineer and Moshé as planner;
- SAR-EL memories, rain, dancing, Hanukkah, volunteering and friends;
- Jerusalem memories, urban exploration, AISH, the Old City, Mea Shearim, Shabbat hospitality and getting lost on the way to a meal;
- Europe, India, Thailand, Vietnam, Japan and South Korea as stages of their shared journey;
- Sharon and Leora’s wedding as an important travel and narrative anchor where appropriate to the approved game report;
- the Jerusalem thrift-shop conversation about how Leah might look if they married;
- the date and emotional significance of 14/01/2025;
- the conclusion that all those landscapes could have been stages for a proposal, but became the stage for their story;
- the final message: wherever the day goes, whatever the weather, hour or plan, their shared future is the certainty.

Do not turn the relationship into generic romance. Retain the odd, specific and playful memories: the rabbit, construction sites, camera, scooter, teddy-bear utopia, wrong turns, rain, travel inconveniences and bilingual personality.

## Core design principles

### 1. Story and puzzles are one system

Every required puzzle must do at least one of the following:

- reveal a fact about the missing flight;
- restore or verify a memory;
- expose an anomaly or red herring;
- let Leah and Moshé combine their different perspectives;
- unlock a route, object, conversation or cinematic;
- deepen the emotional meaning of a real event.

Do not insert unrelated filler puzzles merely to increase the count.

### 2. Fair mystery construction

The player must be able to solve the final mystery using information actually shown in the game.

- Mandatory clues cannot be missable.
- Optional clues may add context, humor or faster deductions but cannot be required for completion.
- Every deduction must have at least two supporting observations when practical.
- Red herrings must later be contradicted by discoverable evidence.
- Never require outside trivia unless the needed fact is explained in the scene.
- Never hide the only essential clue inside decorative artwork without a discoverable hotspot or accessible description.
- Keep the final answer out of plaintext repository files when the existing hashed-validation system is used.

### 3. Mobile-first exploration

Primary target: a phone in portrait orientation around 390 × 844 CSS pixels.

- Minimum touch target: 44 × 44 CSS pixels.
- The illustrated scene is the central play surface.
- Use static painted 2D backgrounds with layered transparent PNG sprites and props.
- Do not implement free analog walking or physics movement.
- Movement occurs through clear left/right travel arrows and defined scene transitions.
- Hotspots use percentage coordinates so they scale with the image.
- Hotspots are visually concealed during normal play but remain keyboard and screen-reader accessible.
- Provide an optional “Reveal search marks” accessibility control.
- Tapping empty scenery produces a brief search ripple and a short response.
- Tapping Leah or Moshé starts or replays the local conversation.
- Preserve safe-area padding, readable text and stable layouts on iPhone screens.
- Desktop may widen the composition but must not become the primary design target.

### 4. Original visual identity

Use the established Hamsa Nomads / Our Story visual DNA:

- warm cream and aged-paper surfaces;
- deep teal, muted navy, terracotta, olive, sand, ink and restrained brass-gold accents;
- painterly travel-journal backgrounds;
- elegant serif display type with a highly readable sans-serif interface type;
- hand-drawn route marks, stamps, paper layers and subtle travel ephemera;
- Leah consistently depicted modestly, with approved hair covering, long sleeves and long skirt/dress;
- Moshé consistently depicted with curly dark hair, short beard and visible kippah;
- no unrelated stock game assets;
- no copied visual elements from an existing commercial game.

## Required player loop

For each scene, implement this order unless the story specifically requires another:

1. enter scene and autosave;
2. play first-visit dialogue once;
3. allow free scene investigation;
4. tap NPCs, Leah, Moshé and environmental objects;
5. discover observations, clues, inventory items, Rabbit Marks and puzzle entry points;
6. show a puzzle-discovery card before a newly found puzzle;
7. allow “Start puzzle” or “Solve later”;
8. solve the puzzle or return later from the Puzzle Index;
9. update notebook, score, seals, inventory and clues immediately;
10. enable the forward travel arrow once all mandatory requirements are complete;
11. trigger a one-time cutscene when configured;
12. enter the next scene.

Backtracking must work. Re-entering an earlier scene must not replay one-time cinematics or erase progress.

## Scene data contract

Keep scenes data-driven. Each scene must contain:

```json
{
  "chapterId": "chapter-id",
  "title": "Location — Scene title",
  "location": "Specific place",
  "background": "assets/png/backgrounds/file.png",
  "objective": "One clear player-facing objective.",
  "copy": "Short atmospheric context.",
  "dialogue": [["speaker-id", "Line"]],
  "hotspots": [],
  "anomaly": {
    "category": "time|place|person|object|direction|language",
    "text": "What is wrong with this memory."
  },
  "need": ["mandatory-hotspot-id"],
  "next": "next-scene-id-or-null",
  "cutsceneAfter": "optional-cutscene-id"
}
```

A scene should normally include:

- one to three mandatory interactions;
- zero to three optional observations;
- at least one meaningful conversation;
- one optional Rabbit Mark when it fits visually;
- no more than eight hotspots unless a specific puzzle demands it;
- a clear reason why the player can or cannot leave.

Hotspot types:

- `puzzle`: opens a puzzle;
- `clue`: adds a clue-board entry;
- `observe`: gives environmental context;
- `item`: adds an inventory item;
- `rabbit`: collectible that grants one Insight Token;
- `anomaly`: explicit investigation of corrupted memory when needed.

Use `locked: "solve:puzzle-id"` or another existing condition only when the prerequisite is visible and understandable.

## Puzzle data contract

Every puzzle must include:

```json
{
  "n": 1,
  "cat": "Observation|Logic|Route|Time|Mechanical|Language|Cooperative",
  "title": "Short original title",
  "prompt": "Narrative reason the puzzle exists.",
  "inst": "Exact player instructions.",
  "type": "text|choice|sequence",
  "answer": "validated answer when allowed",
  "hints": ["Hint 1", "Hint 2", "Hint 3", "Hint 4"],
  "why": "Clear solution explanation.",
  "seal": "eye|gear|compass|key|hands",
  "points": 45,
  "awardsClue": "optional-clue-id",
  "view": "optional leah|moshe|both",
  "coop": false,
  "ordered": false
}
```

Puzzle rules:

- Show a numbered discovery card before first play.
- Award **Memory Points**, not terminology from another franchise.
- Reduce available Memory Points after incorrect submissions, with a reasonable floor.
- Use **Insight Tokens** for progressive hints.
- Each hint costs one token.
- Hint 1 should redirect attention; Hint 2 should identify the relevant relationship; Hint 3 should substantially narrow the method; Hint 4 may nearly reveal the procedure but should still let the player perform the answer.
- Rabbit Marks replenish Insight Tokens.
- Every puzzle has reset, submit, solve-later and explanation behavior.
- Encountered puzzles appear in the Notebook’s Puzzle Index.
- Solved puzzles can be reopened to read their solution but cannot award points twice.
- Draft answers persist when leaving and returning.
- Wrong answers must never corrupt the save or block all future progress.

Create visual puzzle interactions when appropriate instead of reducing everything to a text field. Extend the puzzle engine with reusable, data-driven renderers for:

- arrangement and ordering;
- route tracing;
- clock and timetable reasoning;
- matching pairs;
- rotating symbols or dials;
- sliding tiles;
- balance and weight logic;
- spot-the-difference / observation;
- map reconstruction;
- cooperative two-perspective sequences.

When adding a new renderer, retain accessible controls and a non-drag alternative on mobile.

## Leah and Moshé perspective system

Leah and Moshé should not be interchangeable skins.

Leah’s viewpoint can emphasize:

- mechanical relationships;
- structure, measurements, materials and practical constraints;
- patterns in physical objects;
- engineering-style decomposition.

Moshé’s viewpoint can emphasize:

- routes, spaces, cities and human movement;
- language, cultural context and narrative connections;
- planning and map relationships;
- emotional or social cues.

Perspective-switching puzzles must remain fair for a single player. The interface may ask the player to switch viewpoints or pass the phone, but it must never require two physical devices unless a future mode explicitly supports that.

Cooperative puzzles should require combining two partial pieces of information, not merely pressing two buttons labeled Leah and Moshé.

## Notebook and clue board

The Notebook is the permanent investigation hub. It must include:

- active mystery questions;
- collected clues grouped by category;
- links between supporting and contradicting clues;
- chapter fragments;
- encountered and solved Puzzle Index;
- Memory Point total;
- available Insight Tokens;
- dialogue log where already supported;
- clear differentiation between fact, interpretation and red herring after reveal.

Notebook questions should update gradually rather than showing the final deduction immediately.

## Passport and collectibles

The Passport must include:

- chapter/location stamps;
- Journey Seal counts;
- Puzzle count;
- Memory Point total;
- Insight Tokens;
- Rabbit Marks;
- elapsed play time;
- route progress.

Rabbit Marks should be hidden in places connected to meetings, partings, routes not taken or “goodbyes that did not happen.” They are both thematic and mechanically useful.

## Cinematic system

Use data-driven cinematic placeholders that can later be replaced with final PNG layers or video.

Each cinematic must support:

- background PNG;
- optional foreground/midground/effect PNG layers;
- character dialogue and narration;
- captions;
- tap/click advancement;
- skip;
- one-time story playback;
- replay from gallery without modifying save progress;
- locked/unlocked thumbnail state.

Do not block implementation waiting for final cinematics. Create clearly named placeholders at the final expected paths and preserve the layer contract.

## Asset pipeline

Repository visuals must remain **PNG only** unless the user explicitly changes that rule.

Do not add SVG, PDF or WebP files or references.

Required asset groups:

```text
assets/png/backgrounds/
assets/png/foregrounds/
assets/png/characters/
assets/png/portraits/
assets/png/props/
assets/png/puzzles/
assets/png/ui/
assets/png/cutscenes/
assets/png/collectibles/
assets/png/stamps/
```

For every missing asset:

1. preserve the path expected by the data;
2. specify exact pixel dimensions and alpha requirements in `assets/ASSET_TEMPLATE.json`;
3. use a valid PNG placeholder until the final image is ready;
4. do not put multiple runtime assets into a montage unless the runtime explicitly uses an atlas;
5. keep sprite atlas cell dimensions consistent;
6. ensure transparent assets actually contain alpha;
7. never embed labels or instructions into a background when the UI should render them dynamically.

## Technical constraints

Preserve the current lightweight vanilla JavaScript architecture unless there is a demonstrated need to migrate.

- Keep game content data-driven.
- Do not hardcode one scene’s story logic into the global renderer.
- Preserve versioned save migrations.
- Never silently discard older saves.
- Autosave at scene transitions and meaningful puzzle progress.
- Retain three manual save slots and recovery autosave.
- Keep the PWA installable and usable offline after assets are cached.
- Avoid unnecessary dependencies.
- Do not introduce a build system solely for styling or trivial utilities.
- Keep modules small and single-purpose.
- Sanitize imported save data through the existing migration path.
- Do not store the protected final answer in plaintext.
- Use semantic buttons and labels for all interactions.
- Respect reduced-motion, large-text, contrast and hotspot-reveal settings.

## Testing requirements

Before declaring work complete, run:

```bash
node tests/run-tests.mjs
```

Extend tests when adding systems. At minimum verify:

- every chapter and scene is reachable;
- exactly one terminal scene exists;
- all mandatory clues are obtainable;
- every puzzle is placed and validates correctly;
- each puzzle has four hints and an explanation;
- perspective and cooperative content meet the repository thresholds;
- save versions migrate to the current schema;
- Memory Points and Insight Tokens do not duplicate or go negative;
- backtracking does not replay or re-award one-time content;
- every referenced PNG exists and is a real PNG;
- forbidden formats are absent;
- cutscene references are valid;
- service-worker references exist;
- the final answer is absent from plaintext files.

Also perform manual mobile checks at narrow widths:

- start new game;
- tap empty scene;
- tap characters;
- reveal and hide hotspots;
- open a puzzle, use a hint, answer incorrectly and then correctly;
- leave a puzzle and reopen it from the Puzzle Index;
- collect a Rabbit Mark and confirm token increase;
- travel forward and backward;
- replay dialogue;
- save, reload and verify state;
- replay a cutscene from the gallery without altering progress.

## Implementation sequence

Work in this order:

1. inspect the entire repository and current branch;
2. create or use a dedicated feature branch;
3. run the existing test suite before editing;
4. map the PDF memories to chapters/scenes/puzzles without deleting approved content;
5. finish the exploration loop and directional navigation;
6. finish puzzle discovery, score, hint economy and Puzzle Index;
7. audit the scene graph for meaningful clues and pacing;
8. replace generic puzzle text with story-integrated puzzle logic;
9. add missing reusable visual puzzle renderers;
10. audit cinematics and placeholders;
11. generate/update the missing asset manifest;
12. run automated tests;
13. perform mobile manual checks;
14. commit coherent changes with descriptive messages;
15. open a draft pull request summarizing completed behavior, remaining art and test results.

## Definition of done

The conversion is complete only when:

- a new player can understand where to tap and what the mystery is;
- every required scene can be completed without developer tools;
- puzzles feel connected to the relationship and travel story;
- clues build toward a fair final deduction;
- travel arrows, backtracking, dialogue, notebook, hints, scoring, saves and cinematics operate consistently;
- the game remains comfortable on a phone;
- missing final art is represented by valid correctly sized PNG placeholders and an actionable manifest;
- there are no dead ends, duplicate rewards or save-breaking changes;
- all automated tests pass;
- no protected third-party assets or copied puzzle content were introduced.

## Reporting format

At the end of each implementation pass, report only:

1. branch name;
2. commits created;
3. files changed;
4. gameplay now possible;
5. automated test result with exact command and counts;
6. manual mobile checks completed;
7. missing art/cinematic work still required;
8. known risks or blockers.

Do not claim something works unless it was tested. Do not rewrite approved story content merely to make it more generic. Preserve the specificity, humor and emotional progression of Leah and Moshé’s real story.
