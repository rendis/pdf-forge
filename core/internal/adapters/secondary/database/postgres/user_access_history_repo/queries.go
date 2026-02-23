package useraccesshistoryrepo

// SQL queries for user access history operations.
const (
	queryRecordAccess = `
		INSERT INTO identity.user_access_history (user_id, entity_type, entity_id, accessed_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, entity_type, entity_id)
		DO UPDATE SET accessed_at = CURRENT_TIMESTAMP
		RETURNING id`

	queryGetRecentAccessIDs = `
		SELECT entity_id
		FROM identity.user_access_history
		WHERE user_id = $1 AND entity_type = $2
		ORDER BY accessed_at DESC
		LIMIT $3`

	queryGetRecentAccesses = `
		SELECT id, user_id, entity_type, entity_id, accessed_at
		FROM identity.user_access_history
		WHERE user_id = $1 AND entity_type = $2
		ORDER BY accessed_at DESC
		LIMIT $3`

	queryGetAccessTimesForEntities = `
		SELECT entity_id, accessed_at
		FROM identity.user_access_history
		WHERE user_id = $1
		  AND entity_type = $2
		  AND entity_id = ANY($3)`

	queryDeleteOldAccesses = `
		DELETE FROM identity.user_access_history
		WHERE id IN (
			SELECT id FROM identity.user_access_history
			WHERE user_id = $1 AND entity_type = $2
			ORDER BY accessed_at DESC
			OFFSET $3
		)`

	queryDeleteByEntity = `
		DELETE FROM identity.user_access_history
		WHERE entity_type = $1 AND entity_id = $2`

	// queryRecordTenantAccessIfAllowed inserts only if user has tenant membership OR system role
	queryRecordTenantAccessIfAllowed = `
		INSERT INTO identity.user_access_history (user_id, entity_type, entity_id, accessed_at)
		SELECT $1, 'TENANT', $2, CURRENT_TIMESTAMP
		WHERE EXISTS (
			SELECT 1 FROM identity.tenant_members
			WHERE user_id = $1 AND tenant_id = $2 AND membership_status = 'ACTIVE'
		) OR EXISTS (
			SELECT 1 FROM identity.system_roles WHERE user_id = $1
		)
		ON CONFLICT (user_id, entity_type, entity_id)
		DO UPDATE SET accessed_at = CURRENT_TIMESTAMP
		RETURNING id`

	// queryRecordWorkspaceAccessIfAllowed inserts only if user has workspace membership OR system role
	queryRecordWorkspaceAccessIfAllowed = `
		INSERT INTO identity.user_access_history (user_id, entity_type, entity_id, accessed_at)
		SELECT $1, 'WORKSPACE', $2, CURRENT_TIMESTAMP
		WHERE EXISTS (
			SELECT 1 FROM identity.workspace_members
			WHERE user_id = $1 AND workspace_id = $2 AND membership_status = 'ACTIVE'
		) OR EXISTS (
			SELECT 1 FROM identity.system_roles WHERE user_id = $1
		)
		ON CONFLICT (user_id, entity_type, entity_id)
		DO UPDATE SET accessed_at = CURRENT_TIMESTAMP
		RETURNING id`
)
