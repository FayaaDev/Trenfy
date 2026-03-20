# GSD Models in Codex

This project uses GSD workflows that were originally written around Claude-style model aliases such as `inherit`, `opus`, `sonnet`, and `haiku`.

In Codex, those values are not valid `spawn_agent` model IDs by themselves. That mismatch caused errors like:

```text
Model not found: inherit/.
```

## What Was Fixed

The runtime-specific model resolution now lives in:

- `.codex/get-shit-done/bin/lib/core.cjs`

Under Codex, GSD no longer returns Claude-only model values directly. Instead it maps them to Codex-supported GPT models:

- `inherit` -> `gpt-5.4`
- `opus` -> `gpt-5.4`
- `sonnet` -> `gpt-5.4-mini`
- `haiku` -> `gpt-5.4-mini`

Claude-native runtimes still keep the original behavior.

## Current Rule for Codex

When translating GSD `Task(...)` calls to Codex `spawn_agent(...)`:

- Prefer omitting `model` entirely.
- If a model must be materialized, it must be a valid Codex model ID.
- Do not pass raw Claude-oriented values like `inherit`, `opus`, `sonnet`, or `haiku` into `spawn_agent`.

This rule is also documented in the GSD skill adapters under `.codex/skills/*/SKILL.md`.

## If You Change Models Later

If you want GSD to use different Codex models in the future, update the `CODEX_MODEL_MAP` in:

- `.codex/get-shit-done/bin/lib/core.cjs`

Recommended process:

1. Decide which Codex model should handle each tier:
   - high reasoning tier
   - standard execution tier
   - budget tier
2. Update `CODEX_MODEL_MAP` so each incoming GSD alias resolves to a supported Codex model.
3. Verify with:

```bash
node .codex/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-planner --raw
node .codex/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-executor --raw
node .codex/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-verifier --raw
```

4. Run at least one GSD command that spawns subagents, such as:

```bash
$gsd-plan-phase
```

If any command starts returning a Claude alias or `inherit` directly while running in Codex, the mapping logic has regressed.

## Config Notes

Project config still uses the normal GSD profile system in `.planning/config.json`, for example:

```json
{
  "model_profile": "inherit"
}
```

That is fine. The important part is that Codex resolves the profile result to valid Codex models before subagents are spawned.

## Overrides

If you use `model_overrides`, the same rule applies:

- Claude-oriented override values must be translated before use in Codex.
- If you introduce direct Codex model IDs in overrides, make sure they are accepted by `spawn_agent`.

## Safe Defaults

If you are unsure what to use, keep:

- `model_profile: "inherit"`
- Codex runtime mapping in `core.cjs`
- Codex skill adapters omitting `model` for `spawn_agent`

That combination is the least fragile setup for this repository.
