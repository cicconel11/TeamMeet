---
name: Editing & Features Overhaul
overview: Fix announcements schema, add universal editing consistency with dedicated edit pages, create admin invite tab with QR, unify donation/philanthropy embeds to multiple-embed approach, make dropdowns dynamic, and add donation prompt text.
todos:
  - id: p1-migration
    content: Create announcements audience fix migration with RLS policies
    status: completed
  - id: p1-types
    content: Update database.ts with AnnouncementAudience type
    status: completed
  - id: p1-form
    content: Update announcement form with correct audience values
    status: completed
  - id: p2-members-edit
    content: Create members edit page following alumni pattern
    status: completed
  - id: p2-events-edit
    content: Create events edit page following alumni pattern
    status: completed
  - id: p2-announcements-edit
    content: Create announcements edit page following alumni pattern
    status: completed
  - id: p2-donations-edit
    content: Create donations edit page following alumni pattern
    status: completed
  - id: p2-workouts-edit
    content: Create workouts edit page following alumni pattern
    status: completed
  - id: p3-sidebar
    content: Add Invite tab to OrgSidebar for admins
    status: completed
  - id: p4-donation-embeds
    content: Create org_donation_embeds table and shared EmbedsManager
    status: completed
  - id: p4-update-pages
    content: Update donations and philanthropy pages to use shared embeds
    status: completed
  - id: p5-dynamic-dropdowns
    content: Create useDistinctValues hook for dynamic dropdowns
    status: completed
  - id: p5-mentorship
    content: Update mentorship pairing to use alumni/members dropdowns
    status: completed
  - id: p6-prompt-banner
    content: Add donation prompt banner to donations and philanthropy pages
    status: completed
  - id: lint-build
    content: Run npm run lint and npm run build to verify
    status: completed
---

# Editing Consistency & Features Overhaul

## Priority 1: Announcement Targeting & Schema Fix (BLOCKER)

### Problem

The `audience` and `target_user_ids` columns exist in migration [`20251214000000_alumni_expansion_and_features.sql`](supabase/migrations/20251214000000_alumni_expansion_and_features.sql) but the schema cache error suggests they need to be refreshed or the migration re-applied.

### Solution

**1. New Migration** - Create [`supabase/migrations/20251216000000_announcements_audience_fix.sql`](supabase/migrations/20251216000000_announcements_audience_fix.sql):

- Ensure `audience` column exists with extended values: `all`, `members`, `active_members`, `alumni`, `individuals`
- Ensure `audience_user_ids` (renamed from `target_user_ids` for clarity) exists
- Add RLS policies for announcement visibility based on audience

**2. Update Types** - [`src/types/database.ts`](src/types/database.ts):

- Add `AnnouncementAudience` type with all values

**3. Update Announcement Form** - [`src/app/[orgSlug]/announcements/new/page.tsx`](src/app/[orgSlug]/announcements/new/page.tsx):

- Already has audience selector, just update values to match new schema

---

## Priority 2: Universal Editing Consistency

### Pattern to Follow

The Alumni editor ([`src/app/[orgSlug]/alumni/[alumniId]/edit/page.tsx`](src/app/[orgSlug]/alumni/[alumniId]/edit/page.tsx)) uses:

- Dedicated `/edit` route
- Load existing data on mount
- Form with save/cancel buttons
- Error handling with toast-style messages

### Create Edit Pages For:

| Entity | New Edit Page Path |

|--------|-------------------|

| Members | `src/app/[orgSlug]/members/[memberId]/edit/page.tsx` |

| Events | `src/app/[orgSlug]/events/[eventId]/edit/page.tsx` |

| Announcements | `src/app/[orgSlug]/announcements/[announcementId]/edit/page.tsx` |

| Donations | `src/app/[orgSlug]/donations/[donationId]/edit/page.tsx` |

| Workouts | `src/app/[orgSlug]/workouts/[workoutId]/edit/page.tsx` |

### Add Edit/Delete Buttons

Add edit and delete buttons to detail pages for each entity (admin-only).

---

## Priority 3: Admin Invite Tab with QR

### Current State

Invites already exist at [`/settings/invites`](src/app/[orgSlug]/settings/invites/page.tsx) with QR support.

### Changes

1. **Add to Sidebar** - Update [`OrgSidebar.tsx`](src/components/layout/OrgSidebar.tsx):

   - Add "Invite" nav item in bottom section (admin-only)
   - Link to existing `/settings/invites` page

2. **Add Coach Role** - Update invite form to support "coach" role option

---

## Priority 4: Philanthropy Embeds Match Donations (Multiple Embeds)

### Current State

- Donations: Single URL on `organizations.donation_embed_url`
- Philanthropy: Multiple embeds in `org_philanthropy_embeds` table

### Solution

1. **Create `org_donation_embeds` table** matching `org_philanthropy_embeds` structure
2. **Create shared `EmbedsManager` component** in [`src/components/shared/EmbedsManager.tsx`](src/components/shared/EmbedsManager.tsx)
3. **Update Donations page** to use new embeds table + shared component
4. **Update Philanthropy page** to use shared component

---

## Priority 5: Dynamic Dropdown Population

### Fields to Make Dynamic

- Position, Major, Industry, Company, City, Graduation Year

### Implementation

Create [`src/hooks/useDistinctValues.ts`](src/hooks/useDistinctValues.ts):

- Query distinct values from `alumni` table
- Cache and invalidate on mutations
- Use in Alumni forms and filters

### Mentorship Pairing

Update [`src/app/[orgSlug]/mentorship/page.tsx`](src/app/[orgSlug]/mentorship/page.tsx):

- Mentor dropdown: Fetch from alumni
- Mentee dropdown: Fetch from active members

---

## Priority 6: Donation Prompt Text

Add banner to both [`donations/page.tsx`](src/app/[orgSlug]/donations/page.tsx) and [`philanthropy/page.tsx`](src/app/[orgSlug]/philanthropy/page.tsx):

```tsx
<Card className="p-4 mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
  <p className="text-sm text-amber-800 dark:text-amber-200">
    If you donated externally, please remember to record your exact donation 
    using the button in the top-right corner.
  </p>
</Card>
```

---

## Priority 7: Admin Control Enforcement

Verify existing implementation in [`src/middleware.ts`](src/middleware.ts):

- Already checks for `revoked` status
- Already redirects revoked users

---

## Files Changed Summary

| Category | Files |

|----------|-------|

| Migrations | 1 new: announcements fix + donation embeds table |

| Edit Pages | 5 new: members, events, announcements, donations, workouts |

| Shared Components | 1 new: EmbedsManager |

| Hooks | 1 new: useDistinctValues |

| Page Updates | donations, philanthropy, mentorship, OrgSidebar |

| Types | database.ts updates |

---

## Manual Test Checklist

- [ ] Create announcement with each audience type - verify notifications sent correctly
- [ ] Non-admin cannot see create/edit buttons for announcements
- [ ] Edit member/event/announcement/donation/workout works like alumni editor
- [ ] Delete confirmation appears for all entities
- [ ] Invite tab appears in sidebar for admins only
- [ ] QR code updates when invite code regenerated
- [ ] Donations and Philanthropy both support multiple embeds
- [ ] Dropdowns populate from existing data
- [ ] New alumni values appear in dropdowns immediately
- [ ] Mentorship mentor dropdown shows alumni only
- [ ] Mentorship mentee dropdown shows active members only
- [ ] Donation prompt banner visible on both pages
- [ ] Revoked user cannot access org pages