-- Migration 000003: Identity schema, users, workspace_members, system_roles, tenant_members, user_access_history
-- Sources: identity/schema.xml, identity/users.xml, identity/workspace_members.xml,
--          identity/system_roles.xml, identity/tenant_members.xml, identity/user_access_history.xml

-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS identity;

-- ========== USERS TABLE ==========

CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    external_identity_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    status user_status NOT NULL DEFAULT 'INVITED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON identity.users (email);
CREATE INDEX idx_users_external_identity_id ON identity.users (external_identity_id);
CREATE INDEX idx_users_status ON identity.users (status);

CREATE INDEX idx_users_full_name_trgm
ON identity.users USING GIN (full_name gin_trgm_ops);

-- ========== WORKSPACE MEMBERS TABLE ==========

CREATE TABLE identity.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role workspace_role NOT NULL,
    membership_status membership_status NOT NULL DEFAULT 'PENDING',
    invited_by UUID,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE identity.workspace_members
ADD CONSTRAINT fk_workspace_members_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

ALTER TABLE identity.workspace_members
ADD CONSTRAINT fk_workspace_members_user_id
FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE CASCADE;

ALTER TABLE identity.workspace_members
ADD CONSTRAINT fk_workspace_members_invited_by
FOREIGN KEY (invited_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE identity.workspace_members
ADD CONSTRAINT uq_workspace_members_workspace_user UNIQUE (workspace_id, user_id);

CREATE INDEX idx_workspace_members_workspace_id ON identity.workspace_members (workspace_id);
CREATE INDEX idx_workspace_members_user_id ON identity.workspace_members (user_id);
CREATE INDEX idx_workspace_members_role ON identity.workspace_members (role);

-- ========== TENANT MEMBERS TABLE ==========

CREATE TABLE identity.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role tenant_role NOT NULL,
    membership_status membership_status NOT NULL DEFAULT 'ACTIVE',
    granted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE identity.tenant_members
ADD CONSTRAINT fk_tenant_members_tenant_id
FOREIGN KEY (tenant_id) REFERENCES tenancy.tenants(id) ON DELETE CASCADE;

ALTER TABLE identity.tenant_members
ADD CONSTRAINT fk_tenant_members_user_id
FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE CASCADE;

ALTER TABLE identity.tenant_members
ADD CONSTRAINT fk_tenant_members_granted_by
FOREIGN KEY (granted_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE identity.tenant_members
ADD CONSTRAINT uq_tenant_members_tenant_user UNIQUE (tenant_id, user_id);

CREATE INDEX idx_tenant_members_tenant_id ON identity.tenant_members (tenant_id);
CREATE INDEX idx_tenant_members_user_id ON identity.tenant_members (user_id);
CREATE INDEX idx_tenant_members_role ON identity.tenant_members (role);

-- ========== SYSTEM ROLES TABLE ==========

CREATE TABLE identity.system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role system_role NOT NULL,
    granted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE identity.system_roles
ADD CONSTRAINT fk_system_roles_user_id
FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE CASCADE;

ALTER TABLE identity.system_roles
ADD CONSTRAINT fk_system_roles_granted_by
FOREIGN KEY (granted_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE identity.system_roles
ADD CONSTRAINT uq_system_roles_user_id UNIQUE (user_id);

CREATE INDEX idx_system_roles_user_id ON identity.system_roles (user_id);
CREATE INDEX idx_system_roles_role ON identity.system_roles (role);

-- System roles sync function
CREATE OR REPLACE FUNCTION identity.sync_system_role_memberships()
RETURNS TRIGGER AS $$
DECLARE
    v_system_tenant_id UUID;
    v_system_workspace_id UUID;
    v_tenant_role tenant_role;
    v_workspace_role workspace_role;
BEGIN
    -- Get system tenant and workspace
    SELECT id INTO v_system_tenant_id FROM tenancy.tenants WHERE is_system = TRUE;
    SELECT id INTO v_system_workspace_id FROM tenancy.workspaces WHERE tenant_id = v_system_tenant_id AND type = 'SYSTEM';

    IF v_system_tenant_id IS NULL OR v_system_workspace_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        DELETE FROM identity.tenant_members
        WHERE user_id = OLD.user_id AND tenant_id = v_system_tenant_id;

        DELETE FROM identity.workspace_members
        WHERE user_id = OLD.user_id AND workspace_id = v_system_workspace_id;

        RETURN OLD;
    END IF;

    -- Map system role to tenant/workspace roles
    IF NEW.role = 'SUPERADMIN' THEN
        v_tenant_role := 'TENANT_OWNER';
        v_workspace_role := 'OWNER';
    ELSIF NEW.role = 'PLATFORM_ADMIN' THEN
        v_tenant_role := 'TENANT_ADMIN';
        v_workspace_role := 'ADMIN';
    END IF;

    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO identity.tenant_members (tenant_id, user_id, role, membership_status, granted_by)
        VALUES (v_system_tenant_id, NEW.user_id, v_tenant_role, 'ACTIVE', NEW.granted_by)
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

        INSERT INTO identity.workspace_members (workspace_id, user_id, role, membership_status, invited_by, joined_at)
        VALUES (v_system_workspace_id, NEW.user_id, v_workspace_role, 'ACTIVE', NEW.granted_by, CURRENT_TIMESTAMP)
        ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

        RETURN NEW;
    END IF;

    -- Handle UPDATE (use UPSERT in case membership doesn't exist)
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO identity.tenant_members (tenant_id, user_id, role, membership_status, granted_by)
        VALUES (v_system_tenant_id, NEW.user_id, v_tenant_role, 'ACTIVE', NEW.granted_by)
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

        INSERT INTO identity.workspace_members (workspace_id, user_id, role, membership_status, invited_by, joined_at)
        VALUES (v_system_workspace_id, NEW.user_id, v_workspace_role, 'ACTIVE', NEW.granted_by, CURRENT_TIMESTAMP)
        ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_system_role_memberships ON identity.system_roles;
CREATE TRIGGER trigger_sync_system_role_memberships
AFTER INSERT OR UPDATE OR DELETE ON identity.system_roles
FOR EACH ROW EXECUTE FUNCTION identity.sync_system_role_memberships();

-- ========== USER ACCESS HISTORY TABLE ==========

CREATE TABLE identity.user_access_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE identity.user_access_history
ADD CONSTRAINT fk_user_access_history_user_id
FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE CASCADE;

ALTER TABLE identity.user_access_history
ADD CONSTRAINT uq_user_access_history_user_entity UNIQUE (user_id, entity_type, entity_id);

ALTER TABLE identity.user_access_history
ADD CONSTRAINT chk_user_access_history_entity_type
CHECK (entity_type IN ('TENANT', 'WORKSPACE'));

CREATE INDEX idx_user_access_history_user_entity_accessed
ON identity.user_access_history (user_id, entity_type, accessed_at DESC);
