-- ================================================
-- SECURITY LINT FIXES
-- Addresses Supabase linter warnings for:
-- 1. Mutable search_path in functions
-- 2. Overly permissive RLS policies
-- ================================================

-- ------------------------------------------------
-- 1. DROP UNUSED TABLES (removes 12 overly permissive policies)
-- These tables are not used in the application
-- ------------------------------------------------
DROP TABLE IF EXISTS public.class_action_docs CASCADE;
DROP TABLE IF EXISTS public.class_action_personas CASCADE;
DROP TABLE IF EXISTS public.class_actions CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- ------------------------------------------------
-- 2. FIX user_organization_roles UPDATE POLICY
-- The WITH CHECK clause was too permissive (true)
-- ------------------------------------------------
DROP POLICY IF EXISTS user_org_roles_update_admin ON public.user_organization_roles;
CREATE POLICY user_org_roles_update_admin ON public.user_organization_roles
  FOR UPDATE
  USING (public.has_active_role(organization_id, ARRAY['admin'::text]))
  WITH CHECK (public.has_active_role(organization_id, ARRAY['admin'::text]));

-- ------------------------------------------------
-- 3. FIX FUNCTION SEARCH PATHS
-- All functions need SET search_path = '' for security
-- ------------------------------------------------

-- 3a. update_event_rsvps_updated_at
CREATE OR REPLACE FUNCTION public.update_event_rsvps_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- 3b. alumni_bucket_limit
CREATE OR REPLACE FUNCTION public.alumni_bucket_limit(p_bucket text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_bucket = 'none' OR p_bucket IS NULL THEN 0
    WHEN p_bucket = '0-200' THEN 200
    WHEN p_bucket = '201-600' THEN 600
    WHEN p_bucket = '601-1500' THEN 1500
    WHEN p_bucket = '1500+' THEN NULL
    ELSE 0
  END;
$$;

-- 3c. get_alumni_quota
CREATE OR REPLACE FUNCTION public.get_alumni_quota(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_bucket text;
  v_limit integer;
  v_count integer;
  v_status text;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Only admins can view alumni quota',
      'bucket', 'none',
      'alumni_limit', 0,
      'alumni_count', 0,
      'remaining', 0
    );
  END IF;

  SELECT alumni_bucket, status
  INTO v_bucket, v_status
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id
  LIMIT 1;

  v_bucket := COALESCE(v_bucket, 'none');
  v_limit := public.alumni_bucket_limit(v_bucket);

  SELECT COUNT(*) INTO v_count
  FROM public.alumni
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'allowed', true,
    'bucket', v_bucket,
    'status', COALESCE(v_status, 'pending'),
    'alumni_limit', v_limit,
    'alumni_count', v_count,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(v_limit - v_count, 0) END
  );
END;
$$;

-- 3d. can_add_alumni
CREATE OR REPLACE FUNCTION public.can_add_alumni(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_bucket text;
  v_limit integer;
  v_count integer;
BEGIN
  SELECT COALESCE(alumni_bucket, 'none')
  INTO v_bucket
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id
  LIMIT 1;

  v_limit := public.alumni_bucket_limit(v_bucket);

  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.alumni
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL;

  RETURN v_count < v_limit;
END;
$$;

-- 3e. assert_alumni_quota
CREATE OR REPLACE FUNCTION public.assert_alumni_quota(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT public.can_add_alumni(p_org_id) THEN
    RAISE EXCEPTION 'Alumni quota reached for this plan. Upgrade your subscription to add more alumni.';
  END IF;
END;
$$;

-- 3f. create_org_invite
CREATE OR REPLACE FUNCTION public.create_org_invite(
  p_organization_id uuid,
  p_role text DEFAULT 'active_member',
  p_uses int DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS public.organization_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_token text;
  v_result public.organization_invites;
BEGIN
  IF NOT public.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;

  IF p_role NOT IN ('admin', 'active_member', 'alumni') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, active_member, or alumni';
  END IF;

  IF p_role = 'alumni' THEN
    PERFORM public.assert_alumni_quota(p_organization_id);
  END IF;

  v_code := upper(substr(
    replace(replace(replace(
      encode(gen_random_bytes(6), 'base64'),
      '/', ''), '+', ''), '=', ''),
    1, 8
  ));

  v_token := replace(replace(replace(
    encode(gen_random_bytes(24), 'base64'),
    '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.organization_invites (
    organization_id,
    code,
    token,
    role,
    uses_remaining,
    expires_at,
    created_by_user_id
  )
  VALUES (
    p_organization_id,
    v_code,
    v_token,
    p_role,
    p_uses,
    p_expires_at,
    auth.uid()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 3g. handle_org_member_sync
CREATE OR REPLACE FUNCTION public.handle_org_member_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_email text;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
  v_member_id uuid;
  v_alumni_id uuid;
BEGIN
  SELECT
    email,
    COALESCE(raw_user_meta_data->>'first_name', split_part(COALESCE(raw_user_meta_data->>'full_name', 'Member'), ' ', 1)),
    COALESCE(raw_user_meta_data->>'last_name', split_part(COALESCE(raw_user_meta_data->>'full_name', ''), ' ', 2)),
    raw_user_meta_data->>'avatar_url'
  INTO v_user_email, v_first_name, v_last_name, v_avatar_url
  FROM auth.users
  WHERE id = NEW.user_id;

  v_first_name := COALESCE(v_first_name, 'Member');
  v_last_name := COALESCE(v_last_name, '');

  SELECT id INTO v_member_id
  FROM public.members
  WHERE organization_id = NEW.organization_id
    AND (user_id = NEW.user_id OR (email IS NOT NULL AND email = v_user_email))
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.members
    SET
      user_id = NEW.user_id,
      role = NEW.role,
      status = NEW.status::text::public.member_status,
      updated_at = now()
    WHERE id = v_member_id;
  ELSE
    INSERT INTO public.members (
      organization_id,
      user_id,
      first_name,
      last_name,
      email,
      photo_url,
      role,
      status
    )
    VALUES (
      NEW.organization_id,
      NEW.user_id,
      v_first_name,
      v_last_name,
      v_user_email,
      v_avatar_url,
      NEW.role,
      NEW.status::text::public.member_status
    );
  END IF;

  IF NEW.role = 'alumni' THEN
    SELECT id INTO v_alumni_id
    FROM public.alumni
    WHERE organization_id = NEW.organization_id
      AND (user_id = NEW.user_id OR (email IS NOT NULL AND email = v_user_email))
    LIMIT 1;

    IF v_alumni_id IS NOT NULL THEN
       UPDATE public.alumni
       SET
         user_id = NEW.user_id,
         updated_at = now()
       WHERE id = v_alumni_id;
    ELSE
       PERFORM public.assert_alumni_quota(NEW.organization_id);

       INSERT INTO public.alumni (
         organization_id,
         user_id,
         first_name,
         last_name,
         email,
         photo_url
       )
       VALUES (
         NEW.organization_id,
         NEW.user_id,
         v_first_name,
         v_last_name,
         v_user_email,
         v_avatar_url
       );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3h. increment_donation_stats
CREATE OR REPLACE FUNCTION public.increment_donation_stats(
  p_org_id uuid,
  p_amount_delta bigint,
  p_count_delta integer,
  p_last timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.organization_donation_stats (
    organization_id,
    total_amount_cents,
    donation_count,
    last_donation_at
  )
  VALUES (
    p_org_id,
    COALESCE(p_amount_delta, 0),
    COALESCE(p_count_delta, 0),
    p_last
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    total_amount_cents = public.organization_donation_stats.total_amount_cents + COALESCE(p_amount_delta, 0),
    donation_count = public.organization_donation_stats.donation_count + COALESCE(p_count_delta, 0),
    last_donation_at = COALESCE(
      GREATEST(public.organization_donation_stats.last_donation_at, excluded.last_donation_at),
      public.organization_donation_stats.last_donation_at,
      excluded.last_donation_at
    ),
    updated_at = timezone('utc', now());
END;
$$;

-- 3i. can_edit_page
CREATE OR REPLACE FUNCTION public.can_edit_page(org_id uuid, path text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    public.has_active_role(org_id, array['admin'])
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      CROSS JOIN LATERAL (
        SELECT COALESCE(o.nav_config -> path -> 'editRoles', '["admin"]'::jsonb) AS roles
      ) cfg
      CROSS JOIN LATERAL jsonb_array_elements_text(cfg.roles) AS r(role)
      WHERE o.id = org_id
        AND (
          (r.role = 'admin' AND public.has_active_role(org_id, array['admin']))
          OR (r.role = 'active_member' AND public.has_active_role(org_id, array['active_member']))
          OR (r.role = 'alumni' AND public.has_active_role(org_id, array['alumni']))
        )
    );
$$;
