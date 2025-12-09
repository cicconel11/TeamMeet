-- Add event_id to organization_donations to track donations to specific philanthropy events
-- NULL means general donation, not tied to a specific event
alter table public.organization_donations
  add column if not exists event_id uuid references public.events(id) on delete set null;

-- Add purpose field for custom donation descriptions
alter table public.organization_donations
  add column if not exists purpose text;

-- Index for efficient queries by event
create index if not exists org_donations_event_idx
  on public.organization_donations(event_id);

