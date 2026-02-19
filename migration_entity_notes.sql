-- ============================================
-- ENTITY NOTES + ATTACHMENTS (UNIFIED FORMAT)
-- ============================================

CREATE TABLE IF NOT EXISTS entity_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  note_text TEXT,
  file_name TEXT,
  file_bucket TEXT,
  file_path TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_lookup
ON entity_notes(org_id, entity_type, entity_id, created_at DESC);

ALTER TABLE entity_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_notes_select_org" ON entity_notes;
CREATE POLICY "entity_notes_select_org" ON entity_notes
FOR SELECT TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "entity_notes_insert_org" ON entity_notes;
CREATE POLICY "entity_notes_insert_org" ON entity_notes
FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "entity_notes_delete_org" ON entity_notes;
CREATE POLICY "entity_notes_delete_org" ON entity_notes
FOR DELETE TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

INSERT INTO storage.buckets (id, name, public)
VALUES ('entity-notes', 'entity-notes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "entity_notes_storage_select_org" ON storage.objects;
CREATE POLICY "entity_notes_storage_select_org" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'entity-notes'
  AND split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
);

DROP POLICY IF EXISTS "entity_notes_storage_insert_org" ON storage.objects;
CREATE POLICY "entity_notes_storage_insert_org" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'entity-notes'
  AND split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
);

NOTIFY pgrst, 'reload schema';
