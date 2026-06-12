-- Upriver scaffold-template — initial schema
-- Public tables: inquiries, newsletter_signups, reviews, change_requests, documents, services
-- Admin users are managed by Supabase Auth (auth.users) — no app-level auth tables.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------
-- Public data
-- ----------------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  source text,
  status text not null default 'new' check (status in ('new','read','replied','archived'))
);
create index if not exists idx_inquiries_created on public.inquiries(created_at desc);

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  name text,
  source text,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed'))
);
create index if not exists idx_newsletter_signups_created on public.newsletter_signups(created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  source text,
  status text not null default 'pending' check (status in ('pending','approved','hidden'))
);

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  github_issue_url text,
  github_issue_number int,
  status text not null default 'open' check (status in ('open','in_progress','pr_open','closed')),
  requested_by text
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null default 'general',
  file_url text not null,
  uploaded_by text
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text not null,
  price text,
  status text not null default 'active' check (status in ('active','draft','archived'))
);

-- ----------------------------------------------------------------
-- RPC: submit_inquiry (callable with the anon key from /api/inquiry)
-- ----------------------------------------------------------------
create or replace function public.submit_inquiry(p_name text, p_email text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name is required'; end if;
  if length(trim(coalesce(p_email, ''))) = 0 then raise exception 'email is required'; end if;
  if length(trim(coalesce(p_message, ''))) = 0 then raise exception 'message is required'; end if;

  insert into public.inquiries (name, email, message, source)
  values (trim(p_name), trim(p_email), trim(p_message), 'web-form')
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.submit_inquiry(text, text, text) to anon, authenticated;

-- ----------------------------------------------------------------
-- RPC: subscribe_newsletter (callable with the anon key from /api/newsletter)
-- Mirrors submit_inquiry: anon writes go through this function only.
-- Re-subscribing an existing email flips it back to 'subscribed'.
-- ----------------------------------------------------------------
create or replace function public.subscribe_newsletter(p_email text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if length(trim(coalesce(p_email, ''))) = 0 then raise exception 'email is required'; end if;
  if position('@' in p_email) = 0 then raise exception 'email is invalid'; end if;

  insert into public.newsletter_signups (email, name, source)
  values (lower(trim(p_email)), nullif(trim(coalesce(p_name, '')), ''), 'web-form')
  on conflict (email) do update set status = 'subscribed'
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

-- ----------------------------------------------------------------
-- Row-level security
-- Writes from anon are only allowed through the RPCs above.
-- Admin routes use the service-role key which bypasses RLS.
-- ----------------------------------------------------------------
alter table public.inquiries enable row level security;
alter table public.newsletter_signups enable row level security;
alter table public.reviews enable row level security;
alter table public.change_requests enable row level security;
alter table public.documents enable row level security;
alter table public.services enable row level security;

create policy "public can read approved reviews" on public.reviews
  for select using (status = 'approved');

create policy "public can read active services" on public.services
  for select using (status = 'active');
