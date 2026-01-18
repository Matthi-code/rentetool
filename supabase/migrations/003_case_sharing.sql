-- Case Sharing Feature
-- ====================
-- Allows users to share cases with colleagues from the same email domain

-- User profiles table (stores email/domain for colleague lookups)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    email_domain TEXT NOT NULL GENERATED ALWAYS AS (split_part(email, '@', 2)) STORED,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case shares table (links cases to shared users)
CREATE TABLE case_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission VARCHAR(10) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate shares
    UNIQUE(case_id, shared_with_user_id)
);

-- Indexes
CREATE INDEX idx_user_profiles_domain ON user_profiles(email_domain);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_case_shares_case ON case_shares(case_id);
CREATE INDEX idx_case_shares_shared_with ON case_shares(shared_with_user_id);
CREATE INDEX idx_case_shares_shared_by ON case_shares(shared_by_user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_shares ENABLE ROW LEVEL SECURITY;

-- =============
-- RLS Policies for user_profiles
-- =============

-- Users can view profiles of colleagues with same email domain
CREATE POLICY "Users can view same domain profiles"
    ON user_profiles FOR SELECT
    USING (
        email_domain = (
            SELECT email_domain FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Users can manage their own profile
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- =============
-- RLS Policies for case_shares
-- =============

-- Case owner can manage shares (create, view, delete)
CREATE POLICY "Case owner can view shares"
    ON case_shares FOR SELECT
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR shared_with_user_id = auth.uid()
    );

CREATE POLICY "Case owner can create shares"
    ON case_shares FOR INSERT
    WITH CHECK (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
    );

CREATE POLICY "Case owner can update shares"
    ON case_shares FOR UPDATE
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
    );

CREATE POLICY "Case owner can delete shares"
    ON case_shares FOR DELETE
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
    );

-- =============
-- Update existing RLS policies to include shared cases
-- =============

-- Drop and recreate cases SELECT policy to include shared cases
DROP POLICY IF EXISTS "Users can view own cases" ON cases;

CREATE POLICY "Users can view own or shared cases"
    ON cases FOR SELECT
    USING (
        user_id = auth.uid()
        OR id IN (SELECT case_id FROM case_shares WHERE shared_with_user_id = auth.uid())
    );

-- Drop and recreate vorderingen policies
DROP POLICY IF EXISTS "Users can view vorderingen of own cases" ON vorderingen;

CREATE POLICY "Users can view vorderingen of accessible cases"
    ON vorderingen FOR SELECT
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (SELECT case_id FROM case_shares WHERE shared_with_user_id = auth.uid())
    );

-- Add edit policy for vorderingen on shared cases with edit permission
CREATE POLICY "Users can edit vorderingen of shared cases with edit permission"
    ON vorderingen FOR UPDATE
    USING (
        case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

CREATE POLICY "Users can create vorderingen in shared cases with edit permission"
    ON vorderingen FOR INSERT
    WITH CHECK (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

CREATE POLICY "Users can delete vorderingen in shared cases with edit permission"
    ON vorderingen FOR DELETE
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

-- Drop and recreate deelbetalingen policies
DROP POLICY IF EXISTS "Users can view deelbetalingen of own cases" ON deelbetalingen;

CREATE POLICY "Users can view deelbetalingen of accessible cases"
    ON deelbetalingen FOR SELECT
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (SELECT case_id FROM case_shares WHERE shared_with_user_id = auth.uid())
    );

-- Add edit policy for deelbetalingen on shared cases with edit permission
CREATE POLICY "Users can edit deelbetalingen of shared cases with edit permission"
    ON deelbetalingen FOR UPDATE
    USING (
        case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

CREATE POLICY "Users can create deelbetalingen in shared cases with edit permission"
    ON deelbetalingen FOR INSERT
    WITH CHECK (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

CREATE POLICY "Users can delete deelbetalingen in shared cases with edit permission"
    ON deelbetalingen FOR DELETE
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (
            SELECT case_id FROM case_shares
            WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
        )
    );

-- Drop and recreate snapshots SELECT policy
DROP POLICY IF EXISTS "Users can view snapshots of own cases" ON snapshots;

CREATE POLICY "Users can view snapshots of accessible cases"
    ON snapshots FOR SELECT
    USING (
        case_id IN (SELECT id FROM cases WHERE user_id = auth.uid())
        OR case_id IN (SELECT case_id FROM case_shares WHERE shared_with_user_id = auth.uid())
    );

-- =============
-- Trigger to auto-create user_profile on signup
-- =============

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1))
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Trigger for email updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Backfill existing users
INSERT INTO public.user_profiles (id, email, display_name)
SELECT id, email, split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
