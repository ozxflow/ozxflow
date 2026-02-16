-- CRM Mehanix - Full Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_name TEXT,
  business_logo TEXT,
  visible_modules JSONB DEFAULT '[]'::jsonb,
  lead_assignment_rules JSONB DEFAULT '{}'::jsonb,
  cardcom_settings JSONB DEFAULT '{}'::jsonb,
  rejection_reasons JSONB DEFAULT '[]'::jsonb,
  lead_status_cubes JSONB DEFAULT '[]'::jsonb,
  job_start_button_text TEXT DEFAULT '🚗 יצאתי לדרך',
  default_lead_status TEXT DEFAULT 'חדש',
  default_lead_rating TEXT DEFAULT '',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD SOURCES
-- ============================================
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  total_leads INTEGER DEFAULT 0,
  converted_leads INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  serial_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  company_name TEXT,
  customer_address TEXT,
  status TEXT DEFAULT 'חדש',
  lead_rating TEXT,
  lead_source_type TEXT,
  age TEXT,
  traffic_source TEXT,
  conversion_source TEXT,
  registration_source TEXT,
  ad_method TEXT,
  filled_questionnaire BOOLEAN DEFAULT false,
  questionnaire JSONB DEFAULT '{}'::jsonb,
  meeting_date TIMESTAMPTZ,
  quote_id UUID,
  actual_value NUMERIC,
  notes TEXT,
  rejection_reason TEXT,
  registration_date TIMESTAMPTZ,
  initial_registration_date TIMESTAMPTZ,
  assignee_id TEXT,
  assigned_installer TEXT,
  best_time_to_call TEXT,
  biggest_challenge TEXT,
  budget TEXT,
  car_looking_for TEXT,
  car_selling TEXT,
  asking_price TEXT,
  mentor_importance TEXT,
  mentoring_goal TEXT,
  target_sales TEXT,
  success_definition TEXT,
  tried_before TEXT,
  weekly_hours TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  customer_type TEXT DEFAULT 'פרטי',
  status TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VEHICLES
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  vehicle_type TEXT,
  plate_number TEXT,
  model TEXT,
  year TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'פתוח',
  due_date TIMESTAMPTZ,
  assigned_to TEXT,
  customer_id UUID,
  lead_id UUID,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUOTES
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  serial_number TEXT,
  lead_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  sub_total NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  vat NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'טיוטה',
  quote_status TEXT,
  payment_link TEXT,
  valid_until DATE,
  rejection_reason TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID,
  quote_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  installation_address TEXT,
  installer_email TEXT,
  installer_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'פתוח',
  items JSONB DEFAULT '[]'::jsonb,
  internal_done_stocked BOOLEAN DEFAULT false,
  internal_p_paid_assigned BOOLEAN DEFAULT false,
  internal_stock_moved BOOLEAN DEFAULT false,
  service_type TEXT,
  cost NUMERIC,
  price NUMERIC,
  notes TEXT,
  assigned_installer TEXT,
  assignee_id TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  sell_price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  stock_qty INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK MOVES
-- ============================================
CREATE TABLE IF NOT EXISTS stock_moves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT,
  quantity INTEGER,
  move_type TEXT,
  reference_type TEXT,
  reference_id UUID,
  performed_by TEXT,
  notes TEXT,
  move_date TIMESTAMPTZ DEFAULT NOW(),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPLIER ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  serial_number TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  expected_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'טיוטה',
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  serial_number TEXT,
  lead_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  sub_total NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  vat NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT,
  invoice_type TEXT DEFAULT 'חשבונית',
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  invoice_datetime TIMESTAMPTZ,
  cardcom_invoice_url TEXT,
  payment_status TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT,
  content TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WARRANTY CERTIFICATES
-- ============================================
CREATE TABLE IF NOT EXISTS warranty_certificates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID,
  customer_id UUID,
  product_sku TEXT,
  certificate_number TEXT,
  issue_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  warranty_period INTEGER,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SATISFACTION SURVEYS
-- ============================================
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID,
  lead_id UUID,
  satisfaction_score INTEGER,
  feedback TEXT,
  survey_date TIMESTAMPTZ DEFAULT NOW(),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYSTEM HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS system_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT,
  entity_id UUID,
  action_type TEXT,
  description TEXT,
  performed_by TEXT,
  previous_data JSONB,
  reverted BOOLEAN DEFAULT false,
  can_revert BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY - Enable and allow all for anon (temporary)
-- ============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow all for authenticated" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON lead_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON stock_moves FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON supplier_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON warranty_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON satisfaction_surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON system_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- INSERT DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (business_name, business_logo, visible_modules, rejection_reasons)
VALUES (
  'CRM Mehanix',
  '',
  '["Leads","Quotes","Jobs","Tasks","Employees","Inventory","SupplierOrders","Suppliers","Reports","Bot","Invoices","Customers","Settings"]'::jsonb,
  '["לא מעוניין","יקר מדי","מצא ספק אחר","לא רלוונטי","אחר"]'::jsonb
);

-- ============================================
-- INSERT DEFAULT LEAD SOURCES
-- ============================================
INSERT INTO lead_sources (name, type, is_active) VALUES
  ('פייסבוק', 'פייסבוק', true),
  ('אינסטגרם', 'אינסטגרם', true),
  ('גוגל', 'גוגל', true),
  ('המלצה', 'המלצה', true),
  ('טלפון', 'טלפון', true);
