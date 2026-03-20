# Model Profile Resolution

Resolve model profile once at the start of orchestration, then use it for all Task spawns.

## Resolution Pattern

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default: `balanced` if not set or config missing.

## Lookup Table

@/Users/fayaa/MyProjects/Trenfy/.codex/get-shit-done/references/model-profiles.md

Look up the agent in the table for the resolved profile. If a runtime needs an explicit model, resolve it to a runtime-valid model ID before spawning:

```
Task(
  prompt="...",
  subagent_type="gsd-planner",
  model="{resolved_model}"  # runtime-valid ID, not a raw Claude alias
)
```

**Note:** Opus-tier agents resolve to `"inherit"` (not `"opus"`). This causes the agent to use the parent session's model, avoiding conflicts with organization policies that may block specific opus versions.

For this repository's OpenCode install, prefer `model_profile: "balanced"` so planner resolves to `openai/gpt-5.4` and executor resolves to `github-copilot/claude-sonnet-4.6`.

## Usage

1. Resolve once at orchestration start
2. Store the profile value
3. Look up each agent's model from the table when spawning
4. Pass model parameter only when needed, and only with a runtime-valid model ID
