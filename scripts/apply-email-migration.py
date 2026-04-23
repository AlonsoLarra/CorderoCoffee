#!/usr/bin/env python3
"""
Apply Supabase migration for email verification tokens table.
This script uses the Supabase REST API to execute the SQL migration.
"""

import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Configuration
SUPABASE_URL = "https://kstbgnyikroliavpuehi.supabase.co"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    sys.exit(1)

# Migration SQL
MIGRATION_SQL = """-- Email verification tokens table for custom email verification flow
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
  using (auth.role() = 'authenticated');"""

def apply_migration():
    """Apply the migration using Supabase REST API"""
    
    print("Applying email verification tokens migration...")
    print(f"Target: {SUPABASE_URL}")
    print("-" * 60)
    
    # Use the PostgreSQL REST API endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "query": MIGRATION_SQL
    }
    
    try:
        req = Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        with urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("✅ Migration applied successfully!")
            print(json.dumps(result, indent=2))
            return True
    except HTTPError as e:
        error_body = e.read().decode()
        print(f"❌ Failed to apply migration: {e.code}")
        print(error_body)
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_table_exists():
    """Check if the email_verification_tokens table exists"""
    
    url = f"{SUPABASE_URL}/rest/v1/email_verification_tokens?limit=0"
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req) as response:
            print("✅ Table 'email_verification_tokens' exists and is accessible")
            return True
    except HTTPError as e:
        if e.code == 404:
            print("❌ Table 'email_verification_tokens' does not exist yet")
        else:
            print(f"❌ Error checking table: {e.code} {e.reason}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # First, check if table already exists
    print("\n1. Checking if table already exists...")
    if check_table_exists():
        print("\n✅ Migration already applied!")
        sys.exit(0)
    
    print("\n2. Attempting to apply migration...")
    print("Note: The Supabase API may not support direct SQL execution.")
    print("If this fails, you'll need to apply the migration manually via the dashboard.")
    
    # Try to apply via REST
    result = apply_migration()
    
    if result:
        print("\n3. Verifying migration...")
        if check_table_exists():
            print("\n✅ All done! The email verification system is ready.")
        else:
            print("\n⚠ Migration may not have completed. Check Supabase dashboard.")
    else:
        print("\n⚠ Could not apply via REST API. Instructions for manual application:")
        print("\n1. Go to: https://supabase.com/dashboard/project/kstbgnyikroliavpuehi/sql")
        print("2. Click 'New' to create a new query")
        print("3. Paste the contents of: supabase/migrations/202604230001_email_verification_tokens.sql")
        print("4. Click 'Run' to execute")
