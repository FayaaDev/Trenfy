# Architecture Research: React Native Mobile App

**Domain:** React Native consumer app over existing FastAPI/NocoDB backend
**Researched:** 2026-03-21
**Confidence:** HIGH

---

## Integration With Existing Backend

### Connection Strategy

The mobile app connects to the same FastAPI backend already running on port 8080. No backend changes are required for read-only consumption — the `/api/trends` endpoint already supports all needed filters (`platform`, `category`, `region_code`, `q`, `status`, `cursor`).

**Base URL resolution:**

| Environment | Base URL | How to configure |
|-------------|----------|-----------------|
| Local dev (Expo Go) | `http://192.168.x.x:8080` | `EXPO_PUBLIC_API_URL` in `.env.local` |
| Local dev (iOS Simulator) | `http://localhost:8080` | Same env var |
| Production | `https://api.trenfy.app` (or Docker host) | Same env var, different value |

Expo's build system exposes `EXPO_PUBLIC_*` variables at build time, same concept as Vite's `VITE_*`. The app client reads `process.env.EXPO_PUBLIC_API_URL`.

**CORS is already handled** — the backend's `_cors_origins()` function reads `CORS_ORIGINS` env var. Add the production mobile API base URL there if needed. For local Expo development, no CORS applies (native HTTP, not browser).

### What the Mobile App Reads

```
GET /api/trends                → Trending Now feed (paginated via cursor)
GET /api/trends?status=approved → Public consumer feed (approved only)
GET /api/trends?category=X    → Category drill-down feed
GET /api/trends?q=search      → Search
GET /api/trends/stats          → Stats for hero metrics
GET /api/trends/{id}           → Single trend detail (optional, for deep link)
GET /api/trends/mockup?limit=6 → Category previews grid
```

The mobile app is **read-only**. No PATCH/DELETE/POST endpoints needed from the consumer app. Bookmarks are stored locally only (v1.3 scope; backend sync deferred per PROJECT.md).

### Trend Shape (from contracts.py + routes/trends.py)

```typescript
interface Trend {
  id: string;
  title: string;
  ar_translation?: string;       // Arabic title
  description?: string;
  url?: string;                  // tap-to-source
  thumbnail_url?: string;
  platform: 'youtube' | 'x';
  category?: string;
  region_code?: string;
  metric_type?: string;
  metric_value?: number;
  status: 'pending' | 'approved' | 'rejected';
  fetched_at?: string;
  published_date?: string;
}

interface TrendsListResponse {
  items: Trend[];
  paging: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  };
}
```

**Always filter `status=approved`** in the mobile app. The consumer should never see pending/rejected trends.

---

## Navigation Structure

### Tab Navigator → Nested Stack Pattern

The existing AppNavigator uses 4 tabs (Home, Library, Activity, Profile) with no stack nesting. The Trenfy app needs 3 tabs where the Categories tab has a nested stack for drill-down.

**Rename strategy: refactor in place.** The WhiteLabelApp scaffold already has React Navigation 7 + bottom-tabs + native-stack installed. The approach is:
1. Rename `AppNavigator.tsx` tabs: Home→TrendingNow, Library→Categories, Activity removed, Profile kept.
2. Wrap Categories in a stack navigator for drill-down.
3. Delete unused screens (ActivityScreen, LibraryScreen) and replace with new ones.
4. Keep existing theme/tokens intact — they're well-structured.

```
NavigationContainer
└── BottomTabNavigator (RootTabParamList)
    ├── TrendingNow tab → TrendingStack
    │   └── NativeStack (TrendingStackParamList)
    │       ├── TrendingScreen          ← FlashList feed + filter header
    │       └── TrendDetailScreen       ← tap-to-source modal/screen (optional)
    │
    ├── Categories tab → CategoriesStack
    │   └── NativeStack (CategoriesStackParamList)
    │       ├── CategoriesScreen        ← category grid with counts + previews
    │       └── CategoryFeedScreen      ← filtered feed for one category
    │
    └── Profile tab → ProfileStack
        └── NativeStack (ProfileStackParamList)
            ├── ProfileScreen           ← sign-in CTA, preferences, bookmarks list
            └── BookmarksScreen         ← full bookmarked trends list (optional)
```

### TypeScript Param Lists

```typescript
// navigation/types.ts

export type RootTabParamList = {
  TrendingNow: undefined;
  Categories: undefined;
  Profile: undefined;
};

export type TrendingStackParamList = {
  TrendingScreen: undefined;
  TrendDetail: { trendId: string };  // optional; can open URL directly
};

export type CategoriesStackParamList = {
  CategoriesScreen: undefined;
  CategoryFeed: { category: string; categoryLabel: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Bookmarks: undefined;
};
```

### Navigation File Structure

```
src/navigation/
├── AppNavigator.tsx          ← REPLACE: 3-tab navigator
├── TrendingStack.tsx         ← NEW: stack wrapper for TrendingNow tab
├── CategoriesStack.tsx       ← NEW: stack wrapper for Categories tab
├── ProfileStack.tsx          ← NEW: stack wrapper for Profile tab
└── types.ts                  ← NEW: all param list types
```

### Header Strategy

- Tab screens: `headerShown: false` on the stack, each screen manages its own sticky header via `SafeAreaView` + custom `View`. This gives full control over the collapsible filter header on TrendingNow.
- CategoryFeed: Use the native stack header (simple back navigation + category name as title). This is the simplest approach and avoids re-implementing nav chrome.

---

## State Management

### Decision: No Global Store (Zustand/Redux) — Context + TanStack Query

For a 3-tab consumer app with optional auth, global state needs are narrow. The right split is:

| Concern | Where | Rationale |
|---------|-------|-----------|
| Server data (trends, categories) | TanStack Query cache | Handles fetch, cache, stale, pagination, background refetch |
| Active filter state (platform, category chips, region, search) | Local `useState` in TrendingScreen | Only TrendingScreen needs it; no cross-screen sharing |
| Bookmarks (IDs) | MMKV + `BookmarksContext` | Persisted; read by Profile/Bookmarks screen and TrendCard bookmark button |
| User preferences (dark mode override, region pref) | MMKV + `PrefsContext` | Persisted; read by any screen |
| Auth state (user object, token) | `AuthContext` | Global; read by Profile tab and optionally future personalization |
| Category drill-down target | Navigation params | Passed via `navigation.navigate('CategoryFeed', { category })` — no store needed |

**Two React Contexts are sufficient:**

```typescript
// context/BookmarksContext.tsx
// Provides: bookmarkIds: Set<string>, toggleBookmark(id), isBookmarked(id)
// Storage: MMKV key 'bookmarks' → JSON.stringify([...ids])

// context/AuthContext.tsx  
// Provides: user: UserProfile | null, signIn(), signOut(), isLoading: boolean
// Storage: MMKV key 'auth_token' (optional social sign-in token)

// context/PrefsContext.tsx (optional, light)
// Provides: regionPref: string | null, setRegionPref()
// Storage: MMKV key 'prefs' → JSON object
```

### Why Not Zustand?

A Zustand store would be appropriate if: (a) multiple screens need to share live mutation state, (b) undo/redo is needed, or (c) there are >5 cross-cutting concerns. This app doesn't qualify. Contexts are simpler, colocate with their persistence logic, and have zero setup overhead.

### Filter State Pattern (TrendingNow)

```typescript
// screens/TrendingScreen.tsx — local state only
const [filters, setFilters] = useState<TrendFilters>({
  platform: null,
  category: null,
  region: null,
  search: '',
});
// Passed to useTrends(filters) hook
```

Filters are **not persisted between sessions** (v1.3 scope). If persistence is added later, it's a one-line change: swap `useState` for a MMKV-backed hook.

---

## Data Fetching Strategy

### TanStack Query v5 (Recommended)

TanStack Query v5 is the right choice over raw fetch or SWR for this app:

- **Cursor-based infinite scroll**: `useInfiniteQuery` with `getNextPageParam` maps directly to the backend's `cursor`/`has_more` contract.
- **Background stale refetch**: trends data should refresh when the user returns to the feed tab — built in.
- **Deduplication**: multiple components can call the same query key without duplicate requests.
- **FlashList integration**: `useInfiniteQuery` + `onEndReached` → `fetchNextPage` is the standard pattern.
- **Works with Expo SDK 53 / React 19**: TanStack Query v5 is React 19 compatible.

**Installation additions to package.json:**

```bash
npx expo install @tanstack/react-query
# MMKV requires a dev build (not Expo Go)
npx expo install react-native-mmkv
# or AsyncStorage (works in Expo Go, slower)
npx expo install @react-native-async-storage/async-storage
# FlashList
npx expo install @shopify/flash-list
```

### API Client Layer

```
src/api/
├── client.ts          ← base fetch wrapper (baseURL, default headers)
├── trends.ts          ← fetchTrends(params), fetchTrend(id), fetchStats()
├── categories.ts      ← fetchCategories() → derived from /api/trends/mockup
└── types.ts           ← Trend, TrendsListResponse, TrendFilters interfaces
```

**client.ts pattern:**

```typescript
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}
```

### Query Hooks

```
src/hooks/
├── useTrends.ts        ← useInfiniteQuery for feed + filters
├── useTrend.ts         ← useQuery for single trend detail
├── useCategories.ts    ← useQuery for categories grid data
├── useStats.ts         ← useQuery for hero stats
└── useBookmarkedTrends.ts ← fetches full trend objects for saved IDs
```

**useTrends.ts pattern:**

```typescript
export function useTrends(filters: TrendFilters) {
  return useInfiniteQuery({
    queryKey: ['trends', filters],
    queryFn: ({ pageParam }) => fetchTrends({ ...filters, cursor: pageParam, status: 'approved' }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.paging.has_more ? lastPage.paging.next_cursor : undefined,
    staleTime: 2 * 60 * 1000,   // 2 min — trends don't change by the second
    gcTime: 10 * 60 * 1000,     // keep in cache 10 min
  });
}
```

### Caching Policy

| Data | staleTime | gcTime | Rationale |
|------|-----------|--------|-----------|
| Trends feed | 2 min | 10 min | Trends update periodically, not real-time |
| Category grid | 5 min | 15 min | Category list is stable |
| Stats | 1 min | 5 min | Hero metrics refresh more often |
| Single trend | 5 min | 15 min | Detail view; rarely changes |

### Pagination (Cursor-based Infinite Scroll)

The backend uses base64-encoded cursor objects. The mobile client treats them as opaque strings. Pattern:

```
Initial load:  GET /api/trends?status=approved&limit=20
Next page:     GET /api/trends?status=approved&limit=20&cursor=<next_cursor>
```

FlashList `onEndReached` triggers `fetchNextPage()`. Show a footer spinner when `isFetchingNextPage` is true.

---

## Local Persistence

### MMKV vs AsyncStorage

**Use MMKV** for all local persistence except for Expo Go development:

| | MMKV | AsyncStorage |
|---|------|--------------|
| Speed | Synchronous reads (C++) | Always async |
| Dev build required | YES | No (Expo Go compatible) |
| Use case | Production app | Prototyping only |

**Decision:** Use MMKV for production. During early prototyping in Expo Go, use AsyncStorage behind an abstraction so the swap is one file change.

**Abstraction layer:**

```typescript
// storage/storage.ts — swap the implementation here only
import { MMKV } from 'react-native-mmkv';
export const storage = new MMKV();

// Helper wrappers (keeps callers clean)
export const store = {
  get: <T>(key: string): T | null => {
    const raw = storage.getString(key);
    return raw ? JSON.parse(raw) : null;
  },
  set: (key: string, value: unknown) => {
    storage.set(key, JSON.stringify(value));
  },
  delete: (key: string) => storage.delete(key),
};
```

### What Gets Persisted

| Key | Type | Content | Context |
|-----|------|---------|---------|
| `bookmarks` | `string[]` | Array of trend IDs | BookmarksContext |
| `prefs.region` | `string \| null` | Default region filter | PrefsContext |
| `prefs.notifications` | `boolean` | Future push opt-in | PrefsContext |
| `auth.token` | `string \| null` | Social sign-in token | AuthContext |
| `auth.user` | `UserProfile \| null` | Cached user object | AuthContext |

### Bookmark Flow

```
User taps bookmark icon on TrendCard
  → BookmarksContext.toggleBookmark(trend.id)
  → Update Set<string> in memory
  → Persist to MMKV: store.set('bookmarks', [...bookmarkIds])
  → TrendCard re-renders with filled bookmark icon (via isBookmarked(id))

Profile/Bookmarks screen
  → BookmarksContext.bookmarkIds
  → useBookmarkedTrends(bookmarkIds) → fetch individual trends by ID
  → or: keep full trend objects in storage (simpler, ~2KB per trend)
```

**Recommendation:** Store full trend objects alongside IDs (key: `bookmarked_trends`). Avoids N+1 API calls when opening the Bookmarks screen offline. Max ~200 bookmarks × 2KB = 400KB — well within MMKV limits.

---

## Auth State Management

### Scope: Local-First, Optional Social Sign-In

Per PROJECT.md: "Auth backend for synced saves/preferences — social sign-in local-first in v1.3; backend sync deferred."

This means:
- Sign-in is **optional** — the app is fully usable without an account.
- Auth state is only needed to show/personalize the Profile tab.
- No token is sent to the Trenfy backend (it has no auth endpoints in v1.3).
- Google Sign-In and Apple Sign-In are the two providers.

### Auth Libraries (Expo SDK 53)

```bash
npx expo install expo-auth-session expo-web-browser
# For Google:
npx expo install @react-native-google-signin/google-signin
# For Apple (iOS only):
npx expo install expo-apple-authentication
```

`expo-auth-session` handles the OAuth browser flow. `expo-apple-authentication` provides the native Apple Sign In button (required by App Store guidelines when offering social sign-in on iOS).

### AuthContext Pattern

```typescript
interface UserProfile {
  id: string;         // from provider
  name: string;
  email?: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;     // true while reading MMKV on app startup
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => void;
}
```

**Auth state machine:**

```
App start
  → AuthContext reads MMKV auth.user
  → isLoading: true → false
  → user: null (not signed in) or UserProfile (persisted session)

User taps "Sign in with Google"
  → expo-auth-session opens browser
  → OAuth callback → parse user info from ID token
  → store.set('auth.user', userProfile)
  → AuthContext.user updated → Profile tab shows avatar + name

User taps Sign Out
  → store.delete('auth.user'), store.delete('auth.token')
  → AuthContext.user = null
  → Profile tab shows sign-in CTA
```

### Profile Tab Behavior

- **Unauthenticated:** Shows sign-in buttons (Google, Apple), lists public bookmarks (locally saved, no account needed).
- **Authenticated:** Shows avatar, name, bookmarks list, preferences toggles. No server-side personalization in v1.3.

---

## WhiteLabelApp Evolution Strategy

### Decision: Refactor In Place (NOT a clean separation)

**Rationale:** Creating a new directory alongside WhiteLabelApp adds package.json/config duplication, shared type drift, and CI complexity for no benefit. The scaffold already has the right dependencies. Refactoring in place is the right call.

**What to keep (minimal changes):**
- `src/theme/tokens.ts` — well-structured, extend with dark mode tokens
- `src/components/SearchInput.tsx` — reusable as-is
- `src/components/SheetModal.tsx` — reusable as-is
- `src/components/SectionHeader.tsx` — reusable as-is
- `react-navigation` setup in AppNavigator.tsx — restructure, not rewrite
- `package.json` dep versions (Expo 53, RN 0.79.6, React 19, RN Navigation 7)

**What to replace:**
- All 4 screen files → new Trenfy screens
- `AppNavigator.tsx` → new 3-tab + nested stack structure
- `src/types/index.ts` → new Trend types (keep, extend)
- `src/data/mockData.ts` → delete (replace with API-driven data)
- `src/data/starterCopy.ts` → delete (replace with Trenfy copy)
- Package name in `package.json`: `"name": "trenfy"` (cosmetic)
- App name in `app.json`: `"name": "Trenfy"`

**What to add:**
- `src/api/` — API client layer
- `src/hooks/` — TanStack Query hooks
- `src/context/` — BookmarksContext, AuthContext, PrefsContext
- `src/storage/` — MMKV abstraction
- `@tanstack/react-query`, `@shopify/flash-list`, `react-native-mmkv`
- `expo-auth-session`, `expo-apple-authentication`

**Rename cosmetically but don't move the directory.** The folder name `WhiteLabelApp/` is irrelevant to the running app — `app.json` controls the display name and bundle ID.

---

## Full System Architecture (v1.3 State)

```
┌────────────────────────────────────────────────────────────────────┐
│                React Native Mobile App (WhiteLabelApp/)             │
├──────────────────────────────┬─────────────────────────────────────┤
│   TrendingNow Tab            │  Categories Tab  │  Profile Tab      │
│   TrendingStack              │  CategoriesStack │  ProfileStack     │
│   ┌────────────────────┐     │  ┌─────────────┐ │  ┌────────────┐  │
│   │ TrendingScreen     │     │  │ CategoryGrid│ │  │ProfileView │  │
│   │ + FlashList        │     │  │ + previews  │ │  │+ Bookmarks │  │
│   │ + FilterHeader     │     │  └──────┬──────┘ │  │+ Sign In   │  │
│   └────────────────────┘     │         ↓        │  └────────────┘  │
│                              │  ┌─────────────┐ │                  │
│                              │  │CategoryFeed │ │                  │
│                              │  │(filtered)   │ │                  │
│                              │  └─────────────┘ │                  │
├──────────────────────────────┴──────────────────┴──────────────────┤
│              TanStack Query (cache, pagination, background sync)     │
├────────────────────────────────────────────────────────────────────┤
│              React Contexts (Bookmarks, Auth, Prefs)                │
├────────────────────────────────────────────────────────────────────┤
│              MMKV Storage (bookmarks, prefs, auth token)            │
├────────────────────────────────────────────────────────────────────┤
│              API Client (src/api/) → fetch wrapper                  │
└──────────────────────┬─────────────────────────────────────────────┘
                       │ HTTP (EXPO_PUBLIC_API_URL)
┌──────────────────────▼─────────────────────────────────────────────┐
│              FastAPI backend (port 8080 / Docker)                   │
│  GET /api/trends?status=approved&cursor=...&category=...            │
│  GET /api/trends/stats                                              │
│  GET /api/trends/mockup?limit=6                                     │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────────────┐
│              NocoDB (nocodb.fayaa92.sa)                             │
│              Trenfy table (status, platform, category, etc.)        │
└────────────────────────────────────────────────────────────────────┘

  React Web Admin (web/) — unchanged, separate consumer on same backend
```

---

## Suggested Build Order

Phase sequence respects dependency chain: you can't build a UI component before its data layer, and you can't build features before navigation is settled.

### Phase 1 — Foundation (no UI)
**Goal:** Get data flowing before building any screens.

1. Rename package/app metadata (`package.json`, `app.json`)
2. Install new dependencies: `@tanstack/react-query`, `@shopify/flash-list`, `react-native-mmkv`
3. Write `src/api/client.ts` + `src/api/trends.ts` (typed fetch wrappers)
4. Write `src/api/types.ts` (Trend interface aligned to backend contracts)
5. Set up `QueryClientProvider` in `App.tsx`
6. Write `src/storage/storage.ts` (MMKV abstraction)
7. Wire `EXPO_PUBLIC_API_URL` in `.env.local`

**Validation:** `useTrends()` hook returns real data in a test screen. No UI polish needed.

### Phase 2 — Navigation Shell
**Goal:** 3-tab structure in place, screens are stubs.

1. Rewrite `AppNavigator.tsx` → 3-tab navigator
2. Create `TrendingStack.tsx`, `CategoriesStack.tsx`, `ProfileStack.tsx`
3. Create stub screens for all 6 destinations
4. Create `navigation/types.ts` with all param lists

**Validation:** All 3 tabs navigable. Category drill-down navigates to stub screen with correct params.

### Phase 3 — Trending Now Feed
**Goal:** Core consumer experience working.

1. `useTrends(filters)` hook with `useInfiniteQuery`
2. `TrendCard` component (new — replaces FeedCard; shows thumbnail, title, ar_translation, platform icon, metric, category badge)
3. `FilterHeader` component (platform chips, category chips, region chip — collapsible)
4. `TrendingScreen` with FlashList, FilterHeader, pull-to-refresh, infinite scroll, search
5. `BookmarksContext` + MMKV persistence
6. Bookmark icon on TrendCard

**Validation:** Feed loads, filters work, infinite scroll pages, bookmark persists across app restart.

### Phase 4 — Categories Tab
**Goal:** Category discovery + drill-down.

1. `useCategories()` hook (derive from `/api/trends/mockup` or unique category values)
2. `CategoryCard` component (name, trend count, top trend preview)
3. `CategoriesScreen` with category grid
4. `CategoryFeedScreen` reuses TrendingScreen with pre-set category filter

**Validation:** Category grid shows real data. Tapping a category navigates to a filtered feed of real trends.

### Phase 5 — Profile + Auth
**Goal:** Auth and preferences working.

1. `AuthContext` with MMKV persistence
2. `expo-auth-session` + `expo-apple-authentication` integration
3. `ProfileScreen` (unauthenticated: sign-in CTAs; authenticated: avatar, name)
4. `BookmarksScreen` (list of bookmarked trends fetched from API)
5. `PrefsContext` with region preference

**Validation:** Google/Apple sign-in flow works. Profile shows user info after sign-in. Bookmarks screen loads bookmarked trend details.

### Phase 6 — Polish
**Goal:** Dark mode, RTL, error states, empty states.

1. Dark mode via `useColorScheme()` + token variants
2. RTL support for Arabic `ar_translation` field (right-align Arabic text)
3. Error boundaries and network error UI
4. Empty state illustrations
5. Loading skeletons on TrendCard

**Validation:** App looks complete in both light/dark. Arabic text renders correctly RTL.

---

## New vs Modified Components

| Component/File | Status | Notes |
|----------------|--------|-------|
| `AppNavigator.tsx` | **REPLACE** | 4-tab WhiteLabel → 3-tab Trenfy with nested stacks |
| `HomeScreen.tsx` | **REPLACE** | → `TrendingScreen.tsx` (API-driven FlashList) |
| `LibraryScreen.tsx` | **REPLACE** | → `CategoriesScreen.tsx` |
| `ActivityScreen.tsx` | **DELETE** | No activity feed in v1.3 |
| `ProfileScreen.tsx` | **REPLACE** | Mock data → auth-aware real profile |
| `FeedCard.tsx` | **REPLACE** | → `TrendCard.tsx` (new shape: thumbnail, platform icon, metric) |
| `SearchInput.tsx` | **KEEP** | Reusable as-is |
| `SheetModal.tsx` | **KEEP** | Reusable as-is |
| `SectionHeader.tsx` | **KEEP** | Reusable as-is |
| `StatCard.tsx` | **KEEP** | Usable for stats row if needed |
| `theme/tokens.ts` | **EXTEND** | Add dark mode token variants |
| `types/index.ts` | **REPLACE** | WhiteLabel types → Trenfy Trend types |
| `data/mockData.ts` | **DELETE** | Replaced by API |
| `data/starterCopy.ts` | **DELETE** | Replaced by Trenfy copy |
| `api/` | **NEW** | client.ts, trends.ts, types.ts |
| `hooks/` | **NEW** | useTrends, useCategories, useStats |
| `context/` | **NEW** | BookmarksContext, AuthContext, PrefsContext |
| `storage/storage.ts` | **NEW** | MMKV abstraction |
| `navigation/types.ts` | **NEW** | Param lists for all stacks |

---

## Integration Points: Backend Changes Required

**None for v1.3.** The backend already supports all required read operations:
- `GET /api/trends` with `status`, `platform`, `category`, `region_code`, `q`, `cursor`, `limit`
- Cursor-based pagination already implemented
- `GET /api/trends/stats` already exists
- `GET /api/trends/mockup` usable for category preview data

The only operational step is ensuring the mobile device/simulator can reach the backend's IP/port, and updating `CORS_ORIGINS` if needed for production deployment.

---

## Sources

- FastAPI CORS docs — already implemented in app.py
- TanStack Query v5 — `useInfiniteQuery` cursor pattern
- Expo SDK 53 release notes — React 19 compatibility confirmed
- React Navigation v7 nested navigators docs
- MMKV + Expo — requires dev build (not Expo Go)
- expo-auth-session — OAuth browser flow for Expo
- expo-apple-authentication — native Apple Sign In

---
*Architecture research for: Trenfy v1.3 React Native mobile consumer app*
*Researched: 2026-03-21*
*Supersedes: v1.2 web admin architecture (preserved above as reference)*
