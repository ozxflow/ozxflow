-- ============================================
-- MULTI-TENANCY MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Subscription Plans reference table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  max_leads_per_month INTEGER NOT NULL,
  max_users INTEGER NOT NULL, -- -1 = unlimited
  price_per_user NUMERIC DEFAULT 0,
  setup_cost NUMERIC DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0
);

INSERT INTO subscription_plans (id, name, name_he, max_leads_per_month, max_users, price_per_user, setup_cost, features, display_order) VALUES
  ('free', 'Free', 'חינם', 40, 1, 0, 0, '["basic_crm","basic_reports"]'::jsonb, 1),
  ('starter', 'Starter', 'סטארטר', 99, 5, 69, 1500, '["basic_crm","basic_reports","templates","email_support","lead_import","landing_pages"]'::jsonb, 2),
  ('growth', 'Growth', 'צמיחה', 300, 15, 249, 5500, '["basic_crm","basic_reports","templates","email_support","lead_import","landing_pages","automations","advanced_reports","employee_stats","inventory","payment","telephony"]'::jsonb, 3),
  ('premium', 'Premium', 'פרימיום', 500, -1, 249, 10500, '["basic_crm","basic_reports","templates","email_support","lead_import","landing_pages","automations","advanced_reports","employee_stats","inventory","payment","telephony","lead_routing","custom_fields","chat_support","phone_support"]'::jsonb, 4),
  ('enterprise', 'Enterprise', 'אנטרפרייז', 99999, -1, 0, 0, '["basic_crm","basic_reports","templates","email_support","lead_import","landing_pages","automations","advanced_reports","employee_stats","inventory","payment","telephony","lead_routing","custom_fields","chat_support","phone_support","bi_dashboards","user_permissions","dedicated_am","sla","private_server"]'::jsonb, 5)
ON CONFLICT (id) DO NOTHING;

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  owner_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' REFERENCES subscription_plans(id),
  max_leads_per_month INTEGER DEFAULT 40,
  max_users INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  trial_end_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  auto_renew_months INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to organizations if table already existed without them
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_renew_months INTEGER DEFAULT 1;

-- 3. Org members table (links auth users to organizations)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  email TEXT,
  full_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 4. Lead usage tracking (monthly)
CREATE TABLE IF NOT EXISTS lead_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- '2026-02'
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, month)
);

-- 5. Add org_id to ALL existing data tables
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE stock_moves ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE warranty_certificates ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE satisfaction_surveys ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE system_history ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 6. RLS for new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid infinite recursion in RLS policies
-- SECURITY DEFINER bypasses RLS so org_members won't trigger its own policies
CREATE OR REPLACE FUNCTION get_user_org_ids(uid UUID)
RETURNS SETOF UUID AS $$
  SELECT org_id FROM org_members WHERE user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Subscription plans - readable by all authenticated
DROP POLICY IF EXISTS "Plans readable by all" ON subscription_plans;
CREATE POLICY "Plans readable by all" ON subscription_plans FOR SELECT TO authenticated USING (true);

-- Organizations
DROP POLICY IF EXISTS "Org members can read own org" ON organizations;
CREATE POLICY "Org members can read own org" ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Allow insert for authenticated" ON organizations;
CREATE POLICY "Allow insert for authenticated" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Org owner can update" ON organizations;
CREATE POLICY "Org owner can update" ON organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT get_user_org_ids(auth.uid())));

-- Org members (use function to avoid recursion)
DROP POLICY IF EXISTS "Org members can read members" ON org_members;
CREATE POLICY "Org members can read members" ON org_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Allow insert for authenticated" ON org_members;
CREATE POLICY "Allow insert for authenticated" ON org_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Org admin can manage members" ON org_members;
CREATE POLICY "Org admin can manage members" ON org_members FOR DELETE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Super admin bypass policies
DROP POLICY IF EXISTS "Super admin can read all orgs" ON organizations;
CREATE POLICY "Super admin can read all orgs" ON organizations FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);
DROP POLICY IF EXISTS "Super admin can update all orgs" ON organizations;
CREATE POLICY "Super admin can update all orgs" ON organizations FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);
DROP POLICY IF EXISTS "Super admin can read all members" ON org_members;
CREATE POLICY "Super admin can read all members" ON org_members FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);
DROP POLICY IF EXISTS "Super admin can delete any member" ON org_members;
CREATE POLICY "Super admin can delete any member" ON org_members FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);
DROP POLICY IF EXISTS "Super admin can read all usage" ON lead_usage;
CREATE POLICY "Super admin can read all usage" ON lead_usage FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);

-- Lead usage
DROP POLICY IF EXISTS "Org members can read usage" ON lead_usage;
CREATE POLICY "Org members can read usage" ON lead_usage FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
DROP POLICY IF EXISTS "Allow insert/update for authenticated" ON lead_usage;
CREATE POLICY "Allow insert/update for authenticated" ON lead_usage FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update for authenticated" ON lead_usage;
CREATE POLICY "Allow update for authenticated" ON lead_usage FOR UPDATE TO authenticated USING (true);

-- 7. Update existing table policies to filter by org
-- Drop old permissive policies first
DROP POLICY IF EXISTS "Allow all for authenticated" ON leads;
DROP POLICY IF EXISTS "Allow all for authenticated" ON customers;
DROP POLICY IF EXISTS "Allow all for authenticated" ON tasks;
DROP POLICY IF EXISTS "Allow all for authenticated" ON quotes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON jobs;
DROP POLICY IF EXISTS "Allow all for authenticated" ON invoices;
DROP POLICY IF EXISTS "Allow all for authenticated" ON inventory;
DROP POLICY IF EXISTS "Allow all for authenticated" ON stock_moves;
DROP POLICY IF EXISTS "Allow all for authenticated" ON supplier_orders;
DROP POLICY IF EXISTS "Allow all for authenticated" ON suppliers;
DROP POLICY IF EXISTS "Allow all for authenticated" ON templates;
DROP POLICY IF EXISTS "Allow all for authenticated" ON warranty_certificates;
DROP POLICY IF EXISTS "Allow all for authenticated" ON satisfaction_surveys;
DROP POLICY IF EXISTS "Allow all for authenticated" ON system_history;
DROP POLICY IF EXISTS "Allow all for authenticated" ON lead_sources;
DROP POLICY IF EXISTS "Allow all for authenticated" ON settings;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;

-- Create new org-scoped policies for all data tables
-- Using a function approach for cleaner code
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'leads','customers','tasks','quotes','jobs','invoices','inventory',
    'stock_moves','supplier_orders','suppliers','templates','warranty_certificates',
    'satisfaction_surveys','system_history','lead_sources','settings','vehicles'
  ])
  LOOP
    -- Drop existing policies first to make re-run safe
    EXECUTE format('DROP POLICY IF EXISTS "Org isolation select" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org isolation insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org isolation update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Org isolation delete" ON %I', tbl);

    EXECUTE format('CREATE POLICY "Org isolation select" ON %I FOR SELECT TO authenticated USING (org_id IS NULL OR org_id IN (SELECT get_user_org_ids(auth.uid())))', tbl);
    EXECUTE format('CREATE POLICY "Org isolation insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Org isolation update" ON %I FOR UPDATE TO authenticated USING (org_id IS NULL OR org_id IN (SELECT get_user_org_ids(auth.uid())))', tbl);
    EXECUTE format('CREATE POLICY "Org isolation delete" ON %I FOR DELETE TO authenticated USING (org_id IS NULL OR org_id IN (SELECT get_user_org_ids(auth.uid())))', tbl);
  END LOOP;
END $$;

-- 8. Function to increment lead count atomically
CREATE OR REPLACE FUNCTION increment_lead_count(p_org_id UUID, p_month TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO lead_usage (org_id, month, lead_count)
  VALUES (p_org_id, p_month, 1)
  ON CONFLICT (org_id, month)
  DO UPDATE SET lead_count = lead_usage.lead_count + 1
  RETURNING lead_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Set super admin flag for existing user
-- This sets is_super_admin=true for we@xflow.co.il in user_metadata
-- Safe to re-run - only updates the flag
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_super_admin": true}'::jsonb
WHERE email = 'we@mecanix.co.il';

-- 10. Create default org for existing super admin user and migrate existing data
-- This creates an organization for the super admin if one doesn't exist yet
DO $$
DECLARE
  admin_uid UUID;
  new_org_id UUID;
BEGIN
  -- Get the super admin user ID
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'we@mecanix.co.il' LIMIT 1;

  IF admin_uid IS NOT NULL THEN
    -- Check if this user already has an org
    IF NOT EXISTS (SELECT 1 FROM org_members WHERE user_id = admin_uid) THEN
      -- Create organization for super admin
      INSERT INTO organizations (name, owner_id, plan, max_leads_per_month, max_users, is_active)
      VALUES ('xFlow CRM', admin_uid, 'enterprise', 99999, -1, true)
      RETURNING id INTO new_org_id;

      -- Create org_member
      INSERT INTO org_members (org_id, user_id, role, email, full_name)
      VALUES (new_org_id, admin_uid, 'owner', 'we@mecanix.co.il', 'Super Admin');

      -- Migrate existing data (set org_id for all records that don't have one)
      UPDATE leads SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE customers SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE tasks SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE quotes SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE jobs SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE invoices SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE inventory SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE stock_moves SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE supplier_orders SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE suppliers SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE templates SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE warranty_certificates SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE satisfaction_surveys SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE system_history SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE lead_sources SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE settings SET org_id = new_org_id WHERE org_id IS NULL;
      UPDATE vehicles SET org_id = new_org_id WHERE org_id IS NULL;

      RAISE NOTICE 'Created org % for super admin %', new_org_id, admin_uid;
    ELSE
      RAISE NOTICE 'Super admin already has an org, skipping';
    END IF;
  ELSE
    RAISE NOTICE 'User we@xflow.co.il not found - register first, then re-run this migration';
  END IF;
END $$;
