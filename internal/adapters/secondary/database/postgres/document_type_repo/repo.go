package documenttyperepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

// New creates a new document type repository.
func New(pool *pgxpool.Pool) port.DocumentTypeRepository {
	return &Repository{pool: pool}
}

// Repository implements the document type repository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new document type.
func (r *Repository) Create(ctx context.Context, docType *entity.DocumentType) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		docType.TenantID,
		docType.Code,
		docType.Name,
		docType.Description,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("inserting document type: %w", err)
	}

	return id, nil
}

// FindByID finds a document type by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.DocumentType, error) {
	var docType entity.DocumentType
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&docType.ID,
		&docType.TenantID,
		&docType.Code,
		&docType.Name,
		&docType.Description,
		&docType.CreatedAt,
		&docType.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrDocumentTypeNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying document type: %w", err)
	}

	return &docType, nil
}

// FindByCode finds a document type by code within a tenant.
func (r *Repository) FindByCode(ctx context.Context, tenantID, code string) (*entity.DocumentType, error) {
	var docType entity.DocumentType
	err := r.pool.QueryRow(ctx, queryFindByCode, tenantID, code).Scan(
		&docType.ID,
		&docType.TenantID,
		&docType.Code,
		&docType.Name,
		&docType.Description,
		&docType.CreatedAt,
		&docType.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrDocumentTypeNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying document type by code: %w", err)
	}

	return &docType, nil
}

// FindByTenant lists all document types for a tenant with pagination.
func (r *Repository) FindByTenant(ctx context.Context, tenantID string, filters port.DocumentTypeFilters) ([]*entity.DocumentType, int64, error) {
	var total int64
	err := r.pool.QueryRow(ctx, queryCountByTenant, tenantID, filters.Search).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting document types: %w", err)
	}

	rows, err := r.pool.Query(ctx, queryFindByTenant, tenantID, filters.Search, filters.Limit, filters.Offset)
	if err != nil {
		return nil, 0, fmt.Errorf("querying document types: %w", err)
	}
	defer rows.Close()

	var result []*entity.DocumentType
	for rows.Next() {
		var docType entity.DocumentType
		err := rows.Scan(
			&docType.ID,
			&docType.TenantID,
			&docType.Code,
			&docType.Name,
			&docType.Description,
			&docType.CreatedAt,
			&docType.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning document type: %w", err)
		}
		result = append(result, &docType)
	}

	return result, total, rows.Err()
}

// FindByTenantWithTemplateCount lists document types with template usage count.
func (r *Repository) FindByTenantWithTemplateCount(ctx context.Context, tenantID string, filters port.DocumentTypeFilters) ([]*entity.DocumentTypeListItem, int64, error) {
	var total int64
	err := r.pool.QueryRow(ctx, queryCountByTenant, tenantID, filters.Search).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting document types: %w", err)
	}

	rows, err := r.pool.Query(ctx, queryFindByTenantWithTemplateCount, tenantID, filters.Search, filters.Limit, filters.Offset)
	if err != nil {
		return nil, 0, fmt.Errorf("querying document types with count: %w", err)
	}
	defer rows.Close()

	var result []*entity.DocumentTypeListItem
	for rows.Next() {
		var item entity.DocumentTypeListItem
		err := rows.Scan(
			&item.ID,
			&item.TenantID,
			&item.Code,
			&item.Name,
			&item.Description,
			&item.TemplatesCount,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning document type list item: %w", err)
		}
		result = append(result, &item)
	}

	return result, total, rows.Err()
}

// Update updates a document type (name and description only, code is immutable).
func (r *Repository) Update(ctx context.Context, docType *entity.DocumentType) error {
	result, err := r.pool.Exec(ctx, queryUpdate,
		docType.ID,
		docType.Name,
		docType.Description,
	)
	if err != nil {
		return fmt.Errorf("updating document type: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrDocumentTypeNotFound
	}

	return nil
}

// Delete deletes a document type.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting document type: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrDocumentTypeNotFound
	}

	return nil
}

// ExistsByCode checks if a document type with the given code exists in the tenant.
func (r *Repository) ExistsByCode(ctx context.Context, tenantID, code string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByCode, tenantID, code).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking document type existence: %w", err)
	}

	return exists, nil
}

// ExistsByCodeExcluding checks excluding a specific document type ID.
func (r *Repository) ExistsByCodeExcluding(ctx context.Context, tenantID, code, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByCodeExcluding, tenantID, code, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking document type existence: %w", err)
	}

	return exists, nil
}

// CountTemplatesByType returns the number of templates using this document type.
func (r *Repository) CountTemplatesByType(ctx context.Context, documentTypeID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountTemplatesByType, documentTypeID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting templates by type: %w", err)
	}

	return count, nil
}

// FindTemplatesByType returns templates assigned to this document type.
func (r *Repository) FindTemplatesByType(ctx context.Context, documentTypeID string) ([]*entity.DocumentTypeTemplateInfo, error) {
	rows, err := r.pool.Query(ctx, queryFindTemplatesByType, documentTypeID)
	if err != nil {
		return nil, fmt.Errorf("querying templates by type: %w", err)
	}
	defer rows.Close()

	var result []*entity.DocumentTypeTemplateInfo
	for rows.Next() {
		var info entity.DocumentTypeTemplateInfo
		err := rows.Scan(
			&info.ID,
			&info.Title,
			&info.WorkspaceID,
			&info.WorkspaceName,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning template info: %w", err)
		}
		result = append(result, &info)
	}

	return result, rows.Err()
}
