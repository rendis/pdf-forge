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

	// Global fallback queries: include SYS tenant types with priority for tenant's own types
	queryFindByTenantWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT dt.*,
				ROW_NUMBER() OVER (
					PARTITION BY dt.code
					ORDER BY CASE WHEN dt.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN dt.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.document_types dt, sys_tenant st
			WHERE dt.tenant_id = $1 OR dt.tenant_id = st.id
		)
		SELECT id, tenant_id, code, name, COALESCE(description, '{}'), is_global, created_at, updated_at
		FROM ranked
		WHERE rn = 1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')
		ORDER BY code ASC
		LIMIT $3 OFFSET $4`

	queryCountByTenantWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT dt.code,
				ROW_NUMBER() OVER (
					PARTITION BY dt.code
					ORDER BY CASE WHEN dt.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn
			FROM content.document_types dt, sys_tenant st
			WHERE dt.tenant_id = $1 OR dt.tenant_id = st.id
		)
		SELECT COUNT(*) FROM ranked
		WHERE rn = 1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')`

	queryFindByTenantWithTemplateCountAndGlobal = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT dt.*,
				ROW_NUMBER() OVER (
					PARTITION BY dt.code
					ORDER BY CASE WHEN dt.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN dt.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.document_types dt, sys_tenant st
			WHERE dt.tenant_id = $1 OR dt.tenant_id = st.id
		)
		SELECT
			r.id, r.tenant_id, r.code, r.name, COALESCE(r.description, '{}'), r.is_global,
			COALESCE((SELECT COUNT(*) FROM content.templates t WHERE t.document_type_id = r.id), 0) as templates_count,
			r.created_at, r.updated_at
		FROM ranked r
		WHERE r.rn = 1
		  AND ($2 = '' OR r.code ILIKE '%' || $2 || '%')
		ORDER BY r.code ASC
		LIMIT $3 OFFSET $4`

	queryFindByCodeWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT dt.*,
				ROW_NUMBER() OVER (
					PARTITION BY dt.code
					ORDER BY CASE WHEN dt.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN dt.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.document_types dt, sys_tenant st
			WHERE (dt.tenant_id = $1 OR dt.tenant_id = st.id) AND dt.code = $2
		)
		SELECT id, tenant_id, code, name, COALESCE(description, '{}'), is_global, created_at, updated_at
		FROM ranked WHERE rn = 1`

	queryIsSysTenant = `SELECT is_system FROM tenancy.tenants WHERE id = $1`
)
