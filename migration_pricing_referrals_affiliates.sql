-- ============================================
-- PRICING + REFERRALS + AFFILIATES MIGRATION
-- Run this in Supabase SQL Editor (after supabase_schema.sql + migration_multi_tenant.sql)
-- ============================================

-- 1) Extend subscription plans with payment links and richer pricing metadata
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_min_leads INTEGER;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_max_leads INTEGER;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_discount_min NUMERIC DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS annual_discount_max NUMERIC DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_most_popular BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS setup_payment_url TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_payment_url TEXT;

-- 2) Sync plans to exact business model
UPDATE subscription_plans
SET
  name = 'First Steps',
  name_he = 'צעדים ראשונים',
  max_leads_per_month = 40,
  max_users = 1,
  price_per_user = 0,
  setup_cost = 0,
  monthly_min_leads = 0,
  monthly_max_leads = 40,
  is_most_popular = false
WHERE id = 'free';

UPDATE subscription_plans
SET
  name = 'Business Momentum',
  name_he = 'עסק בתנופה',
  max_leads_per_month = 99,
  max_users = 5,
  price_per_user = 69,
  setup_cost = 1500,
  monthly_min_leads = 41,
  monthly_max_leads = 99,
  is_most_popular = false,
  setup_payment_url = 'https://pay360.isracard.co.il/CustomerPayment/GenericURL?SaleId=065AB941-4383-D412-3FFA-FD3641DE1E1B',
  monthly_payment_url = 'https://pay360.isracard.co.il/CustomerPayment/GenericSubURL?SaleId=FB4FAE54-A61D-E27A-49C2-548E67A7D8BC'
WHERE id = 'starter';

UPDATE subscription_plans
SET
  name = 'Accelerated Growth',
  name_he = 'צמיחה מואצת',
  max_leads_per_month = 300,
  max_users = 15,
  price_per_user = 249,
  setup_cost = 5500,
  monthly_min_leads = 99,
  monthly_max_leads = 300,
  is_most_popular = true
WHERE id = 'growth';

UPDATE subscription_plans
SET
  name = 'Premium Squad',
  name_he = 'הנבחרת',
  max_leads_per_month = 500,
  max_users = -1,
  price_per_user = 249,
  setup_cost = 10500,
  monthly_min_leads = 300,
  monthly_max_leads = 500,
  annual_discount_min = 15,
  annual_discount_max = 20,
  is_most_popular = false
WHERE id = 'premium';

-- 3) Internal wallet for "friend brings friend" credits
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  credit_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit', 'debit')),
  reason TEXT NOT NULL CHECK (reason IN (
    'referral_setup_bonus',
    'referral_monthly_bonus',
    'subscription_offset',
    'feature_purchase',
    'plan_upgrade',
    'manual_adjustment'
  )),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Referral ownership and conversion data
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ref_code TEXT NOT NULL,
  referrer_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('clicked', 'signed_up', 'upgraded', 'cancelled')),
  source_type TEXT NOT NULL DEFAULT 'internal_referral' CHECK (source_type IN ('internal_referral', 'affiliate')),
  first_click_at TIMESTAMPTZ,
  signup_at TIMESTAMPTZ DEFAULT NOW(),
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Affiliate system
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  payout_method TEXT DEFAULT 'bank_transfer',
  payout_details JSONB DEFAULT '{}'::jsonb,
  affiliate_code TEXT UNIQUE NOT NULL,
  cookie_window_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_code TEXT NOT NULL,
  affiliate_id UUID REFERENCES affiliate_profiles(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  attributed_by TEXT NOT NULL DEFAULT 'last_click_30d',
  conversion_status TEXT NOT NULL DEFAULT 'signed_up' CHECK (conversion_status IN ('signed_up', 'upgraded', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  upgraded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('setup', 'monthly')),
  commission_rate NUMERIC NOT NULL,
  base_amount NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 6) Core functions
CREATE OR REPLACE FUNCTION ensure_wallet_account(p_org_id UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wallet_accounts(org_id)
  VALUES (p_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  SELECT id INTO v_id FROM wallet_accounts WHERE org_id = p_org_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wallet_add_credit(
  p_org_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_source_org_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_wallet_account(p_org_id);

  UPDATE wallet_accounts
  SET credit_balance = credit_balance + p_amount,
      updated_at = NOW()
  WHERE org_id = p_org_id;

  INSERT INTO wallet_transactions(org_id, source_org_id, kind, reason, amount, notes)
  VALUES (p_org_id, p_source_org_id, 'credit', p_reason, p_amount, p_notes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_ref_code TEXT,
  p_referred_user_id UUID,
  p_referred_org_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_referrer_org_id UUID;
BEGIN
  SELECT org_id INTO v_referrer_org_id
  FROM referral_links
  WHERE ref_code = p_ref_code
    AND is_active = true
  LIMIT 1;

  IF v_referrer_org_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO referrals(ref_code, referrer_org_id, referred_user_id, referred_org_id, status, source_type, signup_at)
  VALUES (p_ref_code, v_referrer_org_id, p_referred_user_id, p_referred_org_id, 'signed_up', 'internal_referral', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Commissions policy constants (internal + affiliate)
CREATE TABLE IF NOT EXISTS growth_engine_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  internal_setup_rate NUMERIC NOT NULL DEFAULT 0.10,
  internal_monthly_rate NUMERIC NOT NULL DEFAULT 0.20,
  affiliate_setup_rate NUMERIC NOT NULL DEFAULT 0.10,
  affiliate_monthly_rate NUMERIC NOT NULL DEFAULT 0.20,
  credit_ratio NUMERIC NOT NULL DEFAULT 1.0,
  cookie_window_days INTEGER NOT NULL DEFAULT 30,
  attribution_model TEXT NOT NULL DEFAULT 'last_click_wins',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO growth_engine_settings (internal_setup_rate, internal_monthly_rate, affiliate_setup_rate, affiliate_monthly_rate, credit_ratio, cookie_window_days, attribution_model)
SELECT 0.10, 0.20, 0.10, 0.20, 1.0, 30, 'last_click_wins'
WHERE NOT EXISTS (SELECT 1 FROM growth_engine_settings);

-- 8) RLS
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_engine_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wallet select by org" ON wallet_accounts;
CREATE POLICY "Wallet select by org" ON wallet_accounts
FOR SELECT TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Wallet tx select by org" ON wallet_transactions;
CREATE POLICY "Wallet tx select by org" ON wallet_transactions
FOR SELECT TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Referral link select by org" ON referral_links;
CREATE POLICY "Referral link select by org" ON referral_links
FOR SELECT TO authenticated
USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Referrals select by org" ON referrals;
CREATE POLICY "Referrals select by org" ON referrals
FOR SELECT TO authenticated
USING (
  referrer_org_id IN (SELECT get_user_org_ids(auth.uid()))
  OR referred_org_id IN (SELECT get_user_org_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Growth settings read all" ON growth_engine_settings;
CREATE POLICY "Growth settings read all" ON growth_engine_settings
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super admin update plans" ON subscription_plans;
CREATE POLICY "Super admin update plans" ON subscription_plans
FOR UPDATE TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);

DROP POLICY IF EXISTS "Super admin read affiliates" ON affiliate_profiles;
CREATE POLICY "Super admin read affiliates" ON affiliate_profiles
FOR SELECT TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true);

-- 9) Grants for RPC endpoints
GRANT EXECUTE ON FUNCTION ensure_wallet_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_add_credit(UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral_code(TEXT, UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
