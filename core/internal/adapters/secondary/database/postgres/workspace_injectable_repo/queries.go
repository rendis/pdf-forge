package workspaceinjectablerepo

// SQL queries for workspace injectable operations.
const (
	queryCreate = `
		INSERT INTO content.injectable_definitions
			(id, workspace_id, key, label, description, data_type, metadata, format_config, default_value, is_active, is_deleted, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id`

	queryFindByID = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, default_value, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE id = $1 AND workspace_id = $2 AND is_deleted = false`

	queryFindByWorkspaceOwned = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, default_value, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id = $1 AND is_deleted = false
		ORDER BY key`

	queryUpdate = `
		UPDATE content.injectable_definitions
		SET key = $2, label = $3, description = $4, metadata = $5, format_config = $6, default_value = $7, updated_at = $8
		WHERE id = $1 AND workspace_id = $9 AND is_deleted = false`

	querySoftDelete = `
		UPDATE content.injectable_definitions
		SET is_deleted = true, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND is_deleted = false`

	querySetActive = `
		UPDATE content.injectable_definitions
		SET is_active = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND is_deleted = false`

	queryExistsByKey = `
		SELECT EXISTS(
			SELECT 1 FROM content.injectable_definitions
			WHERE workspace_id = $1 AND key = $2 AND is_deleted = false
		)`

	queryExistsByKeyExcluding = `
		SELECT EXISTS(
			SELECT 1 FROM content.injectable_definitions
			WHERE workspace_id = $1 AND key = $2 AND id != $3 AND is_deleted = false
		)`
)
