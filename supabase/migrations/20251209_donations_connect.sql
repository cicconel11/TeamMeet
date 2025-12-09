-- Add Stripe Connect account ID to organizations
alter table public.organizations
  add column if not exists stripe_connect_account_id text;

-- Create organization_donations table for Stripe-processed donations
create table if not exists public.organization_donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  donor_name text,
  donor_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Unique index on payment intent ID for idempotency
create unique index if not exists org_donations_pi_idx
  on public.organization_donations(stripe_payment_intent_id);

-- Index for efficient queries by organization
create index if not exists org_donations_org_idx
  on public.organization_donations(organization_id);

