-- Add mag_pauze column to subscription_tiers
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS mag_pauze BOOLEAN DEFAULT FALSE;

-- Set mag_pauze to true for pro and enterprise tiers
UPDATE subscription_tiers SET mag_pauze = TRUE WHERE id IN ('pro', 'enterprise');
