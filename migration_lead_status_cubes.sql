-- Migration: Add lead_status_cubes column to settings table
-- Run this in Supabase SQL Editor
-- This column stores the configurable status cubes (name + color) for leads

ALTER TABLE settings ADD COLUMN IF NOT EXISTS lead_status_cubes JSONB DEFAULT '[]'::jsonb;

-- Set default cubes for existing settings rows that don't have any
UPDATE settings
SET lead_status_cubes = '[
  {"status": "חדש", "color": "text-blue-600"},
  {"status": "בטיפול", "color": "text-purple-600"},
  {"status": "נקבעה פגישה", "color": "text-green-600"},
  {"status": "התקיימה פגישה", "color": "text-indigo-600"},
  {"status": "הצעת מחיר", "color": "text-cyan-600"},
  {"status": "לא סגר", "color": "text-red-600"},
  {"status": "סגר", "color": "text-emerald-600"}
]'::jsonb
WHERE lead_status_cubes IS NULL OR lead_status_cubes = '[]'::jsonb;

-- Add job_start_button_text column for customizable button text in Jobs page
ALTER TABLE settings ADD COLUMN IF NOT EXISTS job_start_button_text TEXT DEFAULT '🚗 יצאתי לדרך';

-- Add default lead settings columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_lead_status TEXT DEFAULT 'חדש';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_lead_rating TEXT DEFAULT '';
