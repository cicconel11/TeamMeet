-- Table to track uploaded schedule files
CREATE TABLE schedule_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_schedule_files_org ON schedule_files(organization_id, deleted_at);
CREATE INDEX idx_schedule_files_user ON schedule_files(organization_id, user_id, deleted_at);

ALTER TABLE schedule_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own files" ON schedule_files
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org files" ON schedule_files
  FOR SELECT USING (is_org_admin(organization_id));

-- Storage policies for schedule-files bucket (run after creating bucket in dashboard)
-- CREATE POLICY "Users can upload own schedule files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'schedule-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can view own schedule files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'schedule-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can delete own schedule files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'schedule-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Authenticated users can read schedule files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'schedule-files');
