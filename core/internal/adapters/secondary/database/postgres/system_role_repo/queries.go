package systemrolerepo

// SQL queries for system role operations.
const (
	queryCreate = `
		INSERT INTO identity.system_roles (id, user_id, role, granted_by, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByUserID = `
		SELECT id, user_id, role, granted_by, created_at
		FROM identity.system_roles
		WHERE user_id = $1`

	queryFindAll = `
		SELECT id, user_id, role, granted_by, created_at
		FROM identity.system_roles
		ORDER BY role, created_at`

	queryDelete = `DELETE FROM identity.system_roles WHERE user_id = $1`

	queryUpdateRole = `UPDATE identity.system_roles SET role = $2 WHERE user_id = $1`
)
