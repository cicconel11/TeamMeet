-- Safely add 'pending' to membership_status enum type
DO $$
BEGIN
  ALTER TYPE public.membership_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
