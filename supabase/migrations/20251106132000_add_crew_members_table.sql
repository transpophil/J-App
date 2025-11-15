-- Create crew_members table to manage crew contacts
create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);