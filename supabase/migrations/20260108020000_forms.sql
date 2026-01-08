-- Forms table for admin-created forms
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_forms_org ON forms(organization_id, deleted_at);
CREATE INDEX idx_forms_active ON forms(organization_id, is_active, deleted_at);

-- Form submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_org ON form_submissions(organization_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(user_id);

-- RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Forms: admins have full access
CREATE POLICY "Admins manage forms" ON forms
  FOR ALL USING (is_org_admin(organization_id));

-- Forms: org members can view active forms
CREATE POLICY "Members view active forms" ON forms
  FOR SELECT USING (
    is_active = true 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_organization_roles 
      WHERE user_id = auth.uid() 
      AND organization_id = forms.organization_id 
      AND status = 'active'
    )
  );

-- Submissions: users can insert their own
CREATE POLICY "Users can submit forms" ON form_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_organization_roles 
      WHERE user_id = auth.uid() 
      AND organization_id = form_submissions.organization_id 
      AND status = 'active'
    )
  );

-- Submissions: users can view their own
CREATE POLICY "Users view own submissions" ON form_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Submissions: admins can view all in org
CREATE POLICY "Admins view org submissions" ON form_submissions
  FOR SELECT USING (is_org_admin(organization_id));
