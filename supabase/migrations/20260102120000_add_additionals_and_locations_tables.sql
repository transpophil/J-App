-- Enable pgcrypto for gen_random_uuid if not already enabled
-- Note: Supabase projects typically already have this enabled. If not, uncomment:
-- create extension if not exists pgcrypto;

create table if not exists public.additionals (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  key text not null,
  value text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists additionals_driver_idx on public.additionals(driver_id);
create index if not exists additionals_task_idx on public.additionals(task_id);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  name text null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_driver_idx on public.locations(driver_id);