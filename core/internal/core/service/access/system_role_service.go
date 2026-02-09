package access

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
	accessuc "github.com/rendis/pdf-forge/core/internal/core/usecase/access"
)

// NewSystemRoleService creates a new system role service.
func NewSystemRoleService(
	systemRoleRepo port.SystemRoleRepository,
	userRepo port.UserRepository,
) accessuc.SystemRoleUseCase {
	return &SystemRoleService{
		systemRoleRepo: systemRoleRepo,
		userRepo:       userRepo,
	}
}

// SystemRoleService implements the SystemRoleUseCase interface.
type SystemRoleService struct {
	systemRoleRepo port.SystemRoleRepository
	userRepo       port.UserRepository
}

// ListUsersWithSystemRoles lists all users that have system roles.
func (s *SystemRoleService) ListUsersWithSystemRoles(ctx context.Context) ([]*entity.SystemRoleWithUser, error) {
	assignments, err := s.systemRoleRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing system roles: %w", err)
	}

	result := make([]*entity.SystemRoleWithUser, 0, len(assignments))
	for _, assignment := range assignments {
		user, err := s.userRepo.FindByID(ctx, assignment.UserID)
		if err != nil {
			slog.WarnContext(ctx, "user not found for system role",
				slog.String("user_id", assignment.UserID),
				slog.Any("error", err),
			)
			continue
		}
		result = append(result, &entity.SystemRoleWithUser{
			SystemRoleAssignment: *assignment,
			User:                 user,
		})
	}

	return result, nil
}

// AssignRole assigns a system role to a user.
func (s *SystemRoleService) AssignRole(ctx context.Context, cmd accessuc.AssignSystemRoleCommand) (*entity.SystemRoleAssignment, error) {
	// Check if user exists
	_, err := s.userRepo.FindByID(ctx, cmd.UserID)
	if err != nil {
		return nil, fmt.Errorf("finding user: %w", err)
	}

	// Check if user already has a system role
	existing, err := s.systemRoleRepo.FindByUserID(ctx, cmd.UserID)
	if err == nil && existing != nil {
		return nil, entity.ErrSystemRoleExists
	}

	// Create new assignment
	assignment := &entity.SystemRoleAssignment{
		ID:        uuid.NewString(),
		UserID:    cmd.UserID,
		Role:      cmd.Role,
		GrantedBy: &cmd.GrantedBy,
		CreatedAt: time.Now().UTC(),
	}

	id, err := s.systemRoleRepo.Create(ctx, assignment)
	if err != nil {
		return nil, fmt.Errorf("creating system role: %w", err)
	}
	assignment.ID = id

	slog.InfoContext(ctx, "system role assigned",
		slog.String("user_id", cmd.UserID),
		slog.String("role", string(cmd.Role)),
		slog.String("granted_by", cmd.GrantedBy),
	)

	return assignment, nil
}

// AssignRoleByEmail assigns a system role to a user identified by email.
// Creates a shadow user if the email doesn't exist.
func (s *SystemRoleService) AssignRoleByEmail(ctx context.Context, cmd accessuc.AssignSystemRoleByEmailCommand) (*entity.SystemRoleWithUser, error) {
	// Find or create user by email
	user, err := s.userRepo.FindByEmail(ctx, cmd.Email)
	if err != nil {
		if !errors.Is(err, entity.ErrUserNotFound) {
			return nil, fmt.Errorf("finding user by email: %w", err)
		}

		// Create shadow user
		user = entity.NewUser(cmd.Email, cmd.FullName)
		user.ID = uuid.NewString()
		_, err = s.userRepo.Create(ctx, user)
		if err != nil {
			return nil, fmt.Errorf("creating shadow user: %w", err)
		}

		slog.InfoContext(ctx, "shadow user created for system role",
			slog.String("user_id", user.ID),
			slog.String("email", user.Email),
		)
	}

	// Assign role using existing logic
	assignment, err := s.AssignRole(ctx, accessuc.AssignSystemRoleCommand{
		UserID:    user.ID,
		Role:      cmd.Role,
		GrantedBy: cmd.GrantedBy,
	})
	if err != nil {
		return nil, err
	}

	return &entity.SystemRoleWithUser{
		SystemRoleAssignment: *assignment,
		User:                 user,
	}, nil
}

// RevokeRole revokes a user's system role.
func (s *SystemRoleService) RevokeRole(ctx context.Context, cmd accessuc.RevokeSystemRoleCommand) error {
	if err := s.systemRoleRepo.Delete(ctx, cmd.UserID); err != nil {
		return fmt.Errorf("revoking system role: %w", err)
	}

	slog.InfoContext(ctx, "system role revoked",
		slog.String("user_id", cmd.UserID),
		slog.String("revoked_by", cmd.RevokedBy),
	)

	return nil
}

// GetUserSystemRole gets a user's system role.
func (s *SystemRoleService) GetUserSystemRole(ctx context.Context, userID string) (*entity.SystemRoleAssignment, error) {
	return s.systemRoleRepo.FindByUserID(ctx, userID)
}
