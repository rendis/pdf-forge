package tagrepo

// SQL queries for tag operations.
const (
	queryCreate = `
		INSERT INTO organizer.tags (id, workspace_id, name, color, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, workspace_id, name, color, created_at, updated_at
		FROM organizer.tags
		WHERE id = $1`

	queryFindByWorkspace = `
		SELECT id, workspace_id, name, color, created_at, updated_at
		FROM organizer.tags
		WHERE workspace_id = $1
		ORDER BY name`

	queryFindByWorkspaceWithCount = `
		SELECT tag_id, workspace_id, tag_name, tag_color, template_count, tag_created_at
		FROM organizer.workspace_tags_cache
		WHERE workspace_id = $1
		ORDER BY tag_name`

	queryFindByName = `
		SELECT id, workspace_id, name, color, created_at, updated_at
		FROM organizer.tags
		WHERE workspace_id = $1 AND name = $2`

	queryUpdate = `
		UPDATE organizer.tags
		SET name = $2, color = $3, updated_at = $4
		WHERE id = $1`

	queryDelete = `DELETE FROM organizer.tags WHERE id = $1`

	queryExistsByName = `
		SELECT EXISTS(SELECT 1 FROM organizer.tags WHERE workspace_id = $1 AND name = $2)`

	queryExistsByNameExcluding = `
		SELECT EXISTS(SELECT 1 FROM organizer.tags WHERE workspace_id = $1 AND name = $2 AND id != $3)`

	queryIsInUse = `
		SELECT EXISTS(SELECT 1 FROM content.template_tags WHERE tag_id = $1)`

	queryGetTemplateCount = `
		SELECT COUNT(*) FROM content.template_tags WHERE tag_id = $1`
)
