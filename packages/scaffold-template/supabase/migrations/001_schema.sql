-- Upriver scaffold-template — initial schema
-- Public tables: inquiries, reviews, change_requests, documents, services
-- Auth tables: auth_users, auth_sessions, auth_accounts, auth_verification_tokens

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------
-- Auth (Better Auth compatible)
-- ----------------------------------------------------------------
create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified boolean not null default false,
  name text,
  hashed_password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_sessions_user on public.auth_sessions(user_id);
create index if not exists idx_auth_sessions_token on public.auth_sessions(token);

create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  provider_id text not null,
  account_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_id, account_id)
);

create table if not exists public.auth_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

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
-- RPC: submit_inquiry (callable with the anon key from the public form)
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
-- Row-level security
-- Writes from anon are only allowed through the submit_inquiry RPC.
-- Admin routes use the service-role key which bypasses RLS.
-- ----------------------------------------------------------------
alter table public.inquiries enable row level security;
alter table public.reviews enable row level security;
alter table public.change_requests enable row level security;
alter table public.documents enable row level security;
alter table public.services enable row level security;
alter table public.auth_users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_accounts enable row level security;
alter table public.auth_verification_tokens enable row level security;

create policy "public can read approved reviews" on public.reviews
  for select using (status = 'approved');

create policy "public can read active services" on public.services
  for select using (status = 'active');
