package documenttyperepo

// SQL queries for document type operations.
const (
	queryCreate = `
		INSERT INTO content.document_types (tenant_id, code, name, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id`

	queryFindByID = `
		SELECT id, tenant_id, code, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.document_types
		WHERE id = $1`

	queryFindByCode = `
		SELECT id, tenant_id, code, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.document_types
		WHERE tenant_id = $1 AND code = $2`

	queryFindByTenant = `
		SELECT id, tenant_id, code, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.document_types
		WHERE tenant_id = $1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')
		ORDER BY code ASC
		LIMIT $3 OFFSET $4`

	queryCountByTenant = `
		SELECT COUNT(*) FROM content.document_types
		WHERE tenant_id = $1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')`

	queryFindByTenantWithTemplateCount = `
		SELECT
			dt.id, dt.tenant_id, dt.code, dt.name, COALESCE(dt.description, '{}'),
			COALESCE((SELECT COUNT(*) FROM content.templates t WHERE t.document_type_id = dt.id), 0) as templates_count,
			dt.created_at, dt.updated_at
		FROM content.document_types dt
		WHERE dt.tenant_id = $1
		  AND ($2 = '' OR dt.code ILIKE '%' || $2 || '%')
		ORDER BY dt.code ASC
		LIMIT $3 OFFSET $4`

	queryUpdate = `
		UPDATE content.document_types
		SET name = $2, description = $3
		WHERE id = $1`

	queryDelete = `DELETE FROM content.document_types WHERE id = $1`

	queryExistsByCode = `
		SELECT EXISTS(SELECT 1 FROM content.document_types WHERE tenant_id = $1 AND code = $2)`

	queryExistsByCodeExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.document_types WHERE tenant_id = $1 AND code = $2 AND id != $3)`

	queryCountTemplatesByType = `
		SELECT COUNT(*) FROM content.templates WHERE document_type_id = $1`

	queryFindTemplatesByType = `
		SELECT t.id, t.title, t.workspace_id, w.name
		FROM content.templates t
		JOIN tenancy.workspaces w ON w.id = t.workspace_id
		WHERE t.document_type_id = $1
		ORDER BY w.name, t.title`
)
