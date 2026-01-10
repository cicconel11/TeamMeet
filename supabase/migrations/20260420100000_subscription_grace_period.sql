-- Add grace_period_ends_at column to organization_subscriptions
-- This column tracks when the 30-day grace period after subscription cancellation expires
-- After this date, the organization will be auto-deleted on next page load

ALTER TABLE organization_subscriptions
ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN organization_subscriptions.grace_period_ends_at IS 
  'Timestamp when grace period expires after subscription cancellation. Organization will be deleted after this date.';

-- Create index for efficient querying of expired grace periods
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_grace_period 
ON organization_subscriptions (grace_period_ends_at) 
WHERE grace_period_ends_at IS NOT NULL;
