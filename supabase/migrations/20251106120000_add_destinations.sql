-- Create destinations table
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: basic index for ordering by name
create index if not exists destinations_name_idx on public.destinations (name);

-- If you use RLS, enable it and add policies as needed (adjust to your security model)
-- alter table public.destinations enable row level security;
-- create policy "Allow read for all" on public.destinations for select using (true);
-- create policy "Allow write for all" on public.destinations for all using (true) with check (true);