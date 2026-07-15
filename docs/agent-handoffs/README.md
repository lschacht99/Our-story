# Agent handoffs

This directory is the shared communication layer between Claude and Codex.

Claude/Fable prepares a structured handoff before asking Codex to investigate, implement, review, compare approaches, or handle asset work. Codex must read `AGENTS.md` and the named handoff file, work only within the authorized scope, and return exact files changed and validation results.

A handoff file does not prove Codex was invoked. Record the actual Codex Cloud task, GitHub issue, pull request, comment, or workflow reference when the handoff is sent.

Use `TEMPLATE.md` for every handoff.
