-- Reverse migration 000003: Drop identity schema and all objects

DROP TRIGGER IF EXISTS trigger_sync_system_role_memberships ON identity.system_roles;
DROP FUNCTION IF EXISTS identity.sync_system_role_memberships();

DROP TABLE IF EXISTS identity.user_access_history CASCADE;
DROP TABLE IF EXISTS identity.system_roles CASCADE;
DROP TABLE IF EXISTS identity.tenant_members CASCADE;
DROP TABLE IF EXISTS identity.workspace_members CASCADE;
DROP TABLE IF EXISTS identity.users CASCADE;
DROP SCHEMA IF EXISTS identity CASCADE;
