-- ============================================================================
-- AptFindr — fix "Google sign-in was rejected by Supabase:
--                Database error saving new user"
-- ============================================================================
-- WHAT THE ERROR MEANS
--   Google OAuth itself succeeds. The INSERT into auth.users then runs the
--   trigger function public.handle_new_auth_user() IN THE SAME TRANSACTION.
--   ANY exception inside that function rolls back the auth user, and Supabase
--   reports the generic "Database error saving new user" back to
--   /auth/callback, which the app displays verbatim.
--
-- TYPICAL OFFENDERS IN THIS SCHEMA (app_users has unique email + username)
--   1. An app_users row ALREADY owns the Google account's email (legacy import
--      via migrateLocalToSupabase.mjs, or an earlier password signup) → the
--      trigger's plain INSERT hits the unique-email constraint.
--   2. Username collision on app_users.username.
--   3. The function RAISEs when metadata is missing (role/username) — older
--      builds or other sign-in entry points may not send metadata.
--   4. The function lacks SECURITY DEFINER, so RLS denies its inserts.
--
-- HOW TO USE
--   Paste this whole file into Supabase Dashboard → SQL Editor → Run.
--   It is idempotent and safe to re-run; it never deletes data — it only
--   replaces the trigger function and rebinds the trigger.
--
-- DIAGNOSTICS (optional, before/after)
--   -- show the currently deployed function source:
--   select pg_get_functiondef(oid) from pg_proc where proname = 'handle_new_auth_user';
--   -- list triggers attached to auth.users:
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--   -- after a failed attempt, the REAL Postgres error is in:
--   --   Dashboard → Database → Logs   (or Auth → Logs)
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer                     -- bypasses RLS; runs as the function owner
set search_path = public
as $$
declare
    meta          jsonb;
    v_role        text;
    v_username    text;
    v_name        text;
    v_mobile      text;
    v_avatar      text;
    v_status      text;
    v_is_verified boolean;
    v_profile_id  uuid;
    v_existing_id uuid;
begin
    meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

    -- Role: trust tenant/landlord/admin metadata, default anything else to
    -- tenant instead of raising (admin accounts are provisioned manually).
    v_role := lower(coalesce(nullif(btrim(meta->>'role'), ''), 'tenant'));
    if v_role not in ('tenant', 'landlord', 'admin') then
        v_role := 'tenant';
    end if;

    -- Username: prefer metadata, otherwise derive a unique one from the id.
    v_username := nullif(btrim(meta->>'username'), '');
    if v_username is null then
        v_username := 'user_' || replace(new.id::text, '-', '');
    end if;
    if exists (select 1 from public.app_users u where u.username = v_username) then
        v_username := v_username || '_' || left(replace(new.id::text, '-', ''), 6);
    end if;

    -- Google provides full_name / avatar_url inside raw_user_meta_data.
    v_name   := nullif(btrim(coalesce(meta->>'name', meta->>'full_name')), '');
    v_mobile := nullif(btrim(meta->>'mobile'), '');
    v_avatar := nullif(btrim(coalesce(meta->>'avatar_url', meta->>'picture', meta->>'avatar')), '');

    if v_role = 'landlord' then
        v_status      := 'pending';
        v_is_verified := false;
    else
        v_status      := 'active';
        v_is_verified := true;
    end if;

    -- 1) If a profile row already owns this email (legacy import or earlier
    --    password signup), LINK it to the new auth user instead of colliding
    --    with the unique email constraint.
    select u.id
      into v_existing_id
      from public.app_users u
     where lower(u.email) = lower(new.email)
     limit 1;

    if v_existing_id is not null then
        update public.app_users u
           set auth_id     = coalesce(u.auth_id, new.id),
               username    = coalesce(u.username, v_username),
               name        = coalesce(u.name, v_name),
               mobile      = coalesce(u.mobile, v_mobile),
               avatar_url  = coalesce(u.avatar_url, v_avatar),
               role        = coalesce(u.role, v_role),
               status      = coalesce(u.status, v_status),
               is_verified = coalesce(u.is_verified, v_is_verified)
         where u.id = v_existing_id;
        v_profile_id := v_existing_id;
    else
        insert into public.app_users
            (id, auth_id, email, username, name, role, status, is_verified, mobile, avatar_url)
        values
            (new.id, new.id, lower(new.email), v_username, v_name,
             v_role, v_status, v_is_verified, v_mobile, v_avatar)
        on conflict (id) do update
           set auth_id = coalesce(app_users.auth_id, excluded.auth_id)
        returning id into v_profile_id;
    end if;

    -- 2) Role profile rows (tenants need none).
    if v_role = 'landlord' then
        insert into public.landlord_profiles (user_id)
        values (v_profile_id)
        on conflict (user_id) do nothing;
    elsif v_role = 'admin' then
        insert into public.admin_profiles (user_id)
        values (v_profile_id)
        on conflict (user_id) do nothing;
    end if;

    return new;
end;
$$;

-- Rebind the trigger (covers the conventional names; if yours differs, list
-- them with the diagnostics above and drop the extra one).
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_trigger on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_auth_user();
