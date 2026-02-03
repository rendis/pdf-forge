package organization

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
	organizationuc "github.com/rendis/pdf-forge/internal/core/usecase/organization"
)

// NewWorkspaceService creates a new workspace service.
func NewWorkspaceService(
	workspaceRepo port.WorkspaceRepository,
	tenantRepo port.TenantRepository,
	memberRepo port.WorkspaceMemberRepository,
	accessHistoryRepo port.UserAccessHistoryRepository,
) organizationuc.WorkspaceUseCase {
	return &WorkspaceService{
		workspaceRepo:     workspaceRepo,
		tenantRepo:        tenantRepo,
		memberRepo:        memberRepo,
		accessHistoryRepo: accessHistoryRepo,
	}
}

// WorkspaceService implements workspace business logic.
type WorkspaceService struct {
	workspaceRepo     port.WorkspaceRepository
	tenantRepo        port.TenantRepository
	memberRepo        port.WorkspaceMemberRepository
	accessHistoryRepo port.UserAccessHistoryRepository
}

// CreateWorkspace creates a new workspace.
func (s *WorkspaceService) CreateWorkspace(ctx context.Context, cmd organizationuc.CreateWorkspaceCommand) (*entity.Workspace, error) {
	// For SYSTEM type, check if one already exists and auto-generate code
	code := cmd.Code
	if cmd.Type == entity.WorkspaceTypeSystem {
		exists, err := s.workspaceRepo.ExistsSystemForTenant(ctx, cmd.TenantID)
		if err != nil {
			return nil, fmt.Errorf("checking system workspace existence: %w", err)
		}
		if exists {
			return nil, entity.ErrSystemWorkspaceExists
		}
		code = "SYS_WRKSP"
	}

	// Check code uniqueness within tenant
	if cmd.TenantID != nil {
		codeExists, err := s.workspaceRepo.ExistsByCodeForTenant(ctx, *cmd.TenantID, code, "")
		if err != nil {
			return nil, fmt.Errorf("checking workspace code existence: %w", err)
		}
		if codeExists {
			return nil, entity.ErrWorkspaceCodeExists
		}
	}

	workspace := &entity.Workspace{
		ID:        uuid.NewString(),
		TenantID:  cmd.TenantID,
		Code:      code,
		Name:      cmd.Name,
		Type:      cmd.Type,
		Status:    entity.WorkspaceStatusActive,
		CreatedAt: time.Now().UTC(),
	}

	if err := workspace.Validate(); err != nil {
		return nil, fmt.Errorf("validating workspace: %w", err)
	}

	id, err := s.workspaceRepo.Create(ctx, workspace)
	if err != nil {
		return nil, fmt.Errorf("creating workspace: %w", err)
	}
	workspace.ID = id

	// Add creator as owner using NewActiveMember
	member := entity.NewActiveMember(workspace.ID, cmd.CreatedBy, entity.WorkspaceRoleOwner)
	member.ID = uuid.NewString()
	if _, err := s.memberRepo.Create(ctx, member); err != nil {
		slog.WarnContext(ctx, "failed to add creator as workspace owner",
			slog.String("workspace_id", workspace.ID),
			slog.String("user_id", cmd.CreatedBy),
			slog.Any("error", err),
		)
	}

	slog.InfoContext(ctx, "workspace created",
		slog.String("workspace_id", workspace.ID),
		slog.String("name", workspace.Name),
		slog.String("type", string(workspace.Type)),
	)

	return workspace, nil
}

// GetWorkspace retrieves a workspace by ID.
func (s *WorkspaceService) GetWorkspace(ctx context.Context, id string) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding workspace %s: %w", id, err)
	}
	return workspace, nil
}

// ListUserWorkspaces lists all workspaces a user has access to.
func (s *WorkspaceService) ListUserWorkspaces(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error) {
	workspaces, err := s.workspaceRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user workspaces: %w", err)
	}
	return workspaces, nil
}

// ListWorkspacesPaginated lists workspaces for a tenant with pagination and optional search.
func (s *WorkspaceService) ListWorkspacesPaginated(ctx context.Context, tenantID, userID string, filters port.WorkspaceFilters) ([]*entity.Workspace, int64, error) {
	filters.UserID = userID
	workspaces, total, err := s.workspaceRepo.FindByTenantPaginated(ctx, tenantID, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("listing workspaces paginated: %w", err)
	}

	// Enrich with access history
	if err := s.enrichWorkspacesWithAccessHistory(ctx, userID, workspaces); err != nil {
		slog.WarnContext(ctx, "failed to enrich workspaces with access history", slog.String("error", err.Error()))
	}

	return workspaces, total, nil
}

// UpdateWorkspace updates a workspace's details.
func (s *WorkspaceService) UpdateWorkspace(ctx context.Context, cmd organizationuc.UpdateWorkspaceCommand) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding workspace: %w", err)
	}

	// Check code uniqueness within tenant (exclude self)
	if cmd.Code != "" && workspace.TenantID != nil && cmd.Code != workspace.Code {
		codeExists, err := s.workspaceRepo.ExistsByCodeForTenant(ctx, *workspace.TenantID, cmd.Code, workspace.ID)
		if err != nil {
			return nil, fmt.Errorf("checking workspace code existence: %w", err)
		}
		if codeExists {
			return nil, entity.ErrWorkspaceCodeExists
		}
	}

	workspace.Name = cmd.Name
	if cmd.Code != "" {
		workspace.Code = cmd.Code
	}
	now := time.Now().UTC()
	workspace.UpdatedAt = &now

	if err := workspace.Validate(); err != nil {
		return nil, fmt.Errorf("validating workspace: %w", err)
	}

	if err := s.workspaceRepo.Update(ctx, workspace); err != nil {
		return nil, fmt.Errorf("updating workspace: %w", err)
	}

	slog.InfoContext(ctx, "workspace updated",
		slog.String("workspace_id", workspace.ID),
		slog.String("name", workspace.Name),
	)

	return workspace, nil
}

// ArchiveWorkspace archives a workspace (soft delete).
func (s *WorkspaceService) ArchiveWorkspace(ctx context.Context, id string) error {
	workspace, err := s.workspaceRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding workspace: %w", err)
	}

	if workspace.Type == entity.WorkspaceTypeSystem {
		return entity.ErrCannotArchiveSystem
	}

	if err := s.workspaceRepo.UpdateStatus(ctx, id, entity.WorkspaceStatusArchived); err != nil {
		return fmt.Errorf("archiving workspace: %w", err)
	}

	slog.InfoContext(ctx, "workspace archived", slog.String("workspace_id", id))
	return nil
}

// ActivateWorkspace activates a workspace.
func (s *WorkspaceService) ActivateWorkspace(ctx context.Context, id string) error {
	if err := s.workspaceRepo.UpdateStatus(ctx, id, entity.WorkspaceStatusActive); err != nil {
		return fmt.Errorf("activating workspace: %w", err)
	}

	slog.InfoContext(ctx, "workspace activated", slog.String("workspace_id", id))
	return nil
}

// GetSystemWorkspace retrieves the system workspace for a tenant.
func (s *WorkspaceService) GetSystemWorkspace(ctx context.Context, tenantID *string) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindSystemByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("finding system workspace: %w", err)
	}
	return workspace, nil
}

// UpdateWorkspaceStatus updates a workspace's status (ACTIVE, SUSPENDED, ARCHIVED).
func (s *WorkspaceService) UpdateWorkspaceStatus(ctx context.Context, cmd organizationuc.UpdateWorkspaceStatusCommand) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding workspace: %w", err)
	}

	// Cannot change status of SYSTEM workspace
	if workspace.Type == entity.WorkspaceTypeSystem {
		return nil, entity.ErrCannotModifySystemWorkspace
	}

	if err := s.workspaceRepo.UpdateStatus(ctx, cmd.ID, cmd.Status); err != nil {
		return nil, fmt.Errorf("updating workspace status: %w", err)
	}

	workspace.Status = cmd.Status
	now := time.Now().UTC()
	workspace.UpdatedAt = &now

	slog.InfoContext(ctx, "workspace status updated",
		slog.String("workspace_id", cmd.ID),
		slog.String("status", string(cmd.Status)),
	)

	return workspace, nil
}

// enrichWorkspacesWithAccessHistory adds LastAccessedAt to workspaces.
func (s *WorkspaceService) enrichWorkspacesWithAccessHistory(ctx context.Context, userID string, workspaces []*entity.Workspace) error {
	if len(workspaces) == 0 {
		return nil
	}

	// Extract workspace IDs
	ids := make([]string, len(workspaces))
	for i, w := range workspaces {
		ids[i] = w.ID
	}

	// Get access times
	accessTimes, err := s.accessHistoryRepo.GetAccessTimesForEntities(ctx, userID, entity.AccessEntityTypeWorkspace, ids)
	if err != nil {
		return fmt.Errorf("getting access times: %w", err)
	}

	// Enrich workspaces
	for _, w := range workspaces {
		if accessedAt, ok := accessTimes[w.ID]; ok {
			w.LastAccessedAt = &accessedAt
		}
	}

	return nil
}
