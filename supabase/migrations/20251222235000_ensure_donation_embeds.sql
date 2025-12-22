-- Ensure org_donation_embeds table exists (it was missed in previous syncs)
CREATE TABLE IF NOT EXISTS public.org_donation_embeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https://'),
  embed_type text NOT NULL CHECK (embed_type IN ('link', 'iframe')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for donation embeds
CREATE INDEX IF NOT EXISTS org_donation_embeds_org_idx ON public.org_donation_embeds(organization_id);
CREATE INDEX IF NOT EXISTS org_donation_embeds_org_order_idx ON public.org_donation_embeds(organization_id, display_order);

-- Enable RLS
ALTER TABLE public.org_donation_embeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Helper function usually exists but let's be safe or just use standard checks
-- Assuming has_active_role exists from rbac_tabs.sql

DROP POLICY IF EXISTS org_donation_embeds_select ON public.org_donation_embeds;
CREATE POLICY org_donation_embeds_select ON public.org_donation_embeds
  FOR SELECT USING (has_active_role(organization_id, array['admin', 'active_member', 'alumni']));

DROP POLICY IF EXISTS org_donation_embeds_insert ON public.org_donation_embeds;
CREATE POLICY org_donation_embeds_insert ON public.org_donation_embeds
  FOR INSERT WITH CHECK (has_active_role(organization_id, array['admin']));

DROP POLICY IF EXISTS org_donation_embeds_update ON public.org_donation_embeds;
CREATE POLICY org_donation_embeds_update ON public.org_donation_embeds
  FOR UPDATE USING (has_active_role(organization_id, array['admin']))
  WITH CHECK (has_active_role(organization_id, array['admin']));

DROP POLICY IF EXISTS org_donation_embeds_delete ON public.org_donation_embeds;
CREATE POLICY org_donation_embeds_delete ON public.org_donation_embeds
  FOR DELETE USING (has_active_role(organization_id, array['admin']));

-- Triggers
DROP TRIGGER IF EXISTS org_donation_embeds_updated_at ON public.org_donation_embeds;
CREATE TRIGGER org_donation_embeds_updated_at
  BEFORE UPDATE ON public.org_donation_embeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill data from organizations table if empty
INSERT INTO public.org_donation_embeds (organization_id, title, url, embed_type, display_order)
SELECT 
  id,
  'Donation Page',
  donation_embed_url,
  'iframe',
  0
FROM public.organizations
WHERE donation_embed_url IS NOT NULL 
  AND donation_embed_url != ''
  AND donation_embed_url ~ '^https://'
  AND NOT EXISTS (SELECT 1 FROM public.org_donation_embeds WHERE organization_id = organizations.id);
