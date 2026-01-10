-- Ensure pgcrypto is available and gen_random_bytes can be resolved by security-definer functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'gen_random_bytes'
      AND n.nspname = 'public'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'gen_random_bytes'
      AND n.nspname = 'extensions'
  ) THEN
    CREATE FUNCTION public.gen_random_bytes(integer)
    RETURNS bytea
    LANGUAGE sql
    VOLATILE
    STRICT
    AS $fn$
      SELECT extensions.gen_random_bytes($1);
    $fn$;
  END IF;
END$$;

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
      encode(public.gen_random_bytes(6), 'base64'),
      '/', ''), '+', ''), '=', ''),
    1, 8
  ));

  v_token := replace(replace(replace(
    encode(public.gen_random_bytes(24), 'base64'),
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
