package workspacerepo

// SQL queries for workspace operations.
const (
	queryCreate = `
		INSERT INTO tenancy.workspaces (id, tenant_id, code, name, type, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	queryFindByID = `
		SELECT id, tenant_id, code, name, type, status,
		       created_at, updated_at
		FROM tenancy.workspaces
		WHERE id = $1`

	// queryFindByTenantPaginated lists workspaces with pagination, optional search, and conditional ordering.
	// When query ($3) is provided: orders by similarity (relevance).
	// When query is empty: orders by access history (most recent), then by name.
	queryFindByTenantPaginated = `
		SELECT w.id, w.tenant_id, w.code, w.name, w.type, w.status,
		       w.created_at, w.updated_at
		FROM tenancy.workspaces w
		LEFT JOIN identity.user_access_history h
			ON w.id = h.entity_id
			AND h.entity_type = 'WORKSPACE'
			AND h.user_id = $2
		WHERE w.tenant_id = $1
		  AND ($3 = '' OR w.name ILIKE '%' || $3 || '%' OR w.code ILIKE '%' || $3 || '%')
		  AND ($6 = '' OR w.status = $6::workspace_status)
		ORDER BY
			(w.type = 'SYSTEM') DESC,
			CASE WHEN $3 != '' THEN GREATEST(similarity(w.name, $3), similarity(w.code, $3)) ELSE 0 END DESC,
			CASE WHEN $3 = '' THEN h.accessed_at END DESC NULLS LAST,
			w.name ASC
		LIMIT $4 OFFSET $5`

	queryCountByTenant = `
		SELECT COUNT(*) FROM tenancy.workspaces
		WHERE tenant_id = $1
		  AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR code ILIKE '%' || $2 || '%')
		  AND ($3 = '' OR status = $3::workspace_status)`

	queryFindByUser = `
		SELECT w.id, w.tenant_id, w.code, w.name, w.type, w.status,
		       w.created_at, w.updated_at, m.role
		FROM tenancy.workspaces w
		INNER JOIN identity.workspace_members m ON w.id = m.workspace_id
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE' AND w.status != 'ARCHIVED'
		ORDER BY w.name`

	queryFindSystemByTenantNull = `
		SELECT id, tenant_id, code, name, type, status,
		       created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id IS NULL AND type = 'SYSTEM'`

	queryFindSystemByTenant = `
		SELECT id, tenant_id, code, name, type, status,
		       created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id = $1 AND type = 'SYSTEM'`

	queryUpdate = `
		UPDATE tenancy.workspaces
		SET code = $2, name = $3, updated_at = $4
		WHERE id = $1`

	queryUpdateStatus = `
		UPDATE tenancy.workspaces
		SET status = $2, updated_at = NOW()
		WHERE id = $1`

	queryExistsSystemForTenantNull = `
		SELECT EXISTS(SELECT 1 FROM tenancy.workspaces WHERE tenant_id IS NULL AND type = 'SYSTEM')`

	queryExistsSystemForTenant = `
		SELECT EXISTS(SELECT 1 FROM tenancy.workspaces WHERE tenant_id = $1 AND type = 'SYSTEM')`

	queryFindByCodeAndTenant = `
		SELECT id, tenant_id, code, name, type, status,
		       created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id = $1 AND code = $2`

	queryExistsByCodeForTenant = `
		SELECT EXISTS(SELECT 1 FROM tenancy.workspaces WHERE tenant_id = $1 AND code = $2 AND ($3 = '' OR id != $3::uuid))`
)
