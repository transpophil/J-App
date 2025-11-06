-- Add is_important flag to passengers
alter table public.passengers
add column if not exists is_important boolean not null default false;