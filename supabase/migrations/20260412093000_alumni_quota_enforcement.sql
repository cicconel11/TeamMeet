-- Enforce alumni quotas based on subscription bucket and surface quota info

-- Map bucket string to numeric limit (NULL means no cap)
CREATE OR REPLACE FUNCTION public.alumni_bucket_limit(p_bucket text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_bucket = 'none' OR p_bucket IS NULL THEN 0
    WHEN p_bucket = '0-200' THEN 200
    WHEN p_bucket = '201-600' THEN 600
    WHEN p_bucket = '601-1500' THEN 1500
    WHEN p_bucket = '1500+' THEN NULL -- sales-led, effectively unlimited here
    ELSE 0
  END;
$$;

-- Return quota + usage for an organization (admin only)
CREATE OR REPLACE FUNCTION public.get_alumni_quota(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

-- Boolean helper for RLS + triggers
CREATE OR REPLACE FUNCTION public.can_add_alumni(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

  -- No cap for sales-led bucket
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

-- Raise a friendly error when quota is exceeded
CREATE OR REPLACE FUNCTION public.assert_alumni_quota(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT public.can_add_alumni(p_org_id) THEN
    RAISE EXCEPTION 'Alumni quota reached for this plan. Upgrade your subscription to add more alumni.';
  END IF;
END;
$$;

-- Tighten alumni insert policy to enforce quota
DROP POLICY IF EXISTS alumni_insert ON public.alumni;
CREATE POLICY alumni_insert ON public.alumni
  FOR INSERT
  WITH CHECK (
    public.is_org_admin(organization_id)
    AND public.can_add_alumni(organization_id)
  );

-- Recreate invite RPC to block alumni invites when over quota
CREATE OR REPLACE FUNCTION public.create_org_invite(
  p_organization_id uuid,
  p_role text DEFAULT 'active_member',
  p_uses int DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS public.organization_invites
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_token text;
  v_result public.organization_invites;
BEGIN
  -- Verify caller is admin of the organization
  IF NOT public.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Only organization admins can create invites';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'active_member', 'alumni') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, active_member, or alumni';
  END IF;

  -- Respect alumni quota for alumni invites
  IF p_role = 'alumni' THEN
    PERFORM public.assert_alumni_quota(p_organization_id);
  END IF;
  
  -- Generate secure random code (8 chars, alphanumeric, no confusing chars)
  v_code := upper(substr(
    replace(replace(replace(
      encode(gen_random_bytes(6), 'base64'),
      '/', ''), '+', ''), '=', ''),
    1, 8
  ));
  
  -- Generate secure token (32 chars for URL-based invites)
  v_token := replace(replace(replace(
    encode(gen_random_bytes(24), 'base64'),
    '/', '_'), '+', '-'), '=', '');
  
  -- Insert the invite
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

-- Recreate sync trigger to guard alumni profile creation
CREATE OR REPLACE FUNCTION public.handle_org_member_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
  v_member_id uuid;
  v_alumni_id uuid;
BEGIN
  -- Get user details from auth.users
  SELECT 
    email,
    COALESCE(raw_user_meta_data->>'first_name', split_part(COALESCE(raw_user_meta_data->>'full_name', 'Member'), ' ', 1)),
    COALESCE(raw_user_meta_data->>'last_name', split_part(COALESCE(raw_user_meta_data->>'full_name', ''), ' ', 2)),
    raw_user_meta_data->>'avatar_url'
  INTO v_user_email, v_first_name, v_last_name, v_avatar_url
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Ensure we have defaults if auth data is missing
  v_first_name := COALESCE(v_first_name, 'Member');
  v_last_name := COALESCE(v_last_name, '');

  -- 1. Sync to public.members
  -- Check if member entry exists for this user+org (by user_id OR email)
  SELECT id INTO v_member_id 
  FROM public.members 
  WHERE organization_id = NEW.organization_id 
    AND (user_id = NEW.user_id OR (email IS NOT NULL AND email = v_user_email))
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    -- Update existing member
    UPDATE public.members
    SET 
      user_id = NEW.user_id, -- Link user_id if it was missing
      role = NEW.role,
      status = NEW.status::text::public.member_status,
      updated_at = now()
    WHERE id = v_member_id;
  ELSE
    -- Insert new member
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

  -- 2. Sync to public.alumni if role is ALUMNI
  IF NEW.role = 'alumni' THEN
    SELECT id INTO v_alumni_id
    FROM public.alumni
    WHERE organization_id = NEW.organization_id
      AND (user_id = NEW.user_id OR (email IS NOT NULL AND email = v_user_email))
    LIMIT 1;

    IF v_alumni_id IS NOT NULL THEN
       -- Existing alumni, just link user_id and touch updated_at
       UPDATE public.alumni 
       SET 
         user_id = NEW.user_id,
         updated_at = now() 
       WHERE id = v_alumni_id;
    ELSE
       -- Enforce alumni quota before creating a new profile
       PERFORM public.assert_alumni_quota(NEW.organization_id);

       -- Create alumni profile
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
