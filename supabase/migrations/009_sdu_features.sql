-- Migration 009: SDU-inspired features
-- Adds: betaaltermijn_dagen, bodemrente, kosten_categorie

-- Betaaltermijn: aantal dagen na factuurdatum voordat rente begint (art. 6:119a lid 1 BW)
ALTER TABLE vorderingen ADD COLUMN IF NOT EXISTS betaaltermijn_dagen INTEGER DEFAULT 0;

-- Bodemrente: minimum rentepercentage (contractuele afspraak)
ALTER TABLE vorderingen ADD COLUMN IF NOT EXISTS bodemrente DECIMAL(5,4) DEFAULT NULL;

-- Kosten-categorie: standaard labels voor kostenposten (verbetert PDF output)
ALTER TABLE vorderingen ADD COLUMN IF NOT EXISTS kosten_categorie VARCHAR(50) DEFAULT NULL;
