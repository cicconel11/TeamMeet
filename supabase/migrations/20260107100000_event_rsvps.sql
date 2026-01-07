-- Event RSVPs table for tracking attendance
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null check (status in ('attending', 'not_attending', 'maybe')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Indexes for performance
create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_user_id_idx on public.event_rsvps(user_id);
create index if not exists event_rsvps_org_id_idx on public.event_rsvps(organization_id);

-- Enable RLS
alter table public.event_rsvps enable row level security;

-- RLS Policies

-- SELECT: Organization members can view RSVPs for events in their org
create policy event_rsvps_select on public.event_rsvps
  for select
  using (public.has_active_role(organization_id, array['admin','active_member','alumni']));

-- INSERT: Users can create their own RSVPs
create policy event_rsvps_insert on public.event_rsvps
  for insert
  with check (
    auth.uid() = user_id
    and public.has_active_role(organization_id, array['admin','active_member','alumni'])
  );

-- UPDATE: Users can update their own RSVPs
create policy event_rsvps_update on public.event_rsvps
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: Users can delete their own RSVPs
create policy event_rsvps_delete on public.event_rsvps
  for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
create or replace function public.update_event_rsvps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger event_rsvps_updated_at
  before update on public.event_rsvps
  for each row
  execute function public.update_event_rsvps_updated_at();
