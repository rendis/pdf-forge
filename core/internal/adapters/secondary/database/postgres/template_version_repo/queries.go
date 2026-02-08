package templateversionrepo

// SQL queries for template version operations.
const (
	queryCreate = `
		INSERT INTO content.template_versions (
			template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, created_by, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	queryFindByID = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE id = $1`

	queryInjectablesWithDefinitions = `
		SELECT
			tvi.id, tvi.template_version_id, tvi.injectable_definition_id, tvi.system_injectable_key,
			tvi.is_required, tvi.default_value, tvi.created_at,
			id.id, id.workspace_id, id.key, id.label, id.description, id.data_type, id.created_at, id.updated_at
		FROM content.template_version_injectables tvi
		LEFT JOIN content.injectable_definitions id ON tvi.injectable_definition_id = id.id
		WHERE tvi.template_version_id = $1
		ORDER BY COALESCE(id.key, tvi.system_injectable_key)`

	queryFindByTemplateID = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE template_id = $1
		ORDER BY version_number DESC`

	queryFindPublishedByTemplateID = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE template_id = $1 AND status = 'PUBLISHED'`

	queryFindScheduledToPublish = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE status = 'SCHEDULED' AND scheduled_publish_at <= $1
		ORDER BY scheduled_publish_at`

	queryFindScheduledToArchive = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE status = 'PUBLISHED' AND scheduled_archive_at IS NOT NULL AND scheduled_archive_at <= $1
		ORDER BY scheduled_archive_at`

	queryUpdate = `
		UPDATE content.template_versions
		SET name = $2, description = $3, content_structure = $4, status = $5,
			scheduled_publish_at = $6, scheduled_archive_at = $7,
			published_at = $8, archived_at = $9, published_by = $10, archived_by = $11,
			updated_at = $12
		WHERE id = $1`

	queryUpdateStatusPublished = `
		UPDATE content.template_versions
		SET status = $2, published_at = NOW(), published_by = $3, updated_at = NOW()
		WHERE id = $1`

	queryUpdateStatusArchived = `
		UPDATE content.template_versions
		SET status = $2, archived_at = NOW(), archived_by = $3, updated_at = NOW()
		WHERE id = $1`

	queryUpdateStatusDefault = `UPDATE content.template_versions SET status = $2, updated_at = NOW() WHERE id = $1`

	queryDelete = `DELETE FROM content.template_versions WHERE id = $1`

	queryExistsByVersionNumber = `SELECT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = $1 AND version_number = $2)`

	queryExistsByName = `SELECT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = $1 AND name = $2)`

	queryExistsByNameExcluding = `SELECT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = $1 AND name = $2 AND id != $3)`

	queryGetNextVersionNumber = `SELECT COALESCE(MAX(version_number), 0) + 1 FROM content.template_versions WHERE template_id = $1`

	queryHasScheduledVersion = `SELECT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = $1 AND status = 'SCHEDULED')`

	queryExistsScheduledAtTime = `SELECT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = $1 AND status = 'SCHEDULED' AND scheduled_publish_at = $2 AND ($3::uuid IS NULL OR id != $3::uuid))`

	queryCountByTemplateID = `SELECT COUNT(*) FROM content.template_versions WHERE template_id = $1`
)
