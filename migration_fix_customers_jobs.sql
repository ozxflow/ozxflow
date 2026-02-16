-- Migration: Fix customers table columns + Add quote linkage to jobs
-- Run this in Supabase SQL Editor BEFORE merging the PR
-- This fixes the customer auto-creation from quotes and job completion flow

-- ============================================
-- FIX CUSTOMERS TABLE COLUMNS
-- ============================================
-- The app code uses: full_name, phone, email, address, notes, customer_type
-- The DB schema has: customer_name, customer_phone, customer_email, customer_address
-- We need to rename/add columns to match the code

DO $$ BEGIN
  -- Rename customer_name → full_name (if old name exists and new doesn't)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'full_name') THEN
    ALTER TABLE customers RENAME COLUMN customer_name TO full_name;
    RAISE NOTICE 'Renamed customer_name → full_name';
  END IF;

  -- Rename customer_phone → phone
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_phone')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
    ALTER TABLE customers RENAME COLUMN customer_phone TO phone;
    RAISE NOTICE 'Renamed customer_phone → phone';
  END IF;

  -- Rename customer_email → email
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_email')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') THEN
    ALTER TABLE customers RENAME COLUMN customer_email TO email;
    RAISE NOTICE 'Renamed customer_email → email';
  END IF;

  -- Rename customer_address → address
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_address')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address') THEN
    ALTER TABLE customers RENAME COLUMN customer_address TO address;
    RAISE NOTICE 'Renamed customer_address → address';
  END IF;
END $$;

-- Add missing columns (safe - IF NOT EXISTS)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'פרטי';

-- ============================================
-- ADD QUOTE LINKAGE TO JOBS TABLE
-- ============================================
-- This allows jobs to find their quote directly without going through leads
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_id UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- ============================================
-- BACKFILL: Link existing jobs to their quotes (through leads)
-- ============================================
UPDATE jobs j
SET quote_id = l.quote_id,
    customer_phone = l.customer_phone
FROM leads l
WHERE j.lead_id = l.id
  AND j.quote_id IS NULL
  AND l.quote_id IS NOT NULL;

-- ============================================
-- ADD MISSING COLUMNS TO ORG_MEMBERS (for employee/installer management)
-- ============================================
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'מנהל';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'פנוי';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS phone TEXT;
