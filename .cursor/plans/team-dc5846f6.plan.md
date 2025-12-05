<!-- dc5846f6-d957-45cd-8d83-b0a9d6c7f365 37ce30a3-30ee-44cf-8dbc-a1fbe5b98a95 -->
# Shareable Join Links and Join Tab

## 1. Auto-fill Invite Code from URL

Update [`src/app/app/join/page.tsx`](src/app/app/join/page.tsx) to read the `code` query parameter and auto-fill/auto-submit:

```typescript
// Read code from URL params
const searchParams = useSearchParams();
const codeFromUrl = searchParams.get("code");

useEffect(() => {
  if (codeFromUrl) {
    setCode(codeFromUrl);
    // Optionally auto-submit
  }
}, [codeFromUrl]);
```

## 2. Add "Join Organization" to Sidebar

Update [`src/components/layout/OrgSidebar.tsx`](src/components/layout/OrgSidebar.tsx):

- Add a "Join Another Org" link at the bottom of the sidebar (near Switch Organization)
- Links to `/app/join`

## 3. Add Join Button to Landing Page

Update [`src/app/page.tsx`](src/app/page.tsx):

- Add a "Have an invite code?" section with a link to `/app/join`
- Visible to both logged-in and logged-out users
- Logged-out users will be redirected to login first, then to join page

## 4. Copy Invite Link Button for Admins

Update [`src/app/[orgSlug]/settings/invites/page.tsx`](src/app/[orgSlug]/settings/invites/page.tsx):

- Add a "Copy Link" button next to each invite code
- Copies the full URL: `{origin}/app/join?code=ABC123`

## Files Changed

| File | Change |

|------|--------|

| `src/app/app/join/page.tsx` | Read `?code=` param, auto-fill input |

| `src/components/layout/OrgSidebar.tsx` | Add "Join Another Org" link |

| `src/app/page.tsx` | Add "Have an invite code?" section |

| `src/app/[orgSlug]/settings/invites/page.tsx` | Add "Copy Link" button |

### To-dos

- [x] Create Next.js 14 project with TypeScript and Tailwind CSS
- [x] Set up Supabase database schema with all tables
- [x] Create app folder structure and layouts
- [x] Build authentication system with Supabase Auth
- [x] Scaffold organization pages (dashboard, members, alumni)
- [x] Scaffold events, announcements, philanthropy pages
- [x] Scaffold donations, records, competitions pages
- [x] Add admin-only route protection
- [x] Add Google OAuth button and handler to login page
- [x] Convert homepage to simple landing/login page
- [x] Create /app org picker and /app/create-org pages
- [x] Update middleware for route protection
- [x] Add auth + membership check to org layout
- [x] Create notification_preferences and notifications tables
- [x] Build notifications list, send form, and user preferences pages
- [x] Create stubbed sendEmail/sendSMS functions
- [x] Add notifications link to sidebar for admins