# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Verification and Mobile Delivery

**Shipped:** 2026-03-20
**Phases:** 1 | **Plans:** 2 | **Sessions:** 1

### What Was Built
- Active v1.1 REQUIREMENTS.md — reconciled all 59 v1.0 requirement IDs (23 validated, 24 satisfied-evidence-pending, 12 deferred) with correct statuses, correcting the v1.0 archive which wrongly marked CORE-02 and CORE-03 as deferred
- Phase 6 VERIFICATION.md — formally closed CORE-02 (source registry) and CORE-03 (Pydantic models) as SATISFIED using Phase 2 cross-reference evidence; INFRA-03 confirmed satisfied-pending one human NocoDB table check
- Roadmap scope reduction — removed Phases 7 and 8 (Verification Recovery and Mobile App Delivery) to defer them cleanly and then re-scope them for the next milestone

### What Worked
- Cross-referencing existing VERIFICATION.md files (02-VERIFICATION.md, 05-VERIFICATION.md) to close requirements without re-running code was efficient and accurate
- The "satisfied-evidence-pending" status category was the right distinction — it separated code debt from documentation debt cleanly
- Scope reduction via roadmap surgery before milestone completion kept the v1.1 milestone tight and meaningful

### What Was Inefficient
- The v1.0 milestone was archived without correctly reconciling CORE-02 and CORE-03 statuses — this required a full repair phase in v1.1 that could have been avoided with a better milestone-close checklist
- Phase 7 and 8 were created in the roadmap, partially scoped, then removed — this churn (create → remove → re-add next milestone) adds noise to git history

### Patterns Established
- Reconcile carry-over requirement statuses explicitly at the start of each milestone before writing new requirements
- Use `satisfied-evidence-pending` as a first-class status in REQUIREMENTS.md to distinguish code-complete-but-undocumented from truly validated
- Phase removal via `gsd-tools phase remove` is clean; git commit message serves as the historical record

### Key Lessons
1. **Don't archive with wrong statuses.** A 5-minute requirements review at milestone close prevents a full repair phase next milestone.
2. **Evidence-pending ≠ deferred.** Code that exists but lacks a VERIFICATION.md artifact is a documentation task, not a code task — track it separately so it doesn't inflate the backlog.
3. **Scope v1.1 tightly.** A milestone with 1 phase and 2 plans is perfectly valid if the goal is clear and the debt is real. Don't inflate milestones to feel productive.

### Cost Observations
- Sessions: 1
- Notable: The entire v1.1 milestone — requirements reconciliation, phase VERIFICATION.md, roadmap surgery, and milestone archival — was completed in a single session with minimal back-and-forth.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 17 | Initial build — backend pipeline, clients, filtering |
| v1.1 | 1 | 2 | Process repair — requirements traceability reconciliation |

### Cumulative Quality

| Milestone | Validated Reqs | Satisfied-Evidence-Pending | Deferred |
|-----------|----------------|---------------------------|----------|
| v1.0 | 11 | 36 | 12 |
| v1.1 | 23 | 24 | 12 |

### Top Lessons (Verified Across Milestones)

1. **Archive quality determines the next milestone's startup cost.** Both v1.0 and v1.1 demonstrated that sloppy archive state (wrong requirement statuses, missing VERIFICATION.md) becomes immediate work in the next milestone.
2. **Plan scope aggressively, remove what you won't do.** Phases 7 and 8 were roadmapped and then removed twice — front-load the scoping decision before creating the phases.
