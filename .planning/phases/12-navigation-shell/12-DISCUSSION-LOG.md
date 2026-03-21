# Phase 12: Navigation Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-21
**Phase:** 12-navigation-shell
**Areas discussed:** Tab labels & icons, Placeholder screen strategy, Category stack params, Tab bar visual style

---

## Tab labels & icons

| Option | Description | Selected |
|--------|-------------|----------|
| Trending Now, Categories, Profile | Matches requirement spec exactly | ✓ |
| Trending, Categories, Profile | Shorter, cleaner on small screens | |
| Feed, Categories, Profile | Feed-centric framing | |

**User's choice:** Trending Now, Categories, Profile

**Follow-up — Icon library:**

| Option | Description | Selected |
|--------|-------------|----------|
| trending-up, grid, person | Ionicons, semantically tight | |
| flame, grid, person | Ionicons, more energy/vibe | |
| pulse, grid, person | Ionicons, matches existing AppNavigator | |
| You decide | Agent picks from Ionicons | |
| Iconify library | streamline-plump:trending-content, si:grid-line, iconamoon:profile-fill | ✓ |

**User's choice:** Iconify library — specific icons: `streamline-plump:trending-content`, `si:grid-line`, `iconamoon:profile-fill`

**Notes:** User specified a custom library (Iconify) outside the presented Ionicons options. Planner must verify Expo SDK 53 compatibility.

---

## Placeholder screen strategy

**Trending Now tab:**

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse FoundationScreen as stub | Wire existing FoundationScreen (live data, Refresh button) into the tab | ✓ |
| Minimal stub, no data | Blank dark screen with centered label | |
| Branded placeholder | Trenfy logo + "Coming soon" | |

**User's choice:** Reuse FoundationScreen as stub

---

**Categories tab:**

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal stub | Blank dark screen with centered "Categories" label | ✓ |
| Skeleton grid | Placeholder grid with empty card shapes | |
| Branded placeholder | Trenfy icon + "Categories coming soon" | |

**User's choice:** Minimal stub

---

**Profile tab:**

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal stub | Blank dark screen with centered "Profile" label | ✓ |
| Pre-built empty states | Stub with user prefs/bookmark areas | |
| Branded placeholder | Avatar area + "Sign in coming soon" | |

**User's choice:** Minimal stub

---

## Category stack params

**CategoryFeed params:**

| Option | Description | Selected |
|--------|-------------|----------|
| categoryId + categoryName | { categoryId: string; categoryName: string } | ✓ |
| Add trendCount too | { categoryId, categoryName, trendCount?: number } | |
| Pass the full object | { category: Category } — full API response object | |

**User's choice:** categoryId + categoryName

---

**CategoryFeed header:**

| Option | Description | Selected |
|--------|-------------|----------|
| Native stack header with categoryName | Standard native header, back button + title | ✓ |
| Custom header inside screen | Hide stack header, build custom | |
| No header | Just back gesture | |

**User's choice:** Native stack header with categoryName

---

## Tab bar visual style

**Height:**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep height 88 | Carry over from existing AppNavigator | ✓ |
| Compact: 64 + inset | height 64 + safe-area inset bottom | |
| Auto / let agent decide | No manual height override | |

**User's choice:** Keep height 88

---

**Background and border:**

| Option | Description | Selected |
|--------|-------------|----------|
| Surface with border-top | colors.surface + colors.border top | ✓ |
| Frosted / blur effect | expo-blur transparent background | |
| Dark background match | colors.background (#0A0F1E) | |

**User's choice:** Surface with border-top

---

## Follow-up: reactnativereusables.com

| Option | Description | Selected |
|--------|-------------|----------|
| Same direction as Phase 11 | Follow patterns from reactnativereusables.com/docs, no specific page | ✓ |
| Specifically navigation patterns | Reference navigation-specific patterns | |
| Not required here | General RN patterns only | |

**User's choice:** Same direction as Phase 11

---

## the agent's Discretion

- Exact paddingTop / paddingBottom within height-88 constraint
- Stub screen label typography token choice
- TypeScript navigator type file structure (single vs split)
- CategoryListScreen stub content
- Iconify package selection (Expo SDK 53 compatibility check)

## Deferred Ideas

None — discussion stayed within phase scope.
