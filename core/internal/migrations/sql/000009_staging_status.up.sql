-- Add STAGING value to version_status enum
ALTER TYPE version_status ADD VALUE IF NOT EXISTS 'STAGING' AFTER 'DRAFT';

-- Enforce at most one STAGING version per template (mirrors PUBLISHED constraint)
ALTER TABLE content.template_versions
ADD CONSTRAINT chk_template_versions_single_staging
EXCLUDE USING btree (template_id WITH =)
WHERE (status = 'STAGING');

-- Partial index for fast staging lookups
CREATE INDEX idx_template_versions_staging
ON content.template_versions(template_id)
WHERE status = 'STAGING';
