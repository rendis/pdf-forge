-- Migration 000005: Content schema with all content tables
-- Sources: content/schema.xml, content/injectable_definitions.xml, content/document_types.xml,
--          content/templates.xml, content/template_versions.xml, content/system_injectable_definitions.xml,
--          content/template_version_injectables.xml,
--          content/template_tags.xml, content/system_injectable_assignments.xml

-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS content;

-- ========== INJECTABLE DEFINITIONS TABLE ==========

CREATE TABLE content.injectable_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    data_type injectable_data_type NOT NULL,
    default_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    format_config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE content.injectable_definitions
ADD CONSTRAINT fk_injectable_definitions_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_injectable_definitions_unique_key
ON content.injectable_definitions (COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), key)
WHERE is_deleted = FALSE;

CREATE INDEX idx_injectable_definitions_workspace_id ON content.injectable_definitions (workspace_id);
CREATE INDEX idx_injectable_definitions_data_type ON content.injectable_definitions (data_type);

CREATE TRIGGER trigger_injectable_definitions_updated_at
BEFORE UPDATE ON content.injectable_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE content.injectable_definitions
ADD CONSTRAINT chk_format_config_structure CHECK (
    format_config IS NULL
    OR (
        jsonb_typeof(format_config) = 'object'
        AND (
            format_config = '{}'::jsonb
            OR (
                (format_config->'default' IS NOT NULL AND jsonb_typeof(format_config->'default') = 'string')
                AND (format_config->'options' IS NOT NULL AND jsonb_typeof(format_config->'options') = 'array')
            )
        )
    )
);

CREATE INDEX idx_injectable_definitions_is_active ON content.injectable_definitions (is_active);
CREATE INDEX idx_injectable_definitions_is_deleted ON content.injectable_definitions (is_deleted);

-- ========== DOCUMENT TYPES TABLE ==========

CREATE TABLE content.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name JSONB NOT NULL,
    description JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE content.document_types
ADD CONSTRAINT fk_document_types_tenant_id
FOREIGN KEY (tenant_id) REFERENCES tenancy.tenants(id) ON DELETE CASCADE;

ALTER TABLE content.document_types
ADD CONSTRAINT uq_document_types_tenant_code UNIQUE (tenant_id, code);

CREATE INDEX idx_document_types_tenant_id ON content.document_types (tenant_id);
CREATE INDEX idx_document_types_code ON content.document_types (code);

CREATE TRIGGER trigger_document_types_updated_at
BEFORE UPDATE ON content.document_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION content.protect_document_type_code()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.code IS DISTINCT FROM NEW.code THEN
        RAISE EXCEPTION 'Document type code cannot be modified after creation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_types_protect_code
BEFORE UPDATE ON content.document_types
FOR EACH ROW EXECUTE FUNCTION content.protect_document_type_code();

-- ========== TEMPLATES TABLE ==========

CREATE TABLE content.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    folder_id UUID,
    title VARCHAR(255) NOT NULL,
    is_public_library BOOLEAN NOT NULL DEFAULT FALSE,
    document_type_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE content.templates
ADD CONSTRAINT fk_templates_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

ALTER TABLE content.templates
ADD CONSTRAINT fk_templates_folder_id
FOREIGN KEY (folder_id) REFERENCES organizer.folders(id) ON DELETE SET NULL;

ALTER TABLE content.templates
ADD CONSTRAINT fk_templates_document_type_id
FOREIGN KEY (document_type_id) REFERENCES content.document_types(id) ON DELETE SET NULL;

CREATE INDEX idx_templates_workspace_id ON content.templates (workspace_id);
CREATE INDEX idx_templates_folder_id ON content.templates (folder_id);
CREATE INDEX idx_templates_is_public_library ON content.templates (is_public_library);
CREATE INDEX idx_templates_document_type_id ON content.templates (document_type_id);

CREATE INDEX idx_templates_title_trgm
ON content.templates USING GIN (title gin_trgm_ops);

CREATE UNIQUE INDEX idx_templates_workspace_document_type
ON content.templates (workspace_id, document_type_id)
WHERE document_type_id IS NOT NULL;

CREATE TRIGGER trigger_templates_updated_at
BEFORE UPDATE ON content.templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== TEMPLATE VERSIONS TABLE ==========

CREATE TABLE content.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    version_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content_structure JSONB,
    status version_status NOT NULL DEFAULT 'DRAFT',
    scheduled_publish_at TIMESTAMPTZ,
    scheduled_archive_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    published_by UUID,
    archived_by UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE content.template_versions
ADD CONSTRAINT fk_template_versions_template_id
FOREIGN KEY (template_id) REFERENCES content.templates(id) ON DELETE CASCADE;

ALTER TABLE content.template_versions
ADD CONSTRAINT fk_template_versions_published_by
FOREIGN KEY (published_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE content.template_versions
ADD CONSTRAINT fk_template_versions_archived_by
FOREIGN KEY (archived_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE content.template_versions
ADD CONSTRAINT fk_template_versions_created_by
FOREIGN KEY (created_by) REFERENCES identity.users(id) ON DELETE SET NULL;

ALTER TABLE content.template_versions
ADD CONSTRAINT uq_template_versions_template_version_number UNIQUE (template_id, version_number);

ALTER TABLE content.template_versions
ADD CONSTRAINT uq_template_versions_template_name UNIQUE (template_id, name);

ALTER TABLE content.template_versions
ADD CONSTRAINT chk_template_versions_single_published
EXCLUDE USING btree (template_id WITH =)
WHERE (status = 'PUBLISHED');

CREATE INDEX idx_template_versions_template_id ON content.template_versions (template_id);
CREATE INDEX idx_template_versions_status ON content.template_versions (status);

CREATE INDEX idx_template_versions_published
ON content.template_versions(template_id)
WHERE status = 'PUBLISHED';

CREATE INDEX idx_template_versions_scheduled
ON content.template_versions(scheduled_publish_at)
WHERE status = 'SCHEDULED';

CREATE INDEX idx_template_versions_to_archive
ON content.template_versions(scheduled_archive_at)
WHERE status = 'PUBLISHED' AND scheduled_archive_at IS NOT NULL;

CREATE TRIGGER trigger_template_versions_updated_at
BEFORE UPDATE ON content.template_versions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== SYSTEM INJECTABLE DEFINITIONS TABLE ==========

CREATE TABLE content.system_injectable_definitions (
    key VARCHAR(100) PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE TRIGGER trigger_system_injectable_definitions_updated_at
BEFORE UPDATE ON content.system_injectable_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_system_injectable_definitions_is_active ON content.system_injectable_definitions (is_active);

-- ========== TEMPLATE VERSION INJECTABLES TABLE ==========

CREATE TABLE content.template_version_injectables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_version_id UUID NOT NULL,
    injectable_definition_id UUID,
    system_injectable_key VARCHAR(100),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    default_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE content.template_version_injectables
ADD CONSTRAINT fk_template_version_injectables_template_version_id
FOREIGN KEY (template_version_id) REFERENCES content.template_versions(id) ON DELETE CASCADE;

ALTER TABLE content.template_version_injectables
ADD CONSTRAINT fk_template_version_injectables_injectable_definition_id
FOREIGN KEY (injectable_definition_id) REFERENCES content.injectable_definitions(id) ON DELETE RESTRICT;

ALTER TABLE content.template_version_injectables
ADD CONSTRAINT fk_template_version_injectables_system_injectable_key
FOREIGN KEY (system_injectable_key) REFERENCES content.system_injectable_definitions(key) ON DELETE RESTRICT;

ALTER TABLE content.template_version_injectables
ADD CONSTRAINT chk_injectable_source_xor CHECK (
    (injectable_definition_id IS NOT NULL AND system_injectable_key IS NULL) OR
    (injectable_definition_id IS NULL AND system_injectable_key IS NOT NULL)
);

CREATE UNIQUE INDEX idx_tvi_unique_version_injectable_definition
ON content.template_version_injectables (template_version_id, injectable_definition_id)
WHERE injectable_definition_id IS NOT NULL;

CREATE UNIQUE INDEX idx_tvi_unique_version_system_injectable
ON content.template_version_injectables (template_version_id, system_injectable_key)
WHERE system_injectable_key IS NOT NULL;

CREATE INDEX idx_template_version_injectables_template_version_id ON content.template_version_injectables (template_version_id);
CREATE INDEX idx_template_version_injectables_injectable_definition_id ON content.template_version_injectables (injectable_definition_id);
CREATE INDEX idx_template_version_injectables_system_injectable_key ON content.template_version_injectables (system_injectable_key);

-- ========== TEMPLATE TAGS TABLE ==========

CREATE TABLE content.template_tags (
    template_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (template_id, tag_id)
);

ALTER TABLE content.template_tags
ADD CONSTRAINT fk_template_tags_template_id
FOREIGN KEY (template_id) REFERENCES content.templates(id) ON DELETE CASCADE;

ALTER TABLE content.template_tags
ADD CONSTRAINT fk_template_tags_tag_id
FOREIGN KEY (tag_id) REFERENCES organizer.tags(id) ON DELETE CASCADE;

CREATE INDEX idx_template_tags_template_id ON content.template_tags (template_id);
CREATE INDEX idx_template_tags_tag_id ON content.template_tags (tag_id);

-- ========== SYSTEM INJECTABLE ASSIGNMENTS TABLE ==========

CREATE TABLE content.system_injectable_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    injectable_key VARCHAR(100) NOT NULL,
    scope_type injectable_scope_type NOT NULL,
    tenant_id UUID,
    workspace_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE content.system_injectable_assignments
ADD CONSTRAINT chk_scope_target_consistency CHECK (
    (scope_type = 'PUBLIC' AND tenant_id IS NULL AND workspace_id IS NULL) OR
    (scope_type = 'TENANT' AND tenant_id IS NOT NULL AND workspace_id IS NULL) OR
    (scope_type = 'WORKSPACE' AND workspace_id IS NOT NULL AND tenant_id IS NULL)
);

ALTER TABLE content.system_injectable_assignments
ADD CONSTRAINT fk_system_injectable_assignments_injectable_key
FOREIGN KEY (injectable_key) REFERENCES content.system_injectable_definitions(key) ON DELETE CASCADE;

ALTER TABLE content.system_injectable_assignments
ADD CONSTRAINT fk_system_injectable_assignments_tenant_id
FOREIGN KEY (tenant_id) REFERENCES tenancy.tenants(id) ON DELETE CASCADE;

ALTER TABLE content.system_injectable_assignments
ADD CONSTRAINT fk_system_injectable_assignments_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_system_injectable_assignments_unique_public
ON content.system_injectable_assignments (injectable_key)
WHERE scope_type = 'PUBLIC';

CREATE UNIQUE INDEX idx_system_injectable_assignments_unique_tenant
ON content.system_injectable_assignments (injectable_key, tenant_id)
WHERE scope_type = 'TENANT';

CREATE UNIQUE INDEX idx_system_injectable_assignments_unique_workspace
ON content.system_injectable_assignments (injectable_key, workspace_id)
WHERE scope_type = 'WORKSPACE';

CREATE INDEX idx_system_injectable_assignments_injectable_key ON content.system_injectable_assignments (injectable_key);
CREATE INDEX idx_system_injectable_assignments_scope_type ON content.system_injectable_assignments (scope_type);
CREATE INDEX idx_system_injectable_assignments_tenant_id ON content.system_injectable_assignments (tenant_id);
CREATE INDEX idx_system_injectable_assignments_workspace_id ON content.system_injectable_assignments (workspace_id);
CREATE INDEX idx_system_injectable_assignments_is_active ON content.system_injectable_assignments (is_active);
