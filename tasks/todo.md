# Start New Milestone

- [x] Review current planning context (`PROJECT.md`, `MILESTONES.md`, `STATE.md`, workflow init)
- [ ] Gather milestone goals from user and confirm version/name
- [ ] Update `.planning/PROJECT.md` with current milestone scope and active requirements
- [ ] Reset `.planning/STATE.md` for milestone planning and commit planning docs
- [ ] Run milestone research if selected and synthesize outputs under `.planning/research/`
- [ ] Define scoped milestone requirements in `.planning/REQUIREMENTS.md` and commit
- [ ] Create `.planning/ROADMAP.md`, update traceability, get approval, and commit

## Notes

- Last shipped milestone: `v1.2 Web Admin + Demo Feed` on 2026-03-21.
- Existing deferred themes already called out in project docs: React Native app delivery, verification debt closure, and deciding web/admin maintenance scope.
- Default phase numbering mode will continue from the previous milestone unless `--reset-phase-numbers` is explicitly requested.

## Review

- In progress.

## Expo Key Warning Investigation

- [x] Locate the `VirtualizedList` render path in the React Native app.
- [in_progress] Trace the list item identity from backend response to `FlatList.keyExtractor`.
- [ ] Fix the mobile trend model or response normalization so list items always have a stable unique key.
- [ ] Verify the warning is eliminated with a bundle/build check and document the root cause.
