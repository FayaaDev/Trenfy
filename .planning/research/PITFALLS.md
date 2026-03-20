# Pitfalls Research

**Domain:** Adding React admin panel to existing FastAPI/NocoDB app
**Researched:** 2026-03-20
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: CORS Blocks All React → FastAPI Calls

**What goes wrong:**
Browser blocks every fetch from localhost:5173 (Vite) to localhost:8000 (FastAPI). No API calls work. Admin is broken from minute one.

**Why it happens:**
FastAPI has no CORS config by default. Developers often add it later when they notice errors instead of upfront.

**How to avoid:**
Add CORSMiddleware as the very first change to app.py. Set `allow_origins` from an env var (default includes localhost:5173 for dev).

**Warning signs:**
"Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy"

**Phase to address:**
Phase 7 (backend prep — first change)

---

### Pitfall 2: Status Field Not Propagated to Python Model

**What goes wrong:**
You add `status` to NocoDB but forget to add it to the Pydantic Trend model. PATCH endpoint accepts it but silently drops it, or GET endpoint never returns it. Admin thinks status was saved but it wasn't.

**Why it happens:**
NocoDB schema and Python model are separate — adding a column in NocoDB doesn't auto-update the Python dataclass.

**How to avoid:**
In Phase 7, update the Pydantic model and the NocoDB client's field list simultaneously with the DB migration. Verify with a round-trip test.

**Warning signs:**
Status updates appear to succeed (200 response) but the column stays NULL in NocoDB.

**Phase to address:**
Phase 7 (backend prep)

---

### Pitfall 3: VITE_ADMIN_TOKEN Committed to Git

**What goes wrong:**
Developer puts the real token in `.env.local` then accidentally commits it, or copies the real token into `.env.example`.

**Why it happens:**
Easy mistake when testing quickly. One `git add .` away from a credential leak.

**How to avoid:**
- `.env.local` MUST be in `.gitignore` (Vite's default includes it — verify)
- `.env.example` has empty value: `VITE_ADMIN_TOKEN=`
- Never put real tokens in `.env` or `.env.example`

**Warning signs:**
`git ls-files .env.local` returns a filename instead of empty.

**Phase to address:**
Phase 8 (web scaffold — verify gitignore on day one)

---

### Pitfall 4: Stale Data After Mutations

**What goes wrong:**
Admin approves a trend, toast shows success, but the row still shows "pending". The list doesn't update because TanStack Query still serves the cached version.

**Why it happens:**
Forgot to call `queryClient.invalidateQueries` after mutation success, or used the wrong query key.

**How to avoid:**
Every mutation's `onSuccess` must invalidate `['trends']`. Use a consistent query key pattern defined in one place.

**Warning signs:**
Status changes look successful (toast fires) but list doesn't update unless page is manually refreshed.

**Phase to address:**
Phase 9 (content management)

---

### Pitfall 5: Categories Are Empty Until Content Exists

**What goes wrong:**
Category dropdown is empty when admin first opens it because categories are derived from distinct values in the DB. If the table is empty or all rows have NULL category, there are no options.

**Why it happens:**
No separate categories table — categories are inferred from data. Chicken-and-egg on first use.

**How to avoid:**
Seed a hardcoded fallback list in the frontend: ["gaming", "music", "entertainment"]. Merge with DB-derived values. Allow typing new ones.

**Warning signs:**
Category dropdown shows zero options on first load.

**Phase to address:**
Phase 10 (category management)

---

### Pitfall 6: Sources PATCH Endpoint Missing

**What goes wrong:**
The admin sources panel tries to PATCH /api/sources/{id} to toggle `enabled`, but this endpoint doesn't exist in FastAPI. The toggle silently fails.

**Why it happens:**
Current FastAPI only has GET /api/sources. No write endpoint was ever needed until now.

**How to avoid:**
Phase 7 backend prep must include adding PATCH /api/sources/{id} alongside the trends write endpoints.

**Warning signs:**
Toggle appears to work (optimistic UI update) but on refresh the source is back to its previous state.

**Phase to address:**
Phase 7 (backend prep)

---

### Pitfall 7: Demo Feed Shows All Content if Status Filter Not Implemented

**What goes wrong:**
Demo feed queries `GET /api/trends?status=approved`. If the status filter isn't implemented in FastAPI, it's ignored and ALL trends appear — including unreviewed content.

**Why it happens:**
Developer adds the UI before the backend handles the filter.

**How to avoid:**
Always build backend before frontend for each feature. Phase 7 adds the status param to the trends route. Phase 11 (demo feed) only starts after Phase 7 is verified.

**Warning signs:**
Demo feed shows 50+ items including status=pending or NULL rows.

**Phase to address:**
Phase 7 (backend prep) — add status filter to GET /api/trends

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded category fallback in frontend | Unblocks UI when DB is empty | Out of sync with real DB values | MVP only |
| No pagination on sources panel | Simpler code | Fine — sources list is tiny (< 10 rows) | Always acceptable |
| Token stored in sessionStorage | Simple | Cleared on tab close | Acceptable for solo admin tool |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| FastAPI CORS | Using `allow_origins=["*"]` in production | Use env var with explicit origin list |
| NocoDB field names | Python model uses `status` but NocoDB column created as `Status` (capital) | Verify column name matches exactly |
| Vite env vars | Using `process.env.ADMIN_TOKEN` (Node style) | Must use `import.meta.env.VITE_ADMIN_TOKEN` |
| TanStack Query keys | Different key strings for same data across components | Define all query keys in a central `queryKeys.ts` |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| VITE_ADMIN_TOKEN in .env.example with real value | Token in git history | .env.example always has empty value |
| CORS allow_origins=["*"] in production | Any site can call admin endpoints | Restrict to known origins |
| No DELETE confirmation | Accidental data loss | Always show confirm dialog before DELETE |

## "Looks Done But Isn't" Checklist

- [ ] **CORS:** FastAPI actually allows requests from React app origin — verify in browser DevTools Network tab
- [ ] **Status filter:** GET /api/trends?status=approved actually filters — verify demo feed doesn't show pending items
- [ ] **PATCH persistence:** Status change survives page refresh — verify by refreshing after approve
- [ ] **Delete:** Deleted item disappears from list after refresh — verify against NocoDB
- [ ] **Token auth:** /admin without token redirects to /login — verify in private browser window
- [ ] **gitignore:** .env.local is NOT tracked — verify with `git ls-files .env.local` returning empty

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CORS blocks all calls | Phase 7 (backend prep) | Browser DevTools shows 200, not CORS error |
| Status not in Python model | Phase 7 (backend prep) | PATCH status → GET shows updated value |
| Token committed to git | Phase 8 (web scaffold) | git ls-files .env.local returns empty |
| Stale data after mutations | Phase 9 (content management) | Approve item → list immediately shows approved badge |
| Empty categories | Phase 10 (category management) | Category dropdown shows defaults even on empty DB |
| Sources PATCH missing | Phase 7 (backend prep) | Toggle enabled → verify in NocoDB |
| Demo feed shows all content | Phase 7 + Phase 11 | Demo page shows only approved items |

---
*Pitfalls research for: Trenfy v1.2 React admin panel*
*Researched: 2026-03-20*
