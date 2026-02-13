-- HKU MBBS OSCE Clerked Cases App
-- Run this in Supabase SQL Editor (or as a migration) AFTER enabling:
-- 1) Auth providers: Email + Google
-- 2) (Recommended) Disable public signups (invite-only) in Auth settings

-- Extensions
create extension if not exists pgcrypto;

-- Profiles table: one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read for authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles: insert own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles: update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Cases table
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),

  specialty text not null check (specialty in ('MED','SUR')),
  subspecialty text not null,

  hospital text not null check (hospital in ('QMH','TWH')),
  ward text not null,
  bed text not null,

  name text not null,
  age integer not null check (age >= 0 and age <= 120),
  sex text not null check (sex in ('M','F')),

  date_of_admission date not null,
  date_of_discharge date null,

  clerkable boolean not null default true,
  high_yield boolean not null default false,

  conditions text not null,
  signs text not null,
  remarks text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id)
);

-- Subspecialty validity: enforced by trigger (defensive)
create or replace function public.validate_subspecialty()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if NEW.specialty = 'MED' then
    ok := NEW.subspecialty in ('CARD','RESP','ABDO','NEUR','SPOT');
  elsif NEW.specialty = 'SUR' then
    ok := NEW.subspecialty in ('PRS','VAS','ABDO','H&N','ECS','BR','ORTH');
  end if;

  if not ok then
    raise exception 'Invalid subspecialty % for specialty %', NEW.subspecialty, NEW.specialty;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_subspecialty on public.cases;
create trigger trg_validate_subspecialty
before insert or update on public.cases
for each row
execute function public.validate_subspecialty();

-- Update bookkeeping: updated_at and updated_by
create or replace function public.set_case_update_fields()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  return NEW;
end;
$$;

drop trigger if exists trg_set_case_update_fields on public.cases;
create trigger trg_set_case_update_fields
before update on public.cases
for each row
execute function public.set_case_update_fields();

alter table public.cases enable row level security;

-- All editors can read all cases (authenticated only)
create policy "cases: read for authenticated"
on public.cases
for select
to authenticated
using (true);

-- Insert: must set created_by/updated_by to self
create policy "cases: insert own"
on public.cases
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
);

-- Update: any authenticated editor can update any case
create policy "cases: update for authenticated"
on public.cases
for update
to authenticated
using (true)
with check (true);

-- Delete: creator only
create policy "cases: delete creator only"
on public.cases
for delete
to authenticated
using (created_by = auth.uid());

-- Helpful indexes
create index if not exists idx_cases_folder
on public.cases (specialty, subspecialty, hospital, ward);

create index if not exists idx_cases_admission
on public.cases (date_of_admission);

create index if not exists idx_cases_discharge
on public.cases (date_of_discharge);
