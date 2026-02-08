package workspacememberrepo

// SQL queries for workspace member operations.
const (
	queryCreate = `
		INSERT INTO identity.workspace_members (id, workspace_id, user_id, role, membership_status, joined_at, invited_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`

	queryFindByID = `
		SELECT id, workspace_id, user_id, role, membership_status, joined_at, invited_by, created_at
		FROM identity.workspace_members
		WHERE id = $1`

	queryFindByUserAndWorkspace = `
		SELECT id, workspace_id, user_id, role, membership_status, joined_at, invited_by, created_at
		FROM identity.workspace_members
		WHERE user_id = $1 AND workspace_id = $2`

	queryFindByWorkspace = `
		SELECT m.id, m.workspace_id, m.user_id, m.role, m.membership_status, m.joined_at, m.invited_by, m.created_at,
			   u.id, u.email, u.full_name, u.external_identity_id, u.status, u.created_at
		FROM identity.workspace_members m
		INNER JOIN identity.users u ON m.user_id = u.id
		WHERE m.workspace_id = $1
		ORDER BY m.role, u.full_name`

	queryFindByUser = `
		SELECT id, workspace_id, user_id, role, membership_status, joined_at, invited_by, created_at
		FROM identity.workspace_members
		WHERE user_id = $1
		ORDER BY created_at DESC`

	queryFindActiveByUserAndWorkspace = `
		SELECT id, workspace_id, user_id, role, membership_status, joined_at, invited_by, created_at
		FROM identity.workspace_members
		WHERE user_id = $1 AND workspace_id = $2 AND membership_status = 'ACTIVE'`

	queryUpdate = `
		UPDATE identity.workspace_members
		SET role = $2, membership_status = $3
		WHERE id = $1`

	queryDelete = `DELETE FROM identity.workspace_members WHERE id = $1`

	queryActivate = `
		UPDATE identity.workspace_members
		SET membership_status = 'ACTIVE', joined_at = NOW()
		WHERE id = $1 AND membership_status = 'PENDING'`

	queryUpdateRole = `UPDATE identity.workspace_members SET role = $2 WHERE id = $1`
)
