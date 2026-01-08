-- Academic Schedules table for tracking class/academic commitments
CREATE TABLE academic_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  occurrence_type VARCHAR(20) NOT NULL CHECK (occurrence_type IN ('single','daily','weekly','monthly')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 31),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CHECK (start_time < end_time),
  CHECK (end_date IS NULL OR start_date <= end_date),
  CHECK (occurrence_type != 'weekly' OR day_of_week IS NOT NULL),
  CHECK (occurrence_type != 'monthly' OR day_of_month IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_academic_schedules_org_user ON academic_schedules(organization_id, user_id, deleted_at);
CREATE INDEX idx_academic_schedules_org ON academic_schedules(organization_id, deleted_at);

-- RLS
ALTER TABLE academic_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedules" ON academic_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org schedules" ON academic_schedules
  FOR SELECT USING (is_org_admin(organization_id));
