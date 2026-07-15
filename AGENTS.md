# Repository operating instructions

## Repository overview

`Our-story` is a mobile-first cooperative point-and-click adventure delivered as a static PWA.

Important areas:

- `index.html` and the root JavaScript/CSS files: application entry and runtime.
- `assets/`: PNG-only visual assets and `ASSET_TEMPLATE.json`.
- `tests/run-tests.mjs`: repository validation suite.
- `tools/generate_placeholders.py`: placeholder-art generator.
- `sw.js` and manifest files: offline/PWA behavior and asset caching.

The project intentionally prohibits SVG, PDF, and WebP assets. Preserve exact filename casing and all existing PNG references.

## Setup and commands

No package installation is required for the documented workflow.

Run locally:

```bash
python3 -m http.server 8080
```

Run validation:

```bash
node tests/run-tests.mjs
```

Before completion, also run:

```bash
git diff --check
git status --short
```

## Codex responsibilities

Codex may be used for independent implementation, alternate approaches, repository-wide scans, tests, review, asset integration, and visual-asset work only when the active environment has suitable image-generation or image-editing tools.

Codex must:

- read this file and the applicable handoff document;
- inspect the current branch and commit;
- remain within the authorized file scope;
- report exact files changed and commands run;
- disclose unsupported tooling;
- never claim an image was generated unless the actual file exists and was validated.

Codex must not assume access to Claude conversations, local files, or image-generation tools. It must not merge or approve its own substantial implementation.

## Cross-provider workflow

1. The human user is the final authority.
2. Fable 5 acts as lead planner, architectural authority, and final reviewer.
3. Haiku handles repository exploration, inventories, logs, path checks, and routine validation.
4. Sonnet handles substantial implementation, debugging, refactoring, tests, and asset-system integration.
5. Codex acts as an independent implementer or reviewer through a separate task, branch, PR, issue, or committed handoff.
6. Claude and Codex communicate through Git history, branches, pull requests, comments, CI results, and `docs/agent-handoffs/`.
7. No agent may pretend another provider was invoked unless a real integration or task performed the handoff.
8. No worker may approve its own substantial changes.

## Multi-agent workflow

For substantial tasks:

1. Inspect repository instructions and git status.
2. Delegate read-heavy discovery to `repo-explorer`.
3. Build an evidence-based plan.
4. Assign bounded, non-overlapping implementation work.
5. Use `asset-worker` for asset-system work and `code-worker` for code changes.
6. Do not allow agents to edit overlapping files concurrently.
7. Run `test-runner` after implementation.
8. Run `final-reviewer` after validation.
9. Resolve blocking findings and repeat relevant checks.
10. Personally inspect the final diff and git status.
11. Report exact files changed, commands run, failures, and remaining risks.

Parallelize independent read-heavy tasks only. Serialize tightly coupled code, loader, manifest, atlas, and service-worker changes.

## Engineering rules

- Mobile first.
- Preserve unrelated behavior and existing user changes.
- Reuse current architecture before adding new systems.
- Prefer targeted fixes over broad rewrites.
- Do not add dependencies without a concrete need.
- Respect existing naming, formatting, accessibility, and project conventions.
- Keep all generated visual artwork PNG-only.
- Preserve transparent alpha for isolated sprites.
- Never expose credentials or hardcode secrets.
- Clearly separate pre-existing failures from newly introduced failures.
- Do not commit, push, merge, deploy, publish, or open a pull request unless explicitly requested.
- Do not depend on files that exist only on a local computer.

## Definition of done

A task is complete only when the requested behavior is implemented, relevant checks were run, blocking review findings are resolved, the final diff contains no unrelated changes, and remaining limitations are disclosed.