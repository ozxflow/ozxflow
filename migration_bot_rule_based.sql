-- ============================================
-- RULE-BASED CRM BOT + SECURE FILE HANDLING
-- Run after: supabase_schema.sql + migration_multi_tenant.sql
-- ============================================

CREATE TABLE IF NOT EXISTS bot_qa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  priority INTEGER NOT NULL DEFAULT 100,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_qa_org_id ON bot_qa(org_id);
CREATE INDEX IF NOT EXISTS idx_bot_qa_priority ON bot_qa(priority);

CREATE TABLE IF NOT EXISTS bot_instructions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  instruction TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_instructions_org_id ON bot_instructions(org_id);

CREATE TABLE IF NOT EXISTS bot_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'CRM Bot',
  session_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_conversations_org_user ON bot_conversations(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bot_conversations_last_message ON bot_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES bot_conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation ON bot_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS bot_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES bot_conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  file_size BIGINT,
  purpose TEXT NOT NULL DEFAULT 'unassigned' CHECK (purpose IN ('unassigned', 'task', 'supplier_order', 'customer', 'archive')),
  linked_entity_type TEXT,
  linked_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_files_org_id ON bot_files(org_id, created_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE bot_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_qa_select_global_and_org" ON bot_qa;
CREATE POLICY "bot_qa_select_global_and_org" ON bot_qa
FOR SELECT TO authenticated
USING (
  org_id IS NULL
  OR org_id IN (SELECT get_user_org_ids(auth.uid()))
);

DROP POLICY IF EXISTS "bot_qa_insert_org_or_superadmin_global" ON bot_qa;
CREATE POLICY "bot_qa_insert_org_or_superadmin_global" ON bot_qa
FOR INSERT TO authenticated
WITH CHECK (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "bot_qa_update_org_or_superadmin_global" ON bot_qa;
CREATE POLICY "bot_qa_update_org_or_superadmin_global" ON bot_qa
FOR UPDATE TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
)
WITH CHECK (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "bot_qa_delete_org_or_superadmin_global" ON bot_qa;
CREATE POLICY "bot_qa_delete_org_or_superadmin_global" ON bot_qa
FOR DELETE TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "bot_instructions_select_global_and_org" ON bot_instructions;
CREATE POLICY "bot_instructions_select_global_and_org" ON bot_instructions
FOR SELECT TO authenticated
USING (
  org_id IS NULL
  OR org_id IN (SELECT get_user_org_ids(auth.uid()))
);

DROP POLICY IF EXISTS "bot_instructions_write_org_or_superadmin_global" ON bot_instructions;
CREATE POLICY "bot_instructions_write_org_or_superadmin_global" ON bot_instructions
FOR ALL TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
)
WITH CHECK (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR (
    org_id IS NULL
    AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "bot_conversations_select_org" ON bot_conversations;
CREATE POLICY "bot_conversations_select_org" ON bot_conversations
FOR SELECT TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "bot_conversations_insert_org" ON bot_conversations;
CREATE POLICY "bot_conversations_insert_org" ON bot_conversations
FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "bot_conversations_update_org" ON bot_conversations;
CREATE POLICY "bot_conversations_update_org" ON bot_conversations
FOR UPDATE TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())))
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "bot_messages_select_org" ON bot_messages;
CREATE POLICY "bot_messages_select_org" ON bot_messages
FOR SELECT TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "bot_messages_insert_org" ON bot_messages;
CREATE POLICY "bot_messages_insert_org" ON bot_messages
FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "bot_files_select_org" ON bot_files;
CREATE POLICY "bot_files_select_org" ON bot_files
FOR SELECT TO authenticated
USING (
  org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "bot_files_insert_org" ON bot_files;
CREATE POLICY "bot_files_insert_org" ON bot_files
FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "bot_files_update_org" ON bot_files;
CREATE POLICY "bot_files_update_org" ON bot_files
FOR UPDATE TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())))
WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================
-- STORAGE: private bucket + org-folder policies
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('bot-files', 'bot-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "bot_files_storage_select_org" ON storage.objects;
CREATE POLICY "bot_files_storage_select_org" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bot-files'
  AND (
    split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "bot_files_storage_insert_org" ON storage.objects;
CREATE POLICY "bot_files_storage_insert_org" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bot-files'
  AND split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
);

DROP POLICY IF EXISTS "bot_files_storage_update_org" ON storage.objects;
CREATE POLICY "bot_files_storage_update_org" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'bot-files'
  AND split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
)
WITH CHECK (
  bucket_id = 'bot-files'
  AND split_part(name, '/', 1) IN (SELECT get_user_org_ids(auth.uid())::text)
);

GRANT EXECUTE ON FUNCTION get_user_org_ids(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
