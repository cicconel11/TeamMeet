<!-- a7905f53-4fad-4895-8e74-c03bc9adca22 b3f31b5a-3f69-4860-bc84-bb3b68481973 -->
# Mobile Hamburger Menu Implementation

## Summary

Create an app-focused mobile experience with a hamburger menu. On mobile, users will see a header with a menu icon that opens a full-height sidebar overlay. Desktop remains unchanged.

---

## Changes

### 1. Create MobileNav Component

Create [`src/components/layout/MobileNav.tsx`](src/components/layout/MobileNav.tsx) - a client component with:

- Fixed header bar with org logo, name, and hamburger icon
- Slide-in sidebar overlay (from left) with all nav items
- Backdrop overlay that closes menu when tapped
- Close button (X) in the sidebar header
- Uses React state to toggle open/closed
```tsx
"use client";
// State: isOpen
// Header: fixed top, hamburger button, org name
// Overlay: fixed inset-0, backdrop + sliding sidebar panel
// Reuses same nav items as OrgSidebar
```


### 2. Update OrgLayout

Modify [`src/app/[orgSlug]/layout.tsx`](src/app/[orgSlug]/layout.tsx):

- Replace the current mobile header with the new `<MobileNav />` component
- Keep `<OrgSidebar />` wrapped in `hidden md:block` for desktop
- Pass organization data to MobileNav
```tsx
{/* Mobile: hamburger menu */}
<MobileNav organization={organization} userRole={userRole.role} />

{/* Desktop: sidebar */}
<div className="hidden md:block">
  <OrgSidebar organization={organization} userRole={userRole.role} />
</div>
```


### 3. Keep OrgSidebar Desktop-Only

The existing [`src/components/layout/OrgSidebar.tsx`](src/components/layout/OrgSidebar.tsx) already has `hidden md:flex` - no changes needed.

---

## Result

- **Mobile**: Compact header + hamburger icon. Tap to open full nav overlay.
- **Desktop**: Same fixed sidebar as before.
- **No changes** to page content, routes, Supabase, or Stripe logic.

### To-dos

- [ ] Create Supabase migration for stripe_connect_account_id and organization_donations table
- [ ] Update types/database.ts with new fields and OrganizationDonation type
- [ ] Create /api/stripe/connect-onboarding endpoint for Express account setup
- [ ] Create /api/donations/create-checkout-session endpoint
- [ ] Extend webhook handler for payment_intent.succeeded and payment_intent.payment_failed
- [ ] Create DonationForm client component
- [ ] Update Philanthropy page with Connect setup, stats, and donation form
- [ ] Create docs/stripe-donations.md with Stripe CLI testing instructions
- [ ] Run lint and build to verify no errors introduced
- [ ] Update OrgLayout with mobile header and responsive main padding
- [ ] Update OrgSidebar to hide on mobile (md:flex)
- [ ] Make PageHeader flex responsive with text sizing
- [ ] Update all [orgSlug] page.tsx files for responsive grids/tables
- [ ] Update app pages (org picker, join, create)
- [ ] Verify auth pages are mobile-friendly
- [ ] Run npm run lint and npm run build to verify no errors