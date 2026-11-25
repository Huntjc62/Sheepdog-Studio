-- Sheepdog Studio: initial schema
create extension if not exists pgcrypto;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null default '',
  industry text not null default '',
  location text not null default '',
  website text not null default '',
  audience text not null default '',
  services text not null default '',
  tone text not null default 'Friendly, confident and straightforward',
  goal text not null default 'Generate more enquiries',
  brand_colours text not null default '',
  brand_notes text not null default '',
  credits_remaining integer not null default 100 check (credits_remaining >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_type text not null,
  title text not null default '',
  prompt text not null,
  output text not null,
  credits_used integer not null default 2,
  created_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
alter table public.generations enable row level security;

create policy "Users can read own business profile" on public.business_profiles
 for select using (auth.uid() = user_id);
create policy "Users can insert own business profile" on public.business_profiles
 for insert with check (auth.uid() = user_id);
create policy "Users can update own business profile" on public.business_profiles
 for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read own generations" on public.generations
 for select using (auth.uid() = user_id);
create policy "Users can insert own generations" on public.generations
 for insert with check (auth.uid() = user_id);

-- Atomically spend credits. Called by the authenticated Edge Function using the user's JWT.
create or replace function public.spend_marketing_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare remaining integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorised';
  end if;
  if p_amount < 1 or p_amount > 20 then
    raise exception 'Invalid credit amount';
  end if;
  update public.business_profiles
    set credits_remaining = credits_remaining - p_amount,
        updated_at = now()
    where user_id = p_user_id and credits_remaining >= p_amount
    returning credits_remaining into remaining;
  if remaining is null then
    raise exception 'Insufficient credits or business profile missing';
  end if;
  return remaining;
end;
$$;

revoke all on function public.spend_marketing_credits(uuid, integer) from public;
grant execute on function public.spend_marketing_credits(uuid, integer) to authenticated;
