-- Fix organization_invites role check constraint to include new roles
ALTER TABLE public.organization_invites
DROP CONSTRAINT IF EXISTS organization_invites_role_check;

ALTER TABLE public.organization_invites
ADD CONSTRAINT organization_invites_role_check
CHECK (role IN ('admin', 'active_member', 'alumni'));
