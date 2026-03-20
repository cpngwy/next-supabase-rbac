-- Supabase RBAC schema + RLS
-- Run this in the Supabase SQL editor for your project.

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Roles define the permissions array used by the app.
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  permissions text[] not null default '{}'
);

-- Profiles extend auth.users and link to roles.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role_id uuid references public.roles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at in sync.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Helper for RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and r.name = 'Admin'
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.roles enable row level security;

-- Profiles policies: users can view/update their own profile.
create policy "Users can view own profile"
on public.profiles
for select
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles
for insert
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- Admins can view/update all profiles (used for admin screens).
create policy "Admin can manage profiles"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

-- Roles policies:
-- Allow authenticated users to read roles (needed for registration/profile screens).
create policy "Authenticated can view roles"
on public.roles
for select
to authenticated
using (true);

-- Only admins can create/update/delete roles.
create policy "Admin can manage roles"
on public.roles
for all
using (public.is_admin())
with check (public.is_admin());

-- Seed default roles (Admin has full permissions, User is limited).
insert into public.roles (name, permissions)
values
  ('Admin', array['*']),
  ('User', array[]::text[])
on conflict (name) do update
set permissions = excluded.permissions;

