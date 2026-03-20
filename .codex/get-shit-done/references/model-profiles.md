# Model Profiles

Model profiles control which subagent model each GSD agent uses. In Claude-native runtimes this maps to Claude models directly. In non-Claude runtimes, GSD should either omit `model` when spawning subagents or resolve to runtime-supported model IDs.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` | `inherit` |
|-------|-----------|------------|----------|-----------|
| gsd-planner | opus | opus | sonnet | inherit |
| gsd-roadmapper | opus | sonnet | sonnet | inherit |
| gsd-executor | opus | sonnet | sonnet | inherit |
| gsd-phase-researcher | opus | sonnet | haiku | inherit |
| gsd-project-researcher | opus | sonnet | haiku | inherit |
| gsd-research-synthesizer | sonnet | sonnet | haiku | inherit |
| gsd-debugger | opus | sonnet | sonnet | inherit |
| gsd-codebase-mapper | sonnet | haiku | haiku | inherit |
| gsd-verifier | sonnet | sonnet | haiku | inherit |
| gsd-plan-checker | sonnet | sonnet | haiku | inherit |
| gsd-integration-checker | sonnet | sonnet | haiku | inherit |
| gsd-nyquist-auditor | sonnet | sonnet | haiku | inherit |

## Profile Philosophy

**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Use when: conserving quota, high-volume work, less critical phases

**inherit** - Follow the current session model when the runtime supports true inheritance
- Claude-native runtimes resolve agents to `inherit`
- Codex should omit the `model` parameter entirely when translating `Task(...)` to `spawn_agent(...)`
- OpenCode should prefer `balanced` in this repository so planner resolves to `openai/gpt-5.4` while execution and standard agents resolve to `github-copilot/claude-sonnet-4.6`
- Best when you switch models interactively and the runtime can omit `model`
- Use when: you want GSD to follow your currently selected runtime model

## Using Non-Anthropic Models (OpenRouter, Local, etc.)

If you're using Claude Code with OpenRouter, a local model, or any non-Anthropic provider, set the `inherit` profile to prevent GSD from calling Anthropic models for subagents.

For this repository's OpenCode install, use `balanced` instead so the planner and executor split stays pinned correctly:

```bash
# Via settings command
$gsd-settings
# → Select "Balanced" for model profile

# Or manually in .planning/config.json
{
  "model_profile": "balanced"
}
```

In OpenCode, the runtime resolver translates those profile aliases to provider/model IDs instead of leaving them as raw Claude aliases.

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Check model_overrides for agent-specific override
3. If no override, look up agent in profile table
4. Claude-native runtimes: pass model parameter to Task call
5. Codex/OpenCode: if a model must be materialized, map it to a valid runtime model ID
```

## Per-Agent Overrides

Override specific agents without changing the entire profile:

```json
{
  "model_profile": "balanced",
  "model_overrides": {
    "gsd-executor": "opus",
    "gsd-planner": "haiku"
  }
}
```

Overrides take precedence over the profile. Claude-oriented values are `opus`, `sonnet`, `haiku`, `inherit`. In Codex/OpenCode, these should be omitted at spawn time or translated to supported runtime model IDs.

## Switching Profiles

Runtime: `$gsd-set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Design Rationale

**Why Opus for gsd-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for gsd-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for verifiers in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the phase promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for gsd-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.

**Why `inherit` instead of passing `opus` directly?**
Claude Code's `"opus"` alias maps to a specific model version. Organizations may block older opus versions while allowing newer ones. GSD returns `"inherit"` for opus-tier agents, causing them to use whatever opus version the user has configured in their session. This avoids version conflicts and silent fallbacks to Sonnet.

**Why `balanced` for this repository's OpenCode setup?**
It preserves GSD's intent: planning agents stay on the stronger reasoning model while execution, research, and verification stay on the faster coding model. Here that means `openai/gpt-5.4` for planner-tier work and `github-copilot/claude-sonnet-4.6` for sonnet/haiku-tier work.

**Why does Codex need different handling?**
Codex `spawn_agent` only accepts Codex-supported GPT model IDs. Passing Claude-oriented values like `inherit`, `opus`, `sonnet`, or `haiku` can fail with errors such as `Model not found: inherit/.`
