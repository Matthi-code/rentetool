-- Add default betaaltermijn to cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS default_betaaltermijn INTEGER DEFAULT 0;
