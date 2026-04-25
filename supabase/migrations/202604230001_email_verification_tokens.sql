-- Email verification tokens table for custom email verification flow
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  token_type text not null check (token_type in ('signup_verification', 'password_reset')),
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Index for token lookup
create index if not exists email_verification_tokens_token_idx on public.email_verification_tokens(token);

-- Index for user_id and token_type lookup
create index if not exists email_verification_tokens_user_type_idx on public.email_verification_tokens(user_id, token_type);

-- RLS: Users can only see their own tokens
alter table public.email_verification_tokens enable row level security;

create policy "users_can_read_own_verification_tokens" 
  on public.email_verification_tokens 
  for select 
  using (auth.uid() = user_id);

create policy "users_can_update_own_verification_tokens" 
  on public.email_verification_tokens 
  for update 
  using (auth.uid() = user_id);

-- Service role can read all (for the API)
create policy "service_role_can_read_all_tokens" 
  on public.email_verification_tokens 
  for select 
  using (auth.role() = 'authenticated');
