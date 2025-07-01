-- Add company field to leads table
-- This migration adds a company field with predefined values and migrates existing data

-- Add the company column with check constraint
ALTER TABLE leads ADD COLUMN company TEXT CHECK (company IN ('Favale', 'Pink', 'Favale&Pink'));

-- Migrate existing data: if source is 'Favale' or 'Pink', move it to company field
UPDATE leads SET company = CASE 
  WHEN source = 'Favale' THEN 'Favale'
  WHEN source = 'Pink' THEN 'Pink'
  ELSE NULL
END WHERE source IN ('Favale', 'Pink');

-- Clear the source field for records that were migrated to company
UPDATE leads SET source = NULL WHERE source IN ('Favale', 'Pink');

-- Add comment to document the field
COMMENT ON COLUMN leads.company IS 'Company associated with the lead: Favale, Pink, or Favale&Pink';
