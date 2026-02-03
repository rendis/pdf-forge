package tenantmemberrepo

// SQL queries for tenant member operations.
const (
	queryCreate = `
		INSERT INTO identity.tenant_members (id, tenant_id, user_id, role, membership_status, granted_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	queryFindByID = `
		SELECT id, tenant_id, user_id, role, membership_status, granted_by, created_at
		FROM identity.tenant_members
		WHERE id = $1`

	queryFindByUserAndTenant = `
		SELECT id, tenant_id, user_id, role, membership_status, granted_by, created_at
		FROM identity.tenant_members
		WHERE user_id = $1 AND tenant_id = $2`

	queryFindByTenant = `
		SELECT m.id, m.tenant_id, m.user_id, m.role, m.membership_status, m.granted_by, m.created_at,
			   u.id, u.email, u.full_name, u.external_identity_id, u.status, u.created_at
		FROM identity.tenant_members m
		INNER JOIN identity.users u ON m.user_id = u.id
		WHERE m.tenant_id = $1
		ORDER BY m.role, u.full_name`

	queryFindByUser = `
		SELECT id, tenant_id, user_id, role, membership_status, granted_by, created_at
		FROM identity.tenant_members
		WHERE user_id = $1
		ORDER BY created_at DESC`

	queryFindTenantsWithRoleByUser = `
		SELECT t.id, t.name, t.code, COALESCE(t.settings, '{}'), t.created_at, t.updated_at, m.role
		FROM identity.tenant_members m
		INNER JOIN tenancy.tenants t ON m.tenant_id = t.id
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE'
		ORDER BY t.name`

	queryFindActiveByUserAndTenant = `
		SELECT id, tenant_id, user_id, role, membership_status, granted_by, created_at
		FROM identity.tenant_members
		WHERE user_id = $1 AND tenant_id = $2 AND membership_status = 'ACTIVE'`

	queryDelete = `DELETE FROM identity.tenant_members WHERE id = $1`

	queryUpdateRole = `UPDATE identity.tenant_members SET role = $2 WHERE id = $1`

	queryCountByRole = `
		SELECT COUNT(*)
		FROM identity.tenant_members
		WHERE tenant_id = $1 AND role = $2 AND membership_status = 'ACTIVE'`

	// queryFindTenantsWithRoleByUserAndIDs uses unnest to preserve the order of input IDs.
	// The ord column from unnest maintains the original order of the provided tenant IDs.
	queryFindTenantsWithRoleByUserAndIDs = `
		SELECT t.id, t.name, t.code, COALESCE(t.settings, '{}'), t.created_at, t.updated_at, m.role
		FROM unnest($2::uuid[]) WITH ORDINALITY AS input(id, ord)
		INNER JOIN tenancy.tenants t ON t.id = input.id
		INNER JOIN identity.tenant_members m ON m.tenant_id = t.id
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE'
		ORDER BY input.ord`

	// queryFindTenantsWithRoleByUserPaginated lists tenants a user belongs to with pagination and optional search.
	// When query ($2) is provided: orders by similarity (relevance).
	// When query is empty: orders by access history (most recent), then by name.
	queryFindTenantsWithRoleByUserPaginated = `
		SELECT t.id, t.name, t.code, COALESCE(t.settings, '{}'), t.created_at, t.updated_at, m.role
		FROM identity.tenant_members m
		INNER JOIN tenancy.tenants t ON m.tenant_id = t.id
		LEFT JOIN identity.user_access_history h
			ON t.id = h.entity_id
			AND h.entity_type = 'TENANT'
			AND h.user_id = $1
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE'
		  AND ($2 = '' OR t.name ILIKE '%' || $2 || '%' OR t.code ILIKE '%' || $2 || '%')
		ORDER BY
			CASE WHEN $2 != '' THEN GREATEST(similarity(t.name, $2), similarity(t.code, $2)) ELSE 0 END DESC,
			CASE WHEN $2 = '' THEN h.accessed_at END DESC NULLS LAST,
			t.name ASC
		LIMIT $3 OFFSET $4`

	// queryCountTenantsWithRoleByUser counts tenants a user belongs to with optional search filter.
	queryCountTenantsWithRoleByUser = `
		SELECT COUNT(*)
		FROM identity.tenant_members m
		INNER JOIN tenancy.tenants t ON m.tenant_id = t.id
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE'
		  AND ($2 = '' OR t.name ILIKE '%' || $2 || '%' OR t.code ILIKE '%' || $2 || '%')`
)
