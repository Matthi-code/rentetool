-- Migration: Add item_type and pause fields to vorderingen
-- =========================================================
-- Allows vorderingen to be either 'vordering' (claim) or 'kosten' (costs)
-- Also adds pause functionality for interest calculation

-- 1. Add item_type column
ALTER TABLE vorderingen ADD COLUMN item_type VARCHAR(20) DEFAULT 'vordering'
    CHECK (item_type IN ('vordering', 'kosten'));

-- 2. Add pause fields
ALTER TABLE vorderingen ADD COLUMN pauze_start DATE;
ALTER TABLE vorderingen ADD COLUMN pauze_eind DATE;

-- 3. Add constraint for valid pause period
ALTER TABLE vorderingen ADD CONSTRAINT pauze_check
    CHECK (pauze_eind IS NULL OR pauze_start IS NULL OR pauze_eind > pauze_start);

-- 4. Mark old kosten fields as deprecated (will be removed in future migration)
COMMENT ON COLUMN vorderingen.kosten IS 'DEPRECATED: Use item_type=kosten instead';
COMMENT ON COLUMN vorderingen.kosten_rentedatum IS 'DEPRECATED: Use item_type=kosten with datum';

-- 5. Create index for efficient filtering by type
CREATE INDEX idx_vorderingen_type ON vorderingen(case_id, item_type);
