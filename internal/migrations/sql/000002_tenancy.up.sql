-- Migration 000002: Tenancy schema, tenants, and workspaces
-- Sources: tenancy/schema.xml, tenancy/tenants.xml, tenancy/workspaces.xml

-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS tenancy;

-- ========== TENANTS TABLE ==========

CREATE TABLE tenancy.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    settings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- Tenant indexes
CREATE INDEX idx_tenants_code ON tenancy.tenants (code);

CREATE UNIQUE INDEX idx_unique_system_tenant
ON tenancy.tenants (is_system)
WHERE is_system = TRUE;

CREATE INDEX idx_tenants_name_trgm
ON tenancy.tenants USING GIN (name gin_trgm_ops);

CREATE INDEX idx_tenants_code_trgm
ON tenancy.tenants USING GIN (code gin_trgm_ops);

-- Tenant triggers
CREATE TRIGGER trigger_tenants_updated_at
BEFORE UPDATE ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION tenancy.protect_system_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_system = TRUE THEN
            RAISE EXCEPTION 'Cannot delete system tenant';
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_system = TRUE THEN
            IF NEW.is_system != OLD.is_system OR
               NEW.code != OLD.code OR
               NEW.name != OLD.name THEN
                RAISE EXCEPTION 'Cannot modify protected fields of system tenant';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_tenant
BEFORE UPDATE OR DELETE ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_system_tenant();

CREATE OR REPLACE FUNCTION tenancy.auto_create_system_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip for system tenant (workspace created via seed)
    IF NEW.is_system = FALSE THEN
        INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.name || ':System',
            'SYSTEM',
            'ACTIVE'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_system_workspace
AFTER INSERT ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION tenancy.auto_create_system_workspace();

-- Tenant status enum and column
CREATE TYPE tenancy.tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

ALTER TABLE tenancy.tenants
ADD COLUMN status tenancy.tenant_status NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX idx_tenants_status ON tenancy.tenants (status);

-- Seed system tenant
INSERT INTO tenancy.tenants (id, name, code, description, is_system)
VALUES (gen_random_uuid(), 'System', 'SYS', 'System tenant for global templates', TRUE);

-- ========== WORKSPACES TABLE ==========

CREATE TABLE tenancy.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type workspace_type NOT NULL,
    status workspace_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- Workspace foreign keys
ALTER TABLE tenancy.workspaces
ADD CONSTRAINT fk_workspaces_tenant_id
FOREIGN KEY (tenant_id) REFERENCES tenancy.tenants(id) ON DELETE RESTRICT;

-- Workspace unique partial indexes
CREATE UNIQUE INDEX idx_unique_tenant_system_workspace
ON tenancy.workspaces (tenant_id, type)
WHERE type = 'SYSTEM';

-- Workspace regular indexes
CREATE INDEX idx_workspaces_tenant_id ON tenancy.workspaces (tenant_id);
CREATE INDEX idx_workspaces_status ON tenancy.workspaces (status);
CREATE INDEX idx_workspaces_type ON tenancy.workspaces (type);

CREATE INDEX idx_workspaces_name_trgm
ON tenancy.workspaces USING GIN (name gin_trgm_ops);

-- Workspace triggers
CREATE TRIGGER trigger_workspaces_updated_at
BEFORE UPDATE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION tenancy.validate_system_tenant_workspace()
RETURNS TRIGGER AS $$
DECLARE
    v_is_system_tenant BOOLEAN;
    v_workspace_count INTEGER;
BEGIN
    SELECT is_system INTO v_is_system_tenant
    FROM tenancy.tenants
    WHERE id = NEW.tenant_id;

    IF v_is_system_tenant = TRUE THEN
        IF NEW.type != 'SYSTEM' THEN
            RAISE EXCEPTION 'System tenant can only have SYSTEM type workspaces';
        END IF;

        SELECT COUNT(*) INTO v_workspace_count
        FROM tenancy.workspaces
        WHERE tenant_id = NEW.tenant_id
          AND (TG_OP = 'INSERT' OR id != NEW.id);

        IF v_workspace_count >= 1 THEN
            RAISE EXCEPTION 'System tenant can only have one workspace';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_system_tenant_workspace
BEFORE INSERT OR UPDATE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.validate_system_tenant_workspace();

CREATE OR REPLACE FUNCTION tenancy.protect_system_tenant_workspace()
RETURNS TRIGGER AS $$
DECLARE
    v_is_system_tenant BOOLEAN;
BEGIN
    SELECT is_system INTO v_is_system_tenant
    FROM tenancy.tenants
    WHERE id = OLD.tenant_id;

    IF v_is_system_tenant = TRUE THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Cannot delete system tenant workspace';
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.name != OLD.name OR
               NEW.code != OLD.code OR
               NEW.type != OLD.type OR
               NEW.tenant_id != OLD.tenant_id THEN
                RAISE EXCEPTION 'Cannot modify protected fields of system tenant workspace';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_tenant_workspace
BEFORE UPDATE OR DELETE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_system_tenant_workspace();

-- Seed system workspace
INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status)
SELECT gen_random_uuid(),
       t.id,
       'System Workspace',
       'SYSTEM',
       'ACTIVE'
FROM tenancy.tenants t
WHERE t.is_system = TRUE;

-- Add code column to workspaces
ALTER TABLE tenancy.workspaces ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT 'TEMP';

-- Temporarily drop protection trigger to allow backfill of new code column
DROP TRIGGER IF EXISTS trigger_protect_system_tenant_workspace ON tenancy.workspaces;

-- Backfill code for existing workspaces
UPDATE tenancy.workspaces SET code = 'SYS_WRKSP' WHERE type = 'SYSTEM';
UPDATE tenancy.workspaces
SET code = LEFT(
    REGEXP_REPLACE(
        UPPER(REGEXP_REPLACE(name, '[^A-Za-z0-9_ ]', '', 'g')),
        '\s+', '_', 'g'
    ), 10)
WHERE type != 'SYSTEM';
UPDATE tenancy.workspaces SET code = LEFT('WS_' || LEFT(id::text, 7), 10) WHERE code = '' OR code = 'TEMP';

CREATE UNIQUE INDEX idx_workspaces_tenant_code
ON tenancy.workspaces (tenant_id, code);

ALTER TABLE tenancy.workspaces ALTER COLUMN code DROP DEFAULT;

-- Recreate protection trigger after code column backfill
CREATE TRIGGER trigger_protect_system_tenant_workspace
BEFORE UPDATE OR DELETE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_system_tenant_workspace();

-- Recreate auto_create_system_workspace to include code column
CREATE OR REPLACE FUNCTION tenancy.auto_create_system_workspace()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_system = FALSE THEN
        INSERT INTO tenancy.workspaces (id, tenant_id, name, code, type, status)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.name || ':System',
            LEFT(UPPER(REGEXP_REPLACE(NEW.code, '[^A-Za-z0-9]', '', 'g')), 7) || '_SYS',
            'SYSTEM',
            'ACTIVE'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_workspaces_code_trgm
ON tenancy.workspaces USING GIN (code gin_trgm_ops);

-- Check constraint for workspace name min length
ALTER TABLE tenancy.workspaces
ADD CONSTRAINT chk_workspace_name_min_length CHECK (length(name) >= 3);
