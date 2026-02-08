-- Reverse migration 000007: Drop workspace tags cache and trigger functions

DROP TRIGGER IF EXISTS trigger_workspace_tags_cache_on_template_tag_delete ON content.template_tags;
DROP TRIGGER IF EXISTS trigger_workspace_tags_cache_on_template_tag_insert ON content.template_tags;
DROP TRIGGER IF EXISTS trigger_workspace_tags_cache_on_tag_update ON organizer.tags;
DROP TRIGGER IF EXISTS trigger_workspace_tags_cache_on_tag_insert ON organizer.tags;

DROP FUNCTION IF EXISTS organizer.populate_workspace_tags_cache();
DROP FUNCTION IF EXISTS organizer.on_template_tag_delete();
DROP FUNCTION IF EXISTS organizer.on_template_tag_insert();
DROP FUNCTION IF EXISTS organizer.on_tag_update();
DROP FUNCTION IF EXISTS organizer.on_tag_insert();

DROP TABLE IF EXISTS organizer.workspace_tags_cache CASCADE;
