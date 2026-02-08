-- Reverse migration 000002: Drop tenancy schema and all objects

DROP TRIGGER IF EXISTS trigger_protect_system_tenant_workspace ON tenancy.workspaces;
DROP TRIGGER IF EXISTS trigger_validate_system_tenant_workspace ON tenancy.workspaces;
DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.protect_system_tenant_workspace();
DROP FUNCTION IF EXISTS tenancy.validate_system_tenant_workspace();

DROP TRIGGER IF EXISTS trigger_auto_create_system_workspace ON tenancy.tenants;
DROP TRIGGER IF EXISTS trigger_protect_system_tenant ON tenancy.tenants;
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenancy.tenants;
DROP FUNCTION IF EXISTS tenancy.auto_create_system_workspace();
DROP FUNCTION IF EXISTS tenancy.protect_system_tenant();

DROP TABLE IF EXISTS tenancy.workspaces CASCADE;
DROP TABLE IF EXISTS tenancy.tenants CASCADE;
DROP TYPE IF EXISTS tenancy.tenant_status;
DROP SCHEMA IF EXISTS tenancy CASCADE;
