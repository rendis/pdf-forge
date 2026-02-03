-- Migration 000007: Workspace tags cache table with trigger-based maintenance
-- Source: organizer/workspace_tags_cache.xml

-- ========== CACHE TABLE ==========

CREATE TABLE organizer.workspace_tags_cache (
    tag_id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    tag_color VARCHAR(7) NOT NULL,
    template_count INT NOT NULL DEFAULT 0,
    tag_created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE organizer.workspace_tags_cache
ADD CONSTRAINT fk_workspace_tags_cache_tag_id
FOREIGN KEY (tag_id) REFERENCES organizer.tags(id) ON DELETE CASCADE;

ALTER TABLE organizer.workspace_tags_cache
ADD CONSTRAINT fk_workspace_tags_cache_workspace_id
FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_workspace_tags_cache_workspace_id ON organizer.workspace_tags_cache (workspace_id);

CREATE INDEX idx_workspace_tags_cache_tag_name_trgm
ON organizer.workspace_tags_cache USING GIN (tag_name gin_trgm_ops);

-- ========== TRIGGER FUNCTIONS ==========

-- On tag insert
CREATE OR REPLACE FUNCTION organizer.on_tag_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO organizer.workspace_tags_cache (
        tag_id,
        workspace_id,
        tag_name,
        tag_color,
        template_count,
        tag_created_at
    ) VALUES (
        NEW.id,
        NEW.workspace_id,
        NEW.name,
        NEW.color,
        0,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_tags_cache_on_tag_insert
AFTER INSERT ON organizer.tags
FOR EACH ROW EXECUTE FUNCTION organizer.on_tag_insert();

-- On tag update
CREATE OR REPLACE FUNCTION organizer.on_tag_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.name IS DISTINCT FROM NEW.name OR OLD.color IS DISTINCT FROM NEW.color THEN
        UPDATE organizer.workspace_tags_cache
        SET tag_name = NEW.name,
            tag_color = NEW.color
        WHERE tag_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_tags_cache_on_tag_update
AFTER UPDATE ON organizer.tags
FOR EACH ROW EXECUTE FUNCTION organizer.on_tag_update();

-- On template_tag insert (increment count)
CREATE OR REPLACE FUNCTION organizer.on_template_tag_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizer.workspace_tags_cache
    SET template_count = template_count + 1
    WHERE tag_id = NEW.tag_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_tags_cache_on_template_tag_insert
AFTER INSERT ON content.template_tags
FOR EACH ROW EXECUTE FUNCTION organizer.on_template_tag_insert();

-- On template_tag delete (decrement count)
CREATE OR REPLACE FUNCTION organizer.on_template_tag_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizer.workspace_tags_cache
    SET template_count = template_count - 1
    WHERE tag_id = OLD.tag_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_tags_cache_on_template_tag_delete
AFTER DELETE ON content.template_tags
FOR EACH ROW EXECUTE FUNCTION organizer.on_template_tag_delete();

-- ========== POPULATE CACHE FUNCTION ==========

CREATE OR REPLACE FUNCTION organizer.populate_workspace_tags_cache()
RETURNS void AS $$
BEGIN
    -- Clear existing cache
    TRUNCATE organizer.workspace_tags_cache;

    -- Populate from source tables
    INSERT INTO organizer.workspace_tags_cache (
        tag_id,
        workspace_id,
        tag_name,
        tag_color,
        template_count,
        tag_created_at
    )
    SELECT
        t.id,
        t.workspace_id,
        t.name,
        t.color,
        COUNT(tt.template_id),
        t.created_at
    FROM organizer.tags t
    LEFT JOIN content.template_tags tt ON tt.tag_id = t.id
    GROUP BY t.id, t.workspace_id, t.name, t.color, t.created_at;
END;
$$ LANGUAGE plpgsql;

-- Initial population
SELECT organizer.populate_workspace_tags_cache();
