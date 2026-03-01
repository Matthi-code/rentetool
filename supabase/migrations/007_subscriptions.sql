-- =============================================
-- Migration 007: Subscription Tiers (Freemium)
-- =============================================

-- Subscription tier definitions (configurable by admin)
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,                    -- 'free', 'pro', 'enterprise'
  naam TEXT NOT NULL,
  max_vorderingen INTEGER,                -- NULL = onbeperkt
  max_deelbetalingen INTEGER,             -- NULL = onbeperkt
  mag_opslaan BOOLEAN DEFAULT FALSE,
  mag_pdf_schoon BOOLEAN DEFAULT FALSE,
  mag_snapshots BOOLEAN DEFAULT FALSE,
  mag_sharing BOOLEAN DEFAULT FALSE,
  prijs_per_maand DECIMAL(10,2),
  actief BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscription assignments
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  tier_id TEXT REFERENCES subscription_tiers NOT NULL DEFAULT 'free',
  start_datum DATE NOT NULL DEFAULT CURRENT_DATE,
  eind_datum DATE,                        -- NULL = doorlopend
  status TEXT DEFAULT 'active'            -- active, cancelled, expired
    CHECK (status IN ('active', 'cancelled', 'expired')),
  toegekend_door UUID,                    -- admin die het heeft toegekend
  notitie TEXT,                           -- admin notitie bij toekenning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Seed tier data
INSERT INTO subscription_tiers (id, naam, max_vorderingen, max_deelbetalingen, mag_opslaan, mag_pdf_schoon, mag_snapshots, mag_sharing, prijs_per_maand) VALUES
  ('free', 'Starter', 3, 1, FALSE, FALSE, FALSE, FALSE, 0),
  ('pro', 'Professional', NULL, NULL, TRUE, TRUE, TRUE, TRUE, 49.00),
  ('enterprise', 'Enterprise', NULL, NULL, TRUE, TRUE, TRUE, TRUE, NULL);

-- RLS policies
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier definitions
CREATE POLICY "subscription_tiers_select" ON subscription_tiers
  FOR SELECT USING (true);

-- Only service role can modify tiers
CREATE POLICY "subscription_tiers_modify" ON subscription_tiers
  FOR ALL USING (false);

-- Users can read their own subscription
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role manages subscriptions (admin operations go through service role)
CREATE POLICY "user_subscriptions_modify" ON user_subscriptions
  FOR ALL USING (false);
