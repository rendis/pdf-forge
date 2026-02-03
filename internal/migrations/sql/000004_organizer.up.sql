-- Migration 000004: Organizer schema, folders, and tags
-- Sources: organizer/schema.xml, organizer/folders.xml, organizer/tags.xml

-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS organizer;

-- ========== FOLDERS TABLE ==========

CREATE TABLE organizer.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    parent_id UUID,
    name VARCHAR(255) NOT NULL,
    path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE organizer.folders
ADD CONSTRAINT fk_folders_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

ALTER TABLE organizer.folders
ADD CONSTRAINT fk_folders_parent_id
FOREIGN KEY (parent_id) REFERENCES organizer.folders(id) ON DELETE CASCADE;

CREATE INDEX idx_folders_workspace_id ON organizer.folders (workspace_id);
CREATE INDEX idx_folders_parent_id ON organizer.folders (parent_id);

CREATE UNIQUE INDEX idx_folders_unique_name
ON organizer.folders (workspace_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

CREATE TRIGGER trigger_folders_updated_at
BEFORE UPDATE ON organizer.folders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_folders_path ON organizer.folders (path);

CREATE OR REPLACE FUNCTION organizer.compute_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    old_path TEXT;
    new_path TEXT;
BEGIN
    -- Get parent's path (NULL if root folder)
    IF NEW.parent_id IS NOT NULL THEN
        SELECT path INTO parent_path
        FROM organizer.folders
        WHERE id = NEW.parent_id;
        NEW.path := parent_path || '/' || NEW.id::text;
    ELSE
        NEW.path := NEW.id::text;
    END IF;

    -- On UPDATE: cascade path changes to descendants
    IF TG_OP = 'UPDATE' AND OLD.path IS DISTINCT FROM NEW.path THEN
        old_path := OLD.path;
        new_path := NEW.path;
        UPDATE organizer.folders
        SET path = new_path || substring(path FROM length(old_path) + 1)
        WHERE path LIKE old_path || '/%';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folders_path
BEFORE INSERT OR UPDATE OF parent_id ON organizer.folders
FOR EACH ROW EXECUTE FUNCTION organizer.compute_folder_path();

ALTER TABLE organizer.folders ALTER COLUMN path SET NOT NULL;

CREATE OR REPLACE FUNCTION organizer.populate_folder_paths()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH RECURSIVE folder_paths AS (
        SELECT id, id::text as computed_path
        FROM organizer.folders
        WHERE parent_id IS NULL
        UNION ALL
        SELECT f.id, fp.computed_path || '/' || f.id::text
        FROM organizer.folders f
        JOIN folder_paths fp ON f.parent_id = fp.id
    )
    UPDATE organizer.folders f
    SET path = fp.computed_path
    FROM folder_paths fp
    WHERE f.id = fp.id AND (f.path IS NULL OR f.path != fp.computed_path);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION organizer.populate_folder_paths() IS
'Populates or repairs folder paths using recursive CTE.
Usage: SELECT organizer.populate_folder_paths();';

-- ========== TAGS TABLE ==========

CREATE TABLE organizer.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

ALTER TABLE organizer.tags
ADD CONSTRAINT fk_tags_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

ALTER TABLE organizer.tags
ADD CONSTRAINT uq_tags_workspace_name UNIQUE (workspace_id, name);

CREATE INDEX idx_tags_workspace_id ON organizer.tags (workspace_id);

ALTER TABLE organizer.tags
ADD CONSTRAINT chk_tags_color_format
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

CREATE TRIGGER trigger_tags_updated_at
BEFORE UPDATE ON organizer.tags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
