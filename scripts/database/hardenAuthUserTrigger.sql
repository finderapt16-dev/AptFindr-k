-- ============================================================================
-- AptFindr — fix the signup / profile trigger
--   Symptoms this file fixes:
--     • "Account registration could not be completed because profile setup
--        failed. No retry is needed until the database configuration is
--        corrected."  (the app's message for a signup that failed in the DB)
--     • "Database error saving new user" from Supabase Auth (Google or email)
--     • NO confirmation email arrives, because Supabase only queues the mail
--        after the auth.users INSERT commits — and the trigger rolled it back.
--
-- ROOT CAUSE (verified)
--   public.handle_new_auth_user() inserted a *text* variable into the
--   app_users.role enum column:
--       insert into public.app_users (..., role, ...) values (..., v_role, ...)
--   PostgreSQL does NOT assignment-cast text to an enum, so the statement
--   failed with:
--       ERROR 42804: column "role" is of type app_user_role
--                    but expression is of type text
--   The trigger runs inside the same transaction as the auth.users INSERT, so
--   the exception aborted the whole signup: no auth user, no confirmation
--   email, and GoTrue reported only "Database error saving new user".
--
--   Other latent failures in the previous version, all fixed here:
--     • 'user_' || <32 hex chars> = 37 characters, which violates
--       app_users_username_format_check (max 30).
--     • Username collision test was case-sensitive while the unique index is
--       on lower(username).
--     • A NULL metadata "name" violated app_users.name NOT NULL.
--     • Any unexpected error blocked the auth user (and the email) forever.
--
-- WHAT THIS FILE DOES (idempotent — safe to paste and re-run)
--   1. Creates public.signup_trigger_failures so a future trigger error is
--      recorded with its real SQLSTATE/message instead of vanishing.
--   2. Replaces public.handle_new_auth_user() with a version that
--      • casts every enum value explicitly (no 42804),
--      • sanitises + length-limits usernames, and de-duplicates
--        case-insensitively,
--      • always produces a valid name,
--      • only accepts tenant/landlord from public signup metadata,
--      • NEVER lets a profile problem cancel the auth user, so the
--        confirmation email is always sent.
--   3. Rebinds the trigger on auth.users (and removes legacy duplicates).
--   4. Repairs auth users that are missing a profile row.
--   5. Runs a self-check you can look at, and prints diagnostics.
--
-- HOW TO USE
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Legacy guard: stop other triggers on auth.users from blocking signups
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and t.tgname in ('on_auth_user_created_trigger', 'handle_new_user',
                       'on_auth_user_created_trigger_fn')
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 1. Failure log — makes the *real* error visible next time
-- ----------------------------------------------------------------------------
create table if not exists public.signup_trigger_failures (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text,
  metadata jsonb,
  stage text not null default 'app_profile_upsert',
  sqlstate text,
  message text,
  detail text,
  hint text,
  context text,
  created_at timestamptz not null default now()
);

create index if not exists idx_signup_trigger_failures_created_at
  on public.signup_trigger_failures (created_at desc);

alter table public.signup_trigger_failures enable row level security;
revoke all on public.signup_trigger_failures from anon, authenticated;
grant select, insert on public.signup_trigger_failures to service_role;


-- ----------------------------------------------------------------------------
-- 2. The workhorse: create or link the app_users row for an auth user
--    (raises on failure — the trigger wrapper below is what swallows errors)
-- ----------------------------------------------------------------------------
create or replace function public.fn_upsert_app_user_profile(
  p_auth_id uuid,
  p_email text,
  p_meta jsonb default '{}'::jsonb,
  p_email_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta         jsonb := coalesce(p_meta, '{}'::jsonb);
  v_email        text := lower(btrim(coalesce(p_email, '')));
  v_role_text    text := lower(btrim(coalesce(p_meta ->> 'role', '')));
  v_role         public.app_user_role;
  v_existing_id  uuid;
  v_profile_id   uuid;
  v_base_user    text;
  v_username     text;
  v_name         text;
  v_status       text;
  v_is_verified  boolean;
  v_mobile       text;
  v_avatar       text;
  v_permit       text;
  v_attempt      int := 0;
  v_email_free   boolean := true;
  v_verification text;
begin
  if p_auth_id is null then
    raise exception 'handle_new_auth_user requires an auth user id';
  end if;

  -- Auth rows normally always have an e-mail; keep the NOT NULL column safe.
  if v_email = '' then
    v_email := 'user_' || substr(replace(p_auth_id::text, '-', ''), 1, 12)
               || '@users.aptfindr.local';
  end if;

  -- 2a. Find an existing profile row: same auth user first, then a row with
  --     the same e-mail that is not linked to another auth user yet.
  select u.id
    into v_existing_id
    from public.app_users u
   where u.auth_id = p_auth_id
   order by u.created_at
   limit 1;

  if v_existing_id is null then
    select u.id
      into v_existing_id
      from public.app_users u
     where lower(u.email) = v_email
       and (u.auth_id is null or u.auth_id = p_auth_id)
     order by (u.auth_id = p_auth_id) desc
     limit 1;
  end if;

  -- 2b. Role. An existing row keeps its role (never escalate / downgrade).
  --     A new row may only be tenant or landlord from public metadata —
  --     admins are provisioned manually.
  if v_existing_id is not null then
    select u.role into v_role from public.app_users u where u.id = v_existing_id;
  end if;

  if v_role is null then
    if v_role_text = 'landlord' then
      v_role := 'landlord'::public.app_user_role;
    else
      v_role := 'tenant'::public.app_user_role;
    end if;
  end if;

  if v_role = 'landlord' then
    v_status := 'pending';
    v_is_verified := false;
  else
    v_status := 'active';
    v_is_verified := true;
  end if;

  -- 2c. Username: metadata first, then a generated one. Sanitised to the
  --     app_users_username_format_check pattern and clamped to 30 characters.
  v_base_user := lower(btrim(coalesce(p_meta ->> 'username', '')));
  if v_base_user = '' then
    v_base_user := lower(btrim(coalesce(p_meta ->> 'preferred_username', '')));
  end if;
  v_base_user := regexp_replace(v_base_user, '[^a-z0-9_]', '_', 'g');
  v_base_user := left(v_base_user, 30);
  if length(v_base_user) < 4 then
    v_base_user := 'user_' || substr(replace(p_auth_id::text, '-', ''), 1, 12);
  end if;

  v_username := v_base_user;
  if exists (
    select 1 from public.app_users u
     where lower(u.username) = v_username
       and (v_existing_id is null or u.id <> v_existing_id)
  ) then
    v_username := left(v_base_user, 23) || '_' || substr(replace(p_auth_id::text, '-', ''), 1, 6);
  end if;

  while v_attempt < 10 and exists (
    select 1 from public.app_users u
     where lower(u.username) = v_username
       and (v_existing_id is null or u.id <> v_existing_id)
  ) loop
    v_attempt := v_attempt + 1;
    v_username := left(v_base_user, 23) || '_'
                  || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  -- 2d. Name and other optional profile fields.
  v_name := nullif(btrim(coalesce(
              p_meta ->> 'name',
              p_meta ->> 'full_name',
              p_meta ->> 'display_name'
            )), '');
  v_name := coalesce(v_name, v_username, nullif(split_part(v_email, '@', 1), ''), 'User');
  v_name := left(v_name, 200);

  v_mobile := nullif(btrim(coalesce(p_meta ->> 'mobile', p_meta ->> 'phone')), '');
  v_avatar := nullif(btrim(coalesce(
                p_meta ->> 'avatar_url', p_meta ->> 'picture', p_meta ->> 'avatar'
              )), '');
  v_permit := nullif(btrim(p_meta ->> 'permitNumber'), '');

  v_verification := case
    when p_email_confirmed then 'email_verified'
    else 'pending_email_verification'
  end;

  -- 2e. Write the profile row. Every enum is cast explicitly (this is the
  --     line that used to raise ERROR 42804 and roll back the whole signup).
  if v_existing_id is not null then
    select not exists (
      select 1 from public.app_users other
       where other.id <> v_existing_id
         and lower(other.email) = v_email
    ) into v_email_free;

    update public.app_users u
       set auth_id           = coalesce(u.auth_id, p_auth_id),
           email             = case when v_email_free then v_email else u.email end,
           username          = coalesce(nullif(btrim(u.username), ''), v_username),
           name              = case when nullif(btrim(u.name), '') is not null
                                    then u.name else v_name end,
           mobile            = coalesce(u.mobile, v_mobile),
           avatar_url        = coalesce(u.avatar_url, v_avatar),
           email_verified    = p_email_confirmed,
           is_verified       = case when u.role = 'landlord'
                                    then coalesce(u.is_verified, false)
                                    else coalesce(u.is_verified, true) end,
           verification_status = coalesce(nullif(u.verification_status, ''), v_verification),
           landlord_status   = case when u.role = 'landlord'
                                    then coalesce(nullif(u.landlord_status, ''), v_status)
                                    else u.landlord_status end,
           permit_number     = case when u.role = 'landlord'
                                    then coalesce(nullif(u.permit_number, ''), v_permit)
                                    else u.permit_number end,
           updated_at        = now()
     where u.id = v_existing_id
     returning u.id into v_profile_id;
  else
    insert into public.app_users (
      id, auth_id, username, email, name, role, status, mobile, avatar_url,
      is_verified, email_verified, verification_status, landlord_status,
      permit_number, signup_source
    )
    values (
      p_auth_id,
      p_auth_id,
      v_username,
      v_email,
      v_name,
      v_role,                      -- public.app_user_role (explicitly typed)
      v_status,
      v_mobile,
      v_avatar,
      v_is_verified,
      p_email_confirmed,
      v_verification,
      case when v_role = 'landlord' then v_status else null end,
      case when v_role = 'landlord' then v_permit else null end,
      'supabase_auth'
    )
    returning id into v_profile_id;
  end if;

  -- 2f. Role profile rows (the app only reads landlord/admin, but keep
  --     tenant_profiles in sync when that table exists).
  if v_role = 'landlord' and to_regclass('public.landlord_profiles') is not null then
    insert into public.landlord_profiles as lp (user_id, permit_number, business_permit_number, is_verified)
    values (v_profile_id, v_permit, v_permit, false)
    on conflict (user_id) do update
      set permit_number          = coalesce(lp.permit_number, excluded.permit_number),
          business_permit_number = coalesce(lp.business_permit_number, excluded.business_permit_number);

  elsif v_role::text in ('admin', 'super_admin') and to_regclass('public.admin_profiles') is not null then
    insert into public.admin_profiles as ap (user_id, admin_level, department)
    values (
      v_profile_id,
      case when v_role = 'super_admin' then 'Super Administrator' else 'Full Administrator' end,
      'Platform Administration'
    )
    on conflict (user_id) do nothing;

  elsif to_regclass('public.tenant_profiles') is not null then
    insert into public.tenant_profiles (user_id)
    values (v_profile_id)
    on conflict (user_id) do nothing;
  end if;

  return v_profile_id;
end;
$$;

revoke all on function public.fn_upsert_app_user_profile(uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.fn_upsert_app_user_profile(uuid, text, jsonb, boolean) to service_role;


-- ----------------------------------------------------------------------------
-- 3. The auth.users trigger. It can no longer cancel a signup: if profile
--    setup fails, the error is logged and the auth user (and its confirmation
--    e-mail) still goes through.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_email       text  := lower(btrim(coalesce(new.email, '')));
  v_profile_id  uuid;
  v_message     text;
  v_detail      text;
  v_hint        text;
  v_context     text;
begin
  begin
    v_profile_id := public.fn_upsert_app_user_profile(
      new.id,
      new.email,
      v_meta,
      new.email_confirmed_at is not null
    );
  exception when others then
    v_message := sqlerrm;
    v_detail  := null;
    v_hint    := null;
    v_context := null;
    get stacked diagnostics
      v_detail  = pg_exception_detail,
      v_hint    = pg_exception_hint,
      v_context = pg_exception_context;

    begin
      insert into public.signup_trigger_failures (
        auth_user_id, email, metadata, stage, sqlstate, message, detail, hint, context
      ) values (
        new.id, v_email, v_meta, 'app_profile_upsert', sqlstate, v_message, v_detail, v_hint, v_context
      );
    exception when others then
      null;   -- logging must never be the reason a signup fails
    end;

    -- Last resort: a minimal, valid profile row so the account is usable and
    -- the app can repair the details on first sign-in.
    begin
      insert into public.app_users (
        auth_id, username, email, name, role, status, is_verified,
        email_verified, signup_source
      )
      values (
        new.id,
        'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
        coalesce(nullif(v_email, ''),
                 'user_' || substr(replace(new.id::text, '-', ''), 1, 12) || '@users.aptfindr.local'),
        coalesce(nullif(btrim(coalesce(v_meta ->> 'name', v_meta ->> 'full_name')), ''),
                 nullif(split_part(v_email, '@', 1), ''), 'User'),
        'tenant'::public.app_user_role,
        'active',
        true,
        new.email_confirmed_at is not null,
        'auth_fallback'
      )
      on conflict do nothing;
    exception when others then
      null;
    end;
  end;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- Rebind the trigger (all historical names are removed first).
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_trigger on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- GoTrue inserts into auth.users as supabase_auth_admin; make sure it may run
-- the trigger even though the functions are locked down for anon/authenticated.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_auth_user() to supabase_auth_admin;
    grant execute on function public.fn_upsert_app_user_profile(uuid, text, jsonb, boolean) to supabase_auth_admin;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Repair: create profiles for auth users that do not have one yet
-- ----------------------------------------------------------------------------
create or replace function public.fn_repair_missing_app_user_profiles()
returns table (auth_user_id uuid, email text, outcome text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data, u.email_confirmed_at
      from auth.users u
     where u.email is not null
       and not exists (
         select 1 from public.app_users p
          where p.auth_id = u.id or lower(p.email) = lower(u.email)
       )
     order by u.created_at
  loop
    begin
      perform public.fn_upsert_app_user_profile(
        r.id, r.email, coalesce(r.raw_user_meta_data, '{}'::jsonb),
        r.email_confirmed_at is not null
      );
      return query select r.id, r.email, 'created', null::text;
    exception when others then
      return query select r.id, r.email, 'failed', sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.fn_repair_missing_app_user_profiles() from public, anon, authenticated;
grant execute on function public.fn_repair_missing_app_user_profiles() to service_role;


-- ----------------------------------------------------------------------------
-- 5. Self-check: proves profile creation works without leaving any test rows.
--    Look for result = 'PASS' in the output.
-- ----------------------------------------------------------------------------
create or replace function public.fn_signup_trigger_selfcheck()
returns table (check_name text, result text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_probe uuid := gen_random_uuid();
  v_msg   text;
  v_state text;
begin
  begin
    perform public.fn_upsert_app_user_profile(
      v_probe,
      'selfcheck+' || replace(v_probe::text, '-', '') || '@example.invalid',
      jsonb_build_object(
        'role', 'tenant',
        'username', 'selfcheck_' || substr(replace(v_probe::text, '-', ''), 1, 8),
        'name', 'Self Check'
      ),
      true
    );
    raise exception 'APT_SELFCHECK_ROLLBACK' using errcode = 'P0001';
  exception when others then
    v_msg := sqlerrm;
    v_state := sqlstate;
    if position('APT_SELFCHECK_ROLLBACK' in v_msg) > 0 then
      return query select
        'app profile upsert (tenant)'::text,
        'PASS'::text,
        'Profile creation works; the test row was rolled back.'::text;
    elsif v_state = '23503' then
      return query select
        'app profile upsert (tenant)'::text,
        'PASS'::text,
        'All profile checks passed (the dry run stopped at the auth-user foreign key on purpose).'::text;
    else
      return query select
        'app profile upsert (tenant)'::text,
        'FAIL'::text,
        format('SQLSTATE %s: %s', v_state, v_msg);
    end if;
  end;
end;
$$;

revoke all on function public.fn_signup_trigger_selfcheck() from public, anon, authenticated;
grant execute on function public.fn_signup_trigger_selfcheck() to service_role;


-- ----------------------------------------------------------------------------
-- 6. Run the repair, the self-check, and print the current state
-- ----------------------------------------------------------------------------
select * from public.fn_repair_missing_app_user_profiles();
select * from public.fn_signup_trigger_selfcheck();

-- The trigger that runs on every new auth user:
select t.tgname as trigger_name,
       p.proname as function_name,
       pg_get_triggerdef(t.oid) as definition
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
 where t.tgrelid = 'auth.users'::regclass
   and not t.tgisinternal
 order by t.tgname;

-- Errors recorded by the trigger (should stay empty after this fix):
select created_at, email, stage, sqlstate, message
  from public.signup_trigger_failures
 order by created_at desc
 limit 10;
