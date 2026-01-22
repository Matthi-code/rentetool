-- Add kosten_rentedatum to vorderingen
-- =====================================
-- Allows separate interest start date for costs (proceskosten)
-- If NULL, costs use the same date as the main claim (datum)

ALTER TABLE vorderingen
ADD COLUMN kosten_rentedatum DATE;

COMMENT ON COLUMN vorderingen.kosten_rentedatum IS
'Optional separate interest start date for costs. If NULL, uses datum field.';
