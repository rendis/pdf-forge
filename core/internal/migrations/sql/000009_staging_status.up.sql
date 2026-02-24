-- Add STAGING value to version_status enum
-- Must be in its own migration: PostgreSQL cannot use new enum values in the same transaction
ALTER TYPE version_status ADD VALUE IF NOT EXISTS 'STAGING' AFTER 'DRAFT';
