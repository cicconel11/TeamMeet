-- Form documents (PDF templates uploaded by admins)
CREATE TABLE form_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_form_documents_org ON form_documents(organization_id, deleted_at);
CREATE INDEX idx_form_documents_active ON form_documents(organization_id, is_active, deleted_at);

-- Form document submissions (filled versions uploaded by members)
CREATE TABLE form_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES form_documents(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_doc_submissions_doc ON form_document_submissions(document_id);
CREATE INDEX idx_form_doc_submissions_org ON form_document_submissions(organization_id);
CREATE INDEX idx_form_doc_submissions_user ON form_document_submissions(user_id);

-- RLS
ALTER TABLE form_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_document_submissions ENABLE ROW LEVEL SECURITY;

-- Form documents: admins have full access
CREATE POLICY "Admins manage form documents" ON form_documents
  FOR ALL USING (is_org_admin(organization_id));

-- Form documents: members can view active documents
CREATE POLICY "Members view active form documents" ON form_documents
  FOR SELECT USING (
    is_active = true 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_organization_roles 
      WHERE user_id = auth.uid() 
      AND organization_id = form_documents.organization_id 
      AND status = 'active'
    )
  );

-- Document submissions: users can insert their own
CREATE POLICY "Users can submit documents" ON form_document_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM user_organization_roles 
      WHERE user_id = auth.uid() 
      AND organization_id = form_document_submissions.organization_id 
      AND status = 'active'
    )
  );

-- Document submissions: users can view their own
CREATE POLICY "Users view own document submissions" ON form_document_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Document submissions: users can delete their own
CREATE POLICY "Users delete own document submissions" ON form_document_submissions
  FOR DELETE USING (auth.uid() = user_id);

-- Document submissions: admins can view all in org
CREATE POLICY "Admins view org document submissions" ON form_document_submissions
  FOR SELECT USING (is_org_admin(organization_id));
