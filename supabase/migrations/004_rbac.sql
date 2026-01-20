-- RBAC (Role-Based Access Control) Feature
-- =========================================
-- Hiërarchisch rechtensysteem: admin > org_admin > user

-- =============
-- User Roles Table
-- =============
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'org_admin', 'user')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Een user kan meerdere rollen hebben, maar niet dezelfde rol tweemaal
    UNIQUE(user_id, role)
);

-- Index voor snelle lookups
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =============
-- Helper function: check if user has a specific role
-- =============
CREATE OR REPLACE FUNCTION has_role(check_user_id UUID, check_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = check_user_id AND role = check_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============
-- Helper function: check if user is admin
-- =============
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN has_role(check_user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============
-- Helper function: check if user is org_admin for a domain
-- =============
CREATE OR REPLACE FUNCTION is_org_admin_for_domain(check_user_id UUID, check_domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN user_profiles up ON ur.user_id = up.id
        WHERE ur.user_id = check_user_id
        AND ur.role = 'org_admin'
        AND up.email_domain = check_domain
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============
-- Helper function: get user's email domain
-- =============
CREATE OR REPLACE FUNCTION get_user_domain(check_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email_domain FROM user_profiles WHERE id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============
-- RLS Policies for user_roles
-- =============

-- Admin kan alle rollen zien
CREATE POLICY "Admin can view all roles"
    ON user_roles FOR SELECT
    USING (is_admin(auth.uid()));

-- Org_admin kan rollen van eigen domein zien
CREATE POLICY "Org_admin can view domain roles"
    ON user_roles FOR SELECT
    USING (
        has_role(auth.uid(), 'org_admin')
        AND get_user_domain(user_id) = get_user_domain(auth.uid())
    );

-- User kan eigen rollen zien
CREATE POLICY "User can view own roles"
    ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- Admin kan alle rollen toekennen
CREATE POLICY "Admin can insert any role"
    ON user_roles FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Org_admin kan user/org_admin rollen toekennen binnen eigen domein (NIET admin)
CREATE POLICY "Org_admin can insert domain roles"
    ON user_roles FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'org_admin')
        AND role IN ('user', 'org_admin')  -- Niet admin!
        AND get_user_domain(user_id) = get_user_domain(auth.uid())
    );

-- Admin kan alle rollen verwijderen
CREATE POLICY "Admin can delete any role"
    ON user_roles FOR DELETE
    USING (is_admin(auth.uid()));

-- Org_admin kan user/org_admin rollen verwijderen binnen eigen domein
CREATE POLICY "Org_admin can delete domain roles"
    ON user_roles FOR DELETE
    USING (
        has_role(auth.uid(), 'org_admin')
        AND role IN ('user', 'org_admin')
        AND get_user_domain(user_id) = get_user_domain(auth.uid())
    );

-- =============
-- Update RLS Policies for user_profiles
-- =============

-- Drop bestaande policy en maak nieuwe met rol-ondersteuning
DROP POLICY IF EXISTS "Users can view same domain profiles" ON user_profiles;

-- Admin kan alle profielen zien
CREATE POLICY "Admin can view all profiles"
    ON user_profiles FOR SELECT
    USING (is_admin(auth.uid()));

-- Org_admin kan profielen van eigen domein zien
CREATE POLICY "Org_admin can view domain profiles"
    ON user_profiles FOR SELECT
    USING (
        has_role(auth.uid(), 'org_admin')
        AND email_domain = get_user_domain(auth.uid())
    );

-- User kan profielen van eigen domein zien (voor sharing feature)
CREATE POLICY "User can view same domain profiles"
    ON user_profiles FOR SELECT
    USING (email_domain = get_user_domain(auth.uid()));

-- =============
-- Update RLS Policies for cases
-- =============

-- Drop bestaande policy
DROP POLICY IF EXISTS "Users can view own or shared cases" ON cases;

-- Admin kan alle cases zien
CREATE POLICY "Admin can view all cases"
    ON cases FOR SELECT
    USING (is_admin(auth.uid()));

-- Org_admin kan alle cases van eigen domein zien
CREATE POLICY "Org_admin can view domain cases"
    ON cases FOR SELECT
    USING (
        has_role(auth.uid(), 'org_admin')
        AND user_id IN (
            SELECT id FROM user_profiles
            WHERE email_domain = get_user_domain(auth.uid())
        )
    );

-- User kan eigen cases en gedeelde cases zien
CREATE POLICY "User can view own or shared cases"
    ON cases FOR SELECT
    USING (
        user_id = auth.uid()
        OR id IN (SELECT case_id FROM case_shares WHERE shared_with_user_id = auth.uid())
    );

-- =============
-- Trigger: assign default 'user' role on signup
-- =============
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after user_profile is created (which happens after auth.users insert)
CREATE TRIGGER on_user_profile_created_assign_role
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_role();

-- =============
-- Backfill: assign 'user' role to existing users without roles
-- =============
INSERT INTO user_roles (user_id, role)
SELECT up.id, 'user'
FROM user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = up.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- =============
-- Assign admin role to superadmin
-- =============
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM user_profiles
WHERE email = 'matthi+rente@gcon.nl'
ON CONFLICT (user_id, role) DO NOTHING;
