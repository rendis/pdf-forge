package tenantrepo

// SQL queries for tenant operations.
const (
	queryCreate = `
		INSERT INTO tenancy.tenants (id, code, name, description, status, settings, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	queryFindByID = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE id = $1`

	queryFindByCode = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE code = $1`

	queryFindAll = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		ORDER BY is_system DESC, name`

	queryFindSystemTenant = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE is_system = TRUE`

	queryUpdate = `
		UPDATE tenancy.tenants
		SET name = $2, description = $3, settings = $4, updated_at = $5
		WHERE id = $1`

	queryUpdateStatus = `
		UPDATE tenancy.tenants
		SET status = $2, updated_at = $3
		WHERE id = $1 AND is_system = FALSE`

	queryDelete = `DELETE FROM tenancy.tenants WHERE id = $1`

	queryExistsByCode = `
		SELECT EXISTS(SELECT 1 FROM tenancy.tenants WHERE code = $1)`

	// queryFindAllPaginatedUnified lists tenants with pagination, optional search, and user access ordering.
	// When query ($2) is provided: orders by similarity (relevance).
	// When query is empty: orders by access history (most recent), then by name.
	// Only returns ACTIVE tenants for regular users.
	queryFindAllPaginatedUnified = `
		SELECT t.id, t.code, t.name, t.description, t.is_system, t.status, COALESCE(t.settings, '{}'), t.created_at, t.updated_at
		FROM tenancy.tenants t
		LEFT JOIN identity.user_access_history h
			ON t.id = h.entity_id
			AND h.entity_type = 'TENANT'
			AND h.user_id = $1
		WHERE t.status = 'ACTIVE'
			AND ($2 = '' OR t.name ILIKE '%' || $2 || '%' OR t.code ILIKE '%' || $2 || '%')
		ORDER BY
			t.is_system DESC,
			CASE WHEN $2 != '' THEN GREATEST(similarity(t.name, $2), similarity(t.code, $2)) ELSE 0 END DESC,
			CASE WHEN $2 = '' THEN h.accessed_at END DESC NULLS LAST,
			t.name ASC
		LIMIT $3 OFFSET $4`

	queryCountAllUnified = `
		SELECT COUNT(*) FROM tenancy.tenants
		WHERE status = 'ACTIVE'
			AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')`

	// queryFindAllPaginatedWithSearch lists tenants with pagination and optional search filter.
	// Used for system endpoints with optional query parameter.
	// Returns all tenants regardless of status (admin view).
	queryFindAllPaginatedWithSearch = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
		ORDER BY is_system DESC, status ASC, name ASC
		LIMIT $2 OFFSET $3`

	queryCountAllWithSearch = `
		SELECT COUNT(*) FROM tenancy.tenants
		WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')`

	querySearchByNameOrCode = `
		SELECT id, code, name, description, is_system, status, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE name % $1 OR code % $1
		ORDER BY is_system DESC, GREATEST(similarity(name, $1), similarity(code, $1)) DESC
		LIMIT $2`
)
