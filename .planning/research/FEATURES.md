# Feature Research

**Domain:** React admin panel + public demo feed for content moderation
**Researched:** 2026-03-20
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Content list with pagination | You can't act on content you can't see | MEDIUM | Server-side pagination via cursor already supported by GET /api/trends |
| Status badges (pending/approved/rejected) | Visual scanability — know state at a glance | LOW | Color-coded Badge component from shadcn |
| Approve / Reject actions | Core workflow — without this, publish control doesn't exist | MEDIUM | Requires PATCH /api/trends/{id} + status field in DB |
| Edit content (title, description, category, ar_translation) | Fix scraped content errors before publishing | MEDIUM | Modal form with React Hook Form |
| Delete content | Remove irrelevant or duplicate trends | LOW | DELETE /api/trends/{id} + confirmation dialog |
| API action buttons (health, stats, refresh, mock) | Admin needs operational control without opening terminal | LOW | Button → fetch → show response in expandable panel |
| Sources list with enable/disable toggle | Control which platforms fetch without code changes | LOW | PATCH /api/sources/{id} with enabled field |
| Category filter in content list | Admin works category by category | LOW | Dropdown filter on list view |
| Search by title | Find specific content quickly | LOW | Uses existing q= param on GET /api/trends |
| Platform filter | Separate YouTube from X content | LOW | Uses existing platform= param |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Side-by-side original + Arabic translation | Key for Arabic content review without switching columns | MEDIUM | Expandable row or split-pane view in table |
| Inline thumbnail preview | Visually identify content without clicking through | LOW | thumbnail_url in table column |
| Bulk approve / bulk reject | Process many items at once after a big fetch | MEDIUM | Checkbox select + bulk action bar |
| Category management panel | Add/rename/delete categories, see item counts per category | MEDIUM | Separate tab; categories derived from DB distinct values + allow adding new |
| Content move (reassign category) | Move items to correct category after batch review | MEDIUM | Select field in edit modal or bulk action |
| API response viewer | See actual JSON from each endpoint call | LOW | Collapsible pre-formatted JSON display |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time auto-refresh | "See new trends appear" | Polling hammers NocoDB; causes mid-edit refreshes; not needed for solo admin | Manual refresh button + toast "Updated" |
| Drag-and-drop category reorder | "Nicer UX" | High complexity, categories have no order concept in DB | Simple list with move-to-category dropdown |
| Rich text editor for descriptions | "Better editing" | Overkill; descriptions are short text | Textarea with character count |
| Multi-user roles | "Team moderation" | No user table, adds massive complexity | Single admin token; not in v1 scope |
| Undo/delete recovery | "Safe deletes" | Requires soft-delete or audit log | Add confirmation dialog before delete |

## Feature Dependencies

```
Demo feed (approved-only)
    └──requires──> status field in Trenfy table
                       └──requires──> DB schema migration (add status column)

Approve/Reject workflow
    └──requires──> status field in Trenfy table
    └──requires──> PATCH /api/trends/{id} backend endpoint

Category management
    └──requires──> categories derived from DB (GET distinct category values)
    └──enhances──> Content move (reassign category)

Bulk actions
    └──requires──> Checkbox selection state
    └──requires──> Approve/Reject single action (reuses same PATCH endpoint)

Sources toggle
    └──requires──> PATCH /api/sources/{id} backend endpoint (currently missing — only GET exists)
```

### Dependency Notes

- **Status field must be in DB before approve/reject UI**: DB migration is the foundation phase — everything else builds on it.
- **PATCH endpoints must exist before content editing**: FastAPI currently has no PATCH or DELETE for trends. These must be added before the admin UI's write features work.
- **Categories are derived from DB**: No separate categories table — GET distinct values from the category column. Admin can add new categories by typing them when editing content. Default fallback list: gaming, music, entertainment.

## MVP Definition

### Launch With (v1.2)

- [ ] Status field migration (pending/approved/rejected) — foundation for everything
- [ ] PATCH /api/trends/{id} and DELETE /api/trends/{id} backend endpoints
- [ ] PATCH /api/sources/{id} backend endpoint (for toggle)
- [ ] Status filter support on GET /api/trends (for demo feed)
- [ ] Content list with platform + category + status filters, search, pagination
- [ ] Original + Arabic translation columns visible in list
- [ ] Approve / Reject / Edit / Delete per item
- [ ] Category management: see categories with counts, reassign content
- [ ] API control panel: health, stats, refresh, mock buttons with response display
- [ ] Sources panel: view sources, toggle enabled
- [ ] Simple token auth on admin page (env var token check, sessionStorage)
- [ ] Public demo feed showing approved-only content

### Add After Validation (v1.x)

- [ ] Bulk approve/reject — add once single-item flow is stable
- [ ] Inline thumbnail preview — minor enhancement

### Future Consideration (v2+)

- [ ] Auto-refresh with new-item notification
- [ ] Multi-user roles / audit log
- [ ] Trend analytics charts on admin dashboard

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Status field + migration | HIGH | LOW | P1 |
| PATCH/DELETE backend endpoints | HIGH | LOW | P1 |
| Content list (filtered, searchable) | HIGH | MEDIUM | P1 |
| Approve/reject/edit/delete per item | HIGH | MEDIUM | P1 |
| Original + AR translation view | HIGH | LOW | P1 |
| Category management + move | MEDIUM | MEDIUM | P1 |
| API control panel | MEDIUM | LOW | P1 |
| Sources panel | MEDIUM | LOW | P1 |
| Admin token auth | HIGH | LOW | P1 |
| Demo feed (approved-only) | HIGH | LOW | P1 |
| Bulk actions | MEDIUM | MEDIUM | P2 |
| Thumbnail previews | LOW | LOW | P2 |

## Sources

- User requirements (conversation above)
- NocoDB Trenfy table schema (verified via NocoDB API)
- FastAPI routes (verified via codebase exploration)

---
*Feature research for: Trenfy v1.2 React admin panel*
*Researched: 2026-03-20*
