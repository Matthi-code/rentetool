-- Rentetool Database Schema
-- ==========================
-- Nederlandse wettelijke rente calculator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cases (per klant/zaak)
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    naam VARCHAR(255) NOT NULL,
    klant_referentie VARCHAR(255),
    einddatum DATE NOT NULL DEFAULT CURRENT_DATE,
    strategie CHAR(1) NOT NULL DEFAULT 'A' CHECK (strategie IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vorderingen (claims)
CREATE TABLE vorderingen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kenmerk VARCHAR(100) NOT NULL,
    bedrag DECIMAL(15,2) NOT NULL CHECK (bedrag > 0),
    datum DATE NOT NULL,
    rentetype INTEGER NOT NULL CHECK (rentetype BETWEEN 1 AND 7),
    kosten DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (kosten >= 0),
    opslag DECIMAL(5,4) CHECK (opslag >= 0 AND opslag <= 1),
    opslag_ingangsdatum DATE,
    volgorde INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deelbetalingen (partial payments)
CREATE TABLE deelbetalingen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kenmerk VARCHAR(100),
    bedrag DECIMAL(15,2) NOT NULL CHECK (bedrag > 0),
    datum DATE NOT NULL,
    aangewezen TEXT[] DEFAULT '{}',
    volgorde INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots (saved calculation reports)
CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    einddatum DATE NOT NULL,
    totaal_openstaand DECIMAL(15,2) NOT NULL,
    pdf_url TEXT,
    invoer_json JSONB NOT NULL,
    resultaat_json JSONB NOT NULL
);

-- Indexes
CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_created ON cases(created_at DESC);
CREATE INDEX idx_vorderingen_case ON vorderingen(case_id);
CREATE INDEX idx_vorderingen_volgorde ON vorderingen(case_id, volgorde);
CREATE INDEX idx_deelbetalingen_case ON deelbetalingen(case_id);
CREATE INDEX idx_deelbetalingen_datum ON deelbetalingen(case_id, datum);
CREATE INDEX idx_snapshots_case ON snapshots(case_id);
CREATE INDEX idx_snapshots_created ON snapshots(case_id, created_at DESC);

-- Row Level Security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vorderingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelbetalingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases
CREATE POLICY "Users can view own cases"
    ON cases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cases"
    ON cases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
    ON cases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
    ON cases FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for vorderingen (via case ownership)
CREATE POLICY "Users can view vorderingen of own cases"
    ON vorderingen FOR SELECT
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can create vorderingen in own cases"
    ON vorderingen FOR INSERT
    WITH CHECK (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can update vorderingen in own cases"
    ON vorderingen FOR UPDATE
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete vorderingen in own cases"
    ON vorderingen FOR DELETE
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- RLS Policies for deelbetalingen (via case ownership)
CREATE POLICY "Users can view deelbetalingen of own cases"
    ON deelbetalingen FOR SELECT
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can create deelbetalingen in own cases"
    ON deelbetalingen FOR INSERT
    WITH CHECK (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can update deelbetalingen in own cases"
    ON deelbetalingen FOR UPDATE
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete deelbetalingen in own cases"
    ON deelbetalingen FOR DELETE
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- RLS Policies for snapshots (via case ownership)
CREATE POLICY "Users can view snapshots of own cases"
    ON snapshots FOR SELECT
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can create snapshots in own cases"
    ON snapshots FOR INSERT
    WITH CHECK (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete snapshots in own cases"
    ON snapshots FOR DELETE
    USING (case_id IN (SELECT id FROM cases WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for cases updated_at
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update case updated_at when lines change
CREATE OR REPLACE FUNCTION update_case_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cases SET updated_at = NOW() WHERE id = COALESCE(NEW.case_id, OLD.case_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers for vorderingen and deelbetalingen
CREATE TRIGGER update_case_on_vordering_change
    AFTER INSERT OR UPDATE OR DELETE ON vorderingen
    FOR EACH ROW
    EXECUTE FUNCTION update_case_timestamp();

CREATE TRIGGER update_case_on_deelbetaling_change
    AFTER INSERT OR UPDATE OR DELETE ON deelbetalingen
    FOR EACH ROW
    EXECUTE FUNCTION update_case_timestamp();
