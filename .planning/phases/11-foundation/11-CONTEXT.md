# Phase 11: Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Developer can build and run a Trenfy-branded mobile app that fetches live data from the FastAPI backend with no mock data contamination. This phase establishes the branded mobile foundation only; the 3-tab navigation shell, full feed UX, and later consumer flows stay in downstream phases.

</domain>

<decisions>
## Implementation Decisions

### Foundation entry experience
- **D-01:** Phase 11 should open on a single Trenfy foundation screen, not the existing starter welcome flow or tab shell.
- **D-02:** The first screen should feel consumer-facing and product-like, not like an internal setup or smoke-test utility.
- **D-03:** The first screen should fetch live FastAPI data immediately on first render.
- **D-04:** The primary explicit action on the first screen is `Refresh live trends`.
- **D-05:** If the first fetch fails, stay on the same screen with a clear error state and an explicit retry action.

### Branding depth
- **D-06:** Complete the full Trenfy rebrand in Phase 11: app name, slug/scheme, bundle/package identifiers, icon/splash assets, and visible copy.
- **D-07:** Remove all visible starter or white-label language in this phase; no user-facing "WhiteLabel", "white-label", "starter", or similar placeholder copy should remain.
- **D-08:** Preserve the current token architecture, but retune the visual system to Trenfy branding instead of keeping the starter palette as-is.
- **D-09:** First-pass branded assets should be polished enough for demos and UAT, not temporary internal placeholders.
- **D-10:** Use `reactnativereusables.com/docs` as the component and design reference for the rebrand so the Phase 11 foundation follows React Native-native patterns rather than web-only UI guidance.

### Live API handshake surface
- **D-11:** The first screen should visibly render live backend data, not only a binary connection state or console-only proof.
- **D-12:** Show a small preview of 4-6 real trend items from the live API on the foundation screen.
- **D-13:** The live preview itself is the primary visible proof of successful backend wiring; a separate connection-status card is optional, not required.
- **D-14:** The preview should be minimal and resilient, using trusted core fields with graceful fallbacks when some API fields are missing or uneven.

### Scaffold reuse level
- **D-15:** Replace the current starter screens with a much smaller Trenfy foundation surface instead of progressively rewiring the old mock app shell.
- **D-16:** Delete `mockData.ts` and `starterCopy.ts` entirely once replacement UI/data paths exist.
- **D-17:** Intentionally preserve theme tokens and generic UI primitives, but do not preserve starter screen-level composites or mock product flows as implementation anchors.
- **D-18:** Remove the current tab/navigation shell from the active user path in Phase 11 so the phase stays single-screen focused until Phase 12 rebuilds navigation deliberately.

### the agent's Discretion
- Exact copywriting for the Trenfy foundation screen.
- Whether the 4-6 live items are presented as compact cards or a minimal list, as long as the preview stays lightweight and resilient.
- Exact token values, gradients, icon treatment, and spacing choices within the Trenfy brand direction.
- Whether inactive starter screens remain temporarily in the codebase during refactor, as long as they are unreachable and all mock modules are removed by phase completion.

</decisions>

<specifics>
## Specific Ideas

- The first screen should feel like the real Trenfy product already started, not a developer setup surface.
- `Refresh live trends` is the explicit user action that proves the app is live.
- Use `https://reactnativereusables.com/docs` as the primary UI reference for the rebrand direction.
- Prefer an Arabic-friendly typography direction and React Native patterns that can carry forward into future bilingual UI work.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition and milestone constraints
- `.planning/ROADMAP.md` — Phase 11 goal, dependency boundary, and success criteria; keeps this phase limited to branding + live API foundation work.
- `.planning/REQUIREMENTS.md` — `MOBL-01` through `MOBL-05` define the scaffold requirements for branding, FastAPI-only data flow, package installation, and mock-data removal.
- `.planning/PROJECT.md` — v1.3 mobile milestone intent, product direction, and the in-place rebuild of `WhiteLabelApp/` into Trenfy.
- `.planning/STATE.md` — current scaffold state: Expo/RN stack, in-place evolution strategy, and existing FastAPI endpoints available to mobile.

### Mobile implementation research
- `.planning/research/SUMMARY.md` — recommended build order, package set, mock-data purge requirement, and foundation-phase risks.
- `.planning/research/ARCHITECTURE.md` — backend connection strategy, `EXPO_PUBLIC_API_URL` usage, and sequencing between foundation and navigation phases.
- `.planning/research/PITFALLS.md` — scaffold migration pitfalls, including stale mock imports, branding oversights, and starter-screen coupling risks.

### External design references
- `https://reactnativereusables.com/docs` — requested React Native component and design-system reference for the Trenfy rebrand direction.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WhiteLabelApp/src/theme/tokens.ts` — keep the token structure and retune values to the Trenfy brand instead of rebuilding them from scratch.
- `WhiteLabelApp/App.tsx` — current app entry point is the cleanest place to replace the starter welcome flow with a single foundation screen.
- `WhiteLabelApp/src/components/SearchInput.tsx` — reusable generic input styling if a lightweight search/filter affordance survives on the foundation screen.
- `WhiteLabelApp/src/components/FeedCard.tsx` — useful as a visual reference for temporary preview-card composition, but should not dictate the final Trenfy product shape.
- `web/src/api/client.ts` — existing env-based fetch wrapper pattern can guide the mobile API client abstraction.

### Established Patterns
- `WhiteLabelApp/` already uses Expo SDK 53, React Native 0.79.6, React Navigation 7, `SafeAreaProvider`, `GestureHandlerRootView`, and `StyleSheet`-based styling.
- Current starter screens are tightly coupled to `mockData.ts` and `starterCopy.ts`; screen-level reuse is riskier than primitive-level reuse.
- Project-level direction is already set: evolve `WhiteLabelApp/` in place rather than scaffold a separate mobile app.
- Mobile data must flow through FastAPI only; no direct NocoDB calls are allowed.

### Integration Points
- `WhiteLabelApp/app.json` — primary integration point for Trenfy naming, identifiers, icon, splash, and scheme updates.
- `WhiteLabelApp/App.tsx` — first-render integration point for the initial live fetch and console-visible backend proof.
- `WhiteLabelApp/src/navigation/AppNavigator.tsx` — should be taken out of the active user path during Phase 11 so Phase 12 can rebuild navigation cleanly.
- `WhiteLabelApp/src/data/mockData.ts` and `WhiteLabelApp/src/data/starterCopy.ts` — explicit removal targets and completion gates for this phase.
- `process.env.EXPO_PUBLIC_API_URL` / `.env.local` — single control point for redirecting all API traffic.

</code_context>

<deferred>
## Deferred Ideas

- Full 3-tab navigation shell and safe-area-complete tab experience — Phase 12.
- Full trending feed UX, advanced list behavior, and richer consumer interactions beyond the 4-6 item proof preview — downstream feed phases.
- Broader RTL implementation details beyond the Phase 11 brand direction reference — later theming/accessibility work.

</deferred>

---

*Phase: 11-foundation*
*Context gathered: 2026-03-21*
