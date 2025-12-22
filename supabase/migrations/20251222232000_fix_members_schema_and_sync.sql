-- Consolidated repair migration to ensure member sync works correctly

-- 1. Ensure schema is correct (idempotent)
DO $$
BEGIN
  -- Add pending status if missing
  ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN undefined_object THEN null; 
  WHEN duplicate_object THEN null;
END $$;

-- Add user_id column if missing to members/alumni
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS members_user_id_idx ON public.members(user_id);
CREATE INDEX IF NOT EXISTS alumni_user_id_idx ON public.alumni(user_id);

-- 2. Define/Update the Sync Function
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

  -- Ensure we have defaults
  v_first_name := COALESCE(v_first_name, 'Member');
  v_last_name := COALESCE(v_last_name, '');

  -- Sync to public.members (Link by user_id OR email)
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

  -- Sync to public.alumni if role is ALUMNI
  IF NEW.role = 'alumni' THEN
    SELECT id INTO v_alumni_id
    FROM public.alumni
    WHERE organization_id = NEW.organization_id
      AND (user_id = NEW.user_id OR (email IS NOT NULL AND email = v_user_email))
    LIMIT 1;

    IF v_alumni_id IS NOT NULL THEN
       UPDATE public.alumni 
       SET user_id = NEW.user_id, updated_at = now() 
       WHERE id = v_alumni_id;
    ELSE
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

-- 3. Re-create Trigger (to ensure it's attached)
DROP TRIGGER IF EXISTS on_org_member_sync ON public.user_organization_roles;
CREATE TRIGGER on_org_member_sync
  AFTER INSERT OR UPDATE ON public.user_organization_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_org_member_sync();

-- 4. Auto-approve existing pending members (Set to Active)
-- This fires the trigger and makes them visible in UI immediately
UPDATE public.user_organization_roles
SET status = 'active'
WHERE status = 'pending';

-- 5. Backfill/Force Sync for everyone else
-- Just in case they missed the prev sync or trigger wasn't ready
UPDATE public.user_organization_roles
SET status = status;
