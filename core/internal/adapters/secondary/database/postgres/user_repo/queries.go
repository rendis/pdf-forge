package userrepo

// SQL queries for user operations.
const (
	queryCreate = `
		INSERT INTO identity.users (id, external_identity_id, email, full_name, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	queryFindByID = `
		SELECT id, external_identity_id, email, full_name, status, created_at
		FROM identity.users
		WHERE id = $1`

	queryFindByEmail = `
		SELECT id, external_identity_id, email, full_name, status, created_at
		FROM identity.users
		WHERE email = $1`

	queryFindByExternalID = `
		SELECT id, external_identity_id, email, full_name, status, created_at
		FROM identity.users
		WHERE external_identity_id = $1`

	queryUpdate = `
		UPDATE identity.users
		SET email = $2, full_name = $3, status = $4
		WHERE id = $1`

	queryLinkToIdP = `
		UPDATE identity.users SET external_identity_id = $2 WHERE id = $1`
)
