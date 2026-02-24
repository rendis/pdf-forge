-- Revert any STAGING versions back to DRAFT before removing constraint
UPDATE content.template_versions SET status = 'DRAFT' WHERE status = 'STAGING';

-- Remove staging index and constraint
DROP INDEX IF EXISTS content.idx_template_versions_staging;

ALTER TABLE content.template_versions
DROP CONSTRAINT IF EXISTS chk_template_versions_single_staging;

-- Note: PostgreSQL does not support removing enum values.
-- The 'STAGING' value remains in the version_status enum but is unused.
