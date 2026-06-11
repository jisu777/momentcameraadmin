create table if not exists public.licenses (
  id uuid primary key,
  code text not null,
  normalized_code text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked')),
  max_activations integer not null default 1 check (max_activations > 0),
  activation_count integer not null default 0 check (activation_count >= 0),
  bound_device_id text,
  platform text,
  app_version text,
  note text,
  purchaser_email text,
  purchaser_name text,
  order_id text unique,
  source text,
  duration_days integer check (duration_days is null or duration_days > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  last_seen_at timestamptz
);

create index if not exists licenses_normalized_code_idx on public.licenses (normalized_code);
create index if not exists licenses_status_idx on public.licenses (status);
create index if not exists licenses_bound_device_id_idx on public.licenses (bound_device_id);
create index if not exists licenses_purchaser_email_idx on public.licenses (purchaser_email);
create index if not exists licenses_order_id_idx on public.licenses (order_id);

alter table public.licenses add column if not exists duration_days integer check (duration_days is null or duration_days > 0);
alter table public.licenses add column if not exists purchaser_email text;
alter table public.licenses add column if not exists purchaser_name text;
alter table public.licenses add column if not exists order_id text unique;
alter table public.licenses add column if not exists source text;

alter table public.licenses enable row level security;

drop policy if exists "No public license reads" on public.licenses;
create policy "No public license reads"
on public.licenses
for select
using (false);

drop policy if exists "No public license writes" on public.licenses;
create policy "No public license writes"
on public.licenses
for all
using (false)
with check (false);
