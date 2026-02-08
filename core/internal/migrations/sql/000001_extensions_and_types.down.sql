-- Reverse migration 000001: Drop enum types, utility functions, and extensions

DROP TYPE IF EXISTS injectable_scope_type;
DROP TYPE IF EXISTS version_status;
DROP TYPE IF EXISTS injectable_data_type;
DROP TYPE IF EXISTS membership_status;
DROP TYPE IF EXISTS workspace_role;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS tenant_role;
DROP TYPE IF EXISTS system_role;
DROP TYPE IF EXISTS workspace_status;
DROP TYPE IF EXISTS workspace_type;

DROP FUNCTION IF EXISTS update_updated_at_column();

DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "pgcrypto";
