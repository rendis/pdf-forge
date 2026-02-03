package injectablerepo

// SQL queries for injectable definitions (read-only operations).
const (
	queryFindByID = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE id = $1 AND is_active = true AND is_deleted = false`

	queryFindByWorkspace = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE (workspace_id = $1 OR workspace_id IS NULL) AND is_active = true AND is_deleted = false
		ORDER BY key`

	queryFindGlobal = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id IS NULL AND is_active = true AND is_deleted = false
		ORDER BY key`

	queryFindByKeyGlobal = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id IS NULL AND key = $1 AND is_active = true AND is_deleted = false`

	queryFindByKeyWorkspace = `
		SELECT id, workspace_id, key, label, description, data_type, metadata, format_config, is_active, is_deleted, created_at, updated_at
		FROM content.injectable_definitions
		WHERE (workspace_id = $1 OR workspace_id IS NULL) AND key = $2 AND is_active = true AND is_deleted = false
		ORDER BY workspace_id NULLS LAST
		LIMIT 1`

	queryExistsByKeyGlobal = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id IS NULL AND key = $1 AND is_deleted = false)`

	queryExistsByKeyWorkspace = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id = $1 AND key = $2 AND is_deleted = false)`

	queryExistsByKeyGlobalExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id IS NULL AND key = $1 AND id != $2 AND is_deleted = false)`

	queryExistsByKeyWorkspaceExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id = $1 AND key = $2 AND id != $3 AND is_deleted = false)`

	queryIsInUse = `
		SELECT EXISTS(SELECT 1 FROM content.template_version_injectables WHERE injectable_definition_id = $1)`

	queryGetVersionCount = `
		SELECT COUNT(*) FROM content.template_version_injectables WHERE injectable_definition_id = $1`

	// queryFindKeysByWorkspace returns all keys accessible to a workspace (workspace-specific + global)
	// Used to validate that document variables reference accessible injectables
	queryFindKeysByWorkspace = `
		SELECT key
		FROM content.injectable_definitions
		WHERE (workspace_id = $1 OR workspace_id IS NULL)
		  AND key = ANY($2)
		  AND is_active = true AND is_deleted = false`
)
