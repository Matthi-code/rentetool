-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('calculation', 'pdf_view')),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    case_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries per user
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_action_type ON usage_logs(action_type);

-- RLS policies
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage logs
CREATE POLICY "Users can view own usage logs"
    ON usage_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own usage logs
CREATE POLICY "Users can insert own usage logs"
    ON usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for admin queries)
CREATE POLICY "Service role full access"
    ON usage_logs FOR ALL
    USING (auth.role() = 'service_role');

-- View for usage statistics per user
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE action_type = 'calculation') as total_calculations,
    COUNT(*) FILTER (WHERE action_type = 'pdf_view') as total_pdf_views,
    MAX(created_at) FILTER (WHERE action_type = 'calculation') as last_calculation,
    MAX(created_at) FILTER (WHERE action_type = 'pdf_view') as last_pdf_view
FROM usage_logs
GROUP BY user_id;
