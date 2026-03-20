# Trenfy Roadmap

## Milestones

- ✅ v1.0 MVP - Phases 1-5 shipped 2007-03-20 (`.planning/milestones/v1.0-ROADMAP.md`)
- 🚧 v1.1 Verification and Mobile Delivery - Phases 6-8 planned

## Current Milestone Scope (v1.1)

- [x] Phase 6: Requirements Baseline Repair (2 plans) (completed 2026-03-20)
- [ ] Phase 7: Verification Recovery and Backend Flow Closure (0 plans)
- [ ] Phase 8: Mobile App Delivery and E2E Validation (0 plans)

### Phase 6: Requirements Baseline Repair

**Goal**: Establish the active v1.1 requirements baseline and close CORE-02, CORE-03, and INFRA-03 with verified evidence references
**Depends on**: Phase 5 (complete)
**Requirements**: REQ-601, REQ-602, REQ-603
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Create v1.1 REQUIREMENTS.md and update ROADMAP Phase 6 entry
- [ ] 06-02-PLAN.md — Create Phase 6 VERIFICATION.md closing CORE-02, CORE-03, INFRA-03

### Phase 7: Verification Recovery and Backend Flow Closure

**Goal**: Produce missing VERIFICATION.md artifacts for Phases 1, 3, and 4, close CLEN/PLAT/API/INFRA orphaned requirements, and deliver a milestone integration report proving the end-to-end scheduler→fetch→persist→API flow
**Depends on**: Phase 6
**Requirements**: REQ-701, REQ-702, REQ-703, REQ-704, REQ-705
**Plans**: To be planned

### Phase 8: Mobile App Delivery and E2E Validation

**Goal**: Deliver the React Native Expo app (APP-01..APP-12) with full feature implementation and E2E backend-to-mobile flow validation
**Depends on**: Phase 7
**Requirements**: REQ-801 through REQ-812
**Plans**: To be planned

## Notes

- v1.0 shipped with accepted audit gaps; see `.planning/milestones/v1.0-MILESTONE-AUDIT.md`.
- Active v1.1 requirements tracked in `.planning/REQUIREMENTS.md`.
- Start fresh milestone requirements with `/gsd-new-milestone`.
