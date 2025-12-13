---
name: Mobile Hamburger Menu Implementation
overview: ""
todos:
  - id: 36dbe246-1fc5-49e8-a7ad-2f4d20dc28a4
    content: Create Supabase migration for stripe_connect_account_id and organization_donations table
    status: pending
  - id: f29aaf76-9504-4374-b77b-f7107a460a7c
    content: Update types/database.ts with new fields and OrganizationDonation type
    status: pending
  - id: 0b85e27d-2751-4646-b561-29b2ddca38ed
    content: Create /api/stripe/connect-onboarding endpoint for Express account setup
    status: pending
  - id: 7350744c-cc1a-434d-9c7b-812310cd89dd
    content: Create /api/donations/create-checkout-session endpoint
    status: pending
  - id: 3caca294-7750-4dc8-a2f3-f3981fa79fab
    content: Extend webhook handler for payment_intent.succeeded and payment_intent.payment_failed
    status: pending
  - id: 04309aa4-a62e-45e5-90a3-cfc79e8ea9f9
    content: Create DonationForm client component
    status: pending
  - id: 11076d93-ae1c-4abf-9ab4-8a4f664eb991
    content: Update Philanthropy page with Connect setup, stats, and donation form
    status: pending
  - id: e3618ad5-3b57-42ee-8a8e-7e2b55260460
    content: Create docs/stripe-donations.md with Stripe CLI testing instructions
    status: pending
  - id: 3168f6b8-15b1-4940-ad4c-013fd7b5763e
    content: Run lint and build to verify no errors introduced
    status: pending
  - id: b9ef5bf9-ec34-4e70-abd5-c6e2664cbcc6
    content: Update OrgLayout with mobile header and responsive main padding
    status: pending
  - id: 81ef4890-bcb1-41d8-9d15-99d41e4923b4
    content: Update OrgSidebar to hide on mobile (md:flex)
    status: pending
  - id: c0df3dae-b1fe-4bd0-80a1-18c23dc4091a
    content: Make PageHeader flex responsive with text sizing
    status: pending
  - id: a385f0fa-cd91-42e5-9a3e-52224b30b96c
    content: Update all [orgSlug] page.tsx files for responsive grids/tables
    status: pending
  - id: a3e93f81-24de-41db-9951-2463d7ef759b
    content: Update app pages (org picker, join, create)
    status: pending
  - id: e68f14f0-9a75-4e17-a08b-59ee5c1c5dfe
    content: Verify auth pages are mobile-friendly
    status: pending
  - id: 1c52616c-f73b-4c4f-8f38-08d866249447
    content: Run npm run lint and npm run build to verify no errors
    status: pending
---

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