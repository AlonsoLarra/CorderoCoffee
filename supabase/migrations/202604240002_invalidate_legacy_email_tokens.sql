-- Revoke all outstanding verification and reset tokens generated before the
-- switch to cryptographically secure token generation.
update public.email_verification_tokens
set used = true,
    updated_at = timezone('utc', now())
where used = false;