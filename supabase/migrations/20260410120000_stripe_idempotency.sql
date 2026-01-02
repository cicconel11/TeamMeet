-- Idempotent payment attempts and Stripe webhook deduplication

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id),
  flow_type text not null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  status text not null default 'initiated',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_connected_account_id text,
  stripe_transfer_id text,
  stripe_payout_id text,
  checkout_url text,
  request_fingerprint text,
  last_error text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create unique index if not exists payment_attempts_checkout_session_unique
  on public.payment_attempts(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists payment_attempts_payment_intent_unique
  on public.payment_attempts(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists payment_attempts_transfer_unique
  on public.payment_attempts(stripe_transfer_id)
  where stripe_transfer_id is not null;

create unique index if not exists payment_attempts_payout_unique
  on public.payment_attempts(stripe_payout_id)
  where stripe_payout_id is not null;

create index if not exists payment_attempts_org_flow_idx
  on public.payment_attempts(organization_id, flow_type);

create index if not exists payment_attempts_status_idx
  on public.payment_attempts(status);

drop trigger if exists payment_attempts_updated_at on public.payment_attempts;
create trigger payment_attempts_updated_at
  before update on public.payment_attempts
  for each row
  execute function update_updated_at_column();

alter table public.payment_attempts enable row level security;

drop policy if exists payment_attempts_service_only on public.payment_attempts;
create policy payment_attempts_service_only on public.payment_attempts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  type text not null,
  processed_at timestamptz,
  payload_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id)
);

create index if not exists stripe_events_type_idx on public.stripe_events(type);

alter table public.stripe_events enable row level security;

drop policy if exists stripe_events_service_only on public.stripe_events;
create policy stripe_events_service_only on public.stripe_events
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

