# GSD Models

This project uses GSD workflows that were originally written around Claude-style model aliases such as `inherit`, `opus`, `sonnet`, and `haiku`.

In OpenCode and Codex, those values are not valid subagent model IDs by themselves. That mismatch caused errors like:

```text
Model not found: inherit/.
```

## What Was Fixed

The runtime-specific model resolution now lives in:

- `.codex/get-shit-done/bin/lib/core.cjs`
- `~/.config/opencode/get-shit-done/bin/lib/core.cjs`

GSD now resolves Claude-style aliases into runtime-valid model IDs instead of returning raw `inherit`, `opus`, `sonnet`, or `haiku`.

For this repository's OpenCode setup:

- `opus` -> `openai/gpt-5.2`
- `inherit` -> `openai/gpt-5.2`
- `sonnet` -> `github-copilot/claude-sonnet-4.6`
- `haiku` -> `github-copilot/claude-sonnet-4.6`

That makes the normal `balanced` GSD profile do what we want in OpenCode:

- `gsd-planner` -> `openai/gpt-5.2`
- `gsd-executor` -> `github-copilot/claude-sonnet-4.6`

Codex keeps its own runtime mapping to Codex-supported GPT models:

- `inherit` -> `gpt-5.4`
- `opus` -> `gpt-5.4`
- `sonnet` -> `gpt-5.4-mini`
- `haiku` -> `gpt-5.4-mini`

Claude-native runtimes still keep the original behavior.

## Current Rule

When translating GSD `Task(...)` calls to a runtime subagent call:

- Prefer omitting `model` entirely when the runtime can safely inherit the parent session model.
- If a model must be materialized, it must be a valid runtime model ID.
- Do not pass raw Claude-oriented values like `inherit`, `opus`, `sonnet`, or `haiku` into subagent calls.
- In this repository, use `model_profile: "balanced"` so planner stays on the GPT reasoning tier while execution and standard agents stay on the Copilot Sonnet tier.

This rule is also documented in the GSD skill adapters under `.codex/skills/*/SKILL.md`.

## If You Change Models Later

If you want GSD to use different runtime models in the future, update the runtime map in the relevant install:

- `.codex/get-shit-done/bin/lib/core.cjs`
- `~/.config/opencode/get-shit-done/bin/lib/core.cjs`

Recommended process:

1. Decide which model should handle each tier for the target runtime:
   - high reasoning tier
   - standard execution tier
   - budget tier
2. Update the runtime map so each incoming GSD alias resolves to a supported model ID.
3. Verify with:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-planner --raw
node ~/.config/opencode/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-executor --raw
node ~/.config/opencode/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-verifier --raw
```

4. Run at least one GSD command that spawns subagents, such as:

```bash
$gsd-plan-phase
```

For this repository's OpenCode setup, expected values are:

- planner -> `openai/gpt-5.2`
- executor -> `github-copilot/claude-sonnet-4.6`

If any command starts returning a Claude alias or `inherit` directly, the mapping logic has regressed.

## Config Notes

Project config still uses the normal GSD profile system in `.planning/config.json`, for example:

```json
{
  "model_profile": "balanced"
}
```

That is the intended setting for this repo. The important part is that the runtime resolves the profile result to valid model IDs before subagents are spawned.

## Overrides

If you use `model_overrides`, the same rule applies:

- Claude-oriented override values must be translated before use in the target runtime.
- If you introduce direct runtime model IDs in overrides, make sure they are accepted by the subagent runtime.

## Safe Defaults

If you are unsure what to use, keep:

- `model_profile: "balanced"`
- runtime mapping in `core.cjs`
- direct OpenCode model IDs for materialized planner and executor resolution

That combination is the least fragile setup for this repository.
