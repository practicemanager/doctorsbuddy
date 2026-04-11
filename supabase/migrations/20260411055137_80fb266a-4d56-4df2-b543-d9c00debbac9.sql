-- Add new tooth statuses
ALTER TYPE public.tooth_status ADD VALUE IF NOT EXISTS 'under_observation';
ALTER TYPE public.tooth_status ADD VALUE IF NOT EXISTS 'restored';