-- Seed a test admin account for development/QA purposes.
-- Credentials: admin@corderocoffee.com / AdminCordero2026!
--
-- This inserts directly into auth.users so it works on both local Supabase
-- and remote projects. The UUID is fixed so the migration is idempotent.

create extension if not exists pgcrypto with schema extensions;
do $$
declare
  v_uid uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_existing_uid uuid;
begin
  -- Reuse existing user by email if present; this keeps the migration idempotent
  -- across environments where the admin account may already exist with a different UUID.
  select id into v_existing_uid
  from auth.users
  where email = 'admin@corderocoffee.com'
  limit 1;

  if v_existing_uid is not null then
    v_uid := v_existing_uid;
  elsif not exists (select 1 from auth.users where id = v_uid) then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) values (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@corderocoffee.com',
      extensions.crypt('AdminCordero2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      now(),
      now()
    );
  end if;

  -- Upsert the profile with admin role
  insert into public.profiles (id, role)
  values (v_uid, 'admin')
  on conflict (id) do update set role = 'admin';
end;
$$;
