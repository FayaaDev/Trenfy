# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 - Web Admin + Demo Feed

**Shipped:** 2026-03-21
**Phases:** 4 | **Plans:** 16 | **Sessions:** 2

### What Was Built
- Backend moderation contract for trend status, trend PATCH/DELETE, source PATCH, and explicit CORS allowlisting.
- React web frontend scaffold with typed API client, admin auth gate, routed admin shell, and the final `localhost:8080` proxy contract.
- Admin moderation workflows for trends, sources, and categories, including optimistic mutations and bulk actions.
- Public approved-only `/demo` feed with filters, load-more pagination, responsive cards, and Arabic translation support.

### What Worked
- Splitting the milestone into backend-readiness, scaffold, admin, and demo phases kept the backend/frontend dependency chain easy to reason about.
- Reusing a single moderation `status` contract across API, admin UI, and demo feed reduced duplicated logic and made approval behavior predictable.
- Locking the default frontend API path to relative `/api` with a documented override avoided local-env drift while still supporting non-default backends.

### What Was Inefficient
- No milestone audit was run before archive, so release confidence still depended on manual inspection instead of a formal gate.
- The active `REQUIREMENTS.md` file remained at `0/49` complete until archive time, creating unnecessary closeout work and a misleading live status signal.
- `WEB-02` went stale during execution because the written requirement still pinned Tailwind v3 after current shadcn tooling had moved to Tailwind v4.

### Patterns Established
- Put shared backend contracts in place before building admin and public surfaces that depend on them.
- Capture requirement adjustments during execution, not only at archive time, when tooling constraints or delivery trade-offs shift.
- Keep local web proxy expectations explicit in both code and docs as soon as frontend work begins.

### Key Lessons
1. **Milestone audits need to happen before archive, not during it.** Skipping the audit turns milestone close into a judgment call instead of a pass/fail gate.
2. **Live traceability has to move with the work.** A stale requirements file erodes trust in planning docs even when the code shipped cleanly.
3. **Version-sensitive frontend requirements age fast.** Lock package-version assumptions only when they match the current toolchain, or expect archive-time adjustments.

### Cost Observations
- Sessions: 2
- Notable: The milestone moved from backend contracts to full web delivery in about half a day of elapsed time, but the closeout still paid a documentation tax because audit and traceability updates lagged behind implementation.

---

## Milestone: v1.1 - Verification and Mobile Delivery

**Shipped:** 2026-03-20
**Phases:** 1 | **Plans:** 2 | **Sessions:** 1

### What Was Built
- Active v1.1 REQUIREMENTS.md - reconciled all 59 v1.0 requirement IDs (23 validated, 24 satisfied-evidence-pending, 12 deferred) with correct statuses, correcting the v1.0 archive which wrongly marked CORE-02 and CORE-03 as deferred
- Phase 6 VERIFICATION.md - formally closed CORE-02 (source registry) and CORE-03 (Pydantic models) as SATISFIED using Phase 2 cross-reference evidence; INFRA-03 confirmed satisfied-pending one human NocoDB table check
- Roadmap scope reduction - removed Phases 7 and 8 (Verification Recovery and Mobile App Delivery) to defer them cleanly and then re-scope them for the next milestone

### What Worked
- Cross-referencing existing VERIFICATION.md files (02-VERIFICATION.md, 05-VERIFICATION.md) to close requirements without re-running code was efficient and accurate
- The `satisfied-evidence-pending` status category was the right distinction - it separated code debt from documentation debt cleanly
- Scope reduction via roadmap surgery before milestone completion kept the v1.1 milestone tight and meaningful

### What Was Inefficient
- The v1.0 milestone was archived without correctly reconciling CORE-02 and CORE-03 statuses - this required a full repair phase in v1.1 that could have been avoided with a better milestone-close checklist
- Phase 7 and 8 were created in the roadmap, partially scoped, then removed - this churn (create -> remove -> re-add next milestone) adds noise to git history

### Patterns Established
- Reconcile carry-over requirement statuses explicitly at the start of each milestone before writing new requirements
- Use `satisfied-evidence-pending` as a first-class status in REQUIREMENTS.md to distinguish code-complete-but-undocumented from truly validated
- Phase removal via `gsd-tools phase remove` is clean; git commit message serves as the historical record

### Key Lessons
1. **Don't archive with wrong statuses.** A 5-minute requirements review at milestone close prevents a full repair phase next milestone.
2. **Evidence-pending != deferred.** Code that exists but lacks a VERIFICATION.md artifact is a documentation task, not a code task - track it separately so it doesn't inflate the backlog.
3. **Scope v1.1 tightly.** A milestone with 1 phase and 2 plans is perfectly valid if the goal is clear and the debt is real. Don't inflate milestones to feel productive.

### Cost Observations
- Sessions: 1
- Notable: The entire v1.1 milestone - requirements reconciliation, phase VERIFICATION.md, roadmap surgery, and milestone archival - was completed in a single session with minimal back-and-forth.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 17 | Initial build - backend pipeline, clients, filtering |
| v1.1 | 1 | 2 | Process repair - requirements traceability reconciliation |
| v1.2 | 4 | 16 | Product expansion - moderation backend, web admin, public demo feed |

### Requirements Closure Quality

| Milestone | Validated | Adjusted | Satisfied-Evidence-Pending | Deferred |
|-----------|-----------|----------|----------------------------|----------|
| v1.0 | 11 | 0 | 36 | 12 |
| v1.1 | 23 | 0 | 24 | 12 |
| v1.2 | 47 | 2 | 0 | 0 |

### Top Lessons (Verified Across Milestones)

1. **Archive quality determines the next milestone's startup cost.** Both v1.0 and v1.1 demonstrated that sloppy archive state (wrong requirement statuses, missing VERIFICATION.md) becomes immediate work in the next milestone.
2. **Plan scope aggressively, remove what you won't do.** Phases 7 and 8 were roadmapped and then removed twice - front-load the scoping decision before creating the phases.
3. **Keep live planning docs honest while implementation is moving.** v1.2 showed that shipping code faster than traceability updates creates avoidable closeout debt even when the implementation succeeds.
