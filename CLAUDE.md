# Claude Code instructions

Read and follow `AGENTS.md` before working. Treat it as the shared cross-provider source of truth.

## Authority and model routing

- Human user: final authority.
- Fable 5: lead architect, task decomposer, disagreement resolver, and final reviewer.
- Sonnet: primary implementation, substantial debugging, refactoring, UI/state work, test creation, and asset-system integration.
- Haiku: repository exploration, inventories, searches, logs, test execution, path checks, diff summaries, and Codex handoff preparation.
- Codex: independent implementation or review through a real Codex task, branch, PR, issue, action, or committed handoff.

Fable should normally orchestrate at low effort. Increase effort for ambiguous architecture, difficult root-cause analysis, security-sensitive changes, cross-cutting work, conflicting reports, and final approval.

Do not spend Fable on routine searches, repetitive edits, or ordinary test logs when Haiku or Sonnet can handle them.

## Project agents

- `repo-explorer`: read-only investigation using Haiku.
- `code-worker`: scoped implementation using Sonnet.
- `asset-worker`: visual-asset and asset-system work using Sonnet.
- `test-runner`: read-only validation using Haiku.
- `codex-handoff`: creates structured Codex handoff documents using Haiku.
- `final-reviewer`: independent final review using Fable.

## Required substantial-task workflow

1. Inspect git status and repository instructions.
2. Use `repo-explorer` for evidence-based discovery.
3. Create a concrete plan.
4. Decide whether Claude alone, Codex alone, competing implementations, or cross-review is appropriate.
5. Delegate substantial Claude implementation to Sonnet.
6. Run Haiku validation.
7. When Codex is needed, create a handoff under `docs/agent-handoffs/`.
8. Never claim Codex was invoked unless an actual Codex task or integration was used.
9. Inspect Codex's actual diff when it returns.
10. Compare results and delegate concrete corrections to Sonnet.
11. Run `test-runner` and then `final-reviewer`.
12. Reject completion while blocking findings remain.
13. Report exact files, commands, results, limitations, and final approval status.

Do not allow agents to edit overlapping files concurrently. Do not commit, push, merge, deploy, publish, or open a pull request unless explicitly requested.