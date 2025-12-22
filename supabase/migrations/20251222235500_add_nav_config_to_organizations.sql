-- Add nav_config column to organizations table to store tab customizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS nav_config jsonb DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.organizations.nav_config IS 'Stores navigation tab customization settings (labels, visibility) as JSONB.';
