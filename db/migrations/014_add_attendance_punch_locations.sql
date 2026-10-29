-- Migration 014: Add exact timestamps and geolocation to attendance punches
ALTER TABLE attendance 
  ADD COLUMN IF NOT EXISTS first_half_check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_half_check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS second_half_check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS second_half_check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_half_in_location TEXT,
  ADD COLUMN IF NOT EXISTS first_half_out_location TEXT,
  ADD COLUMN IF NOT EXISTS second_half_in_location TEXT,
  ADD COLUMN IF NOT EXISTS second_half_out_location TEXT;

