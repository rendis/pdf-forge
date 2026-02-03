package middleware

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/core/entity"
	"github.com/rendis/pdf-forge/internal/core/port"
)

const (
	// WorkspaceIDHeader is the header name for the workspace ID.
	WorkspaceIDHeader = "X-Workspace-ID"
	// internalUserIDKey is the context key for the internal user ID (from DB).
	internalUserIDKey = "internal_user_id"
	// workspaceIDKey is the context key for the current workspace ID.
	workspaceIDKey = "workspace_id"
	// workspaceRoleKey is the context key for the user's role in the current workspace.
	workspaceRoleKey = "workspace_role"
)

// IdentityContext creates a middleware that syncs the user from IdP and loads workspace context.
// It requires JWTAuth middleware to be applied before this.
func IdentityContext(userRepo port.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Get user info from JWT (set by JWTAuth middleware)
		email, _ := GetUserEmail(c)

		// Get user from database by email
		user, err := userRepo.FindByEmail(c.Request.Context(), email)
		if err != nil {
			if errors.Is(err, entity.ErrUserNotFound) {
				abortWithError(c, http.StatusForbidden, entity.ErrUserNotFound)
				return
			}
		}

		// Store user ID in context
		c.Set(internalUserIDKey, user.ID)

		c.Next()
	}
}

// WorkspaceContext creates a middleware that requires and loads the user's role for a specific workspace.
// The workspace ID must come from the X-Workspace-ID header.
// This middleware should only be applied to routes that require workspace context.
// Users with system roles (SUPERADMIN) get automatic access as OWNER.
// Users with tenant roles (TENANT_OWNER) get automatic access as ADMIN for workspaces in their tenant.
func WorkspaceContext(
	workspaceRepo port.WorkspaceRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
	tenantMemberRepo port.TenantMemberRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		workspaceID := c.GetHeader(WorkspaceIDHeader)
		if workspaceID == "" {
			abortWithError(c, http.StatusBadRequest, entity.ErrMissingWorkspaceID)
			return
		}

		internalUserID, ok := GetInternalUserID(c)
		if !ok {
			abortWithError(c, http.StatusUnauthorized, entity.ErrUnauthorized)
			return
		}

		// Check superadmin access
		if checkSuperAdminAccess(c, workspaceID, internalUserID) {
			c.Next()
			return
		}

		// Check tenant owner access
		workspace, _ := workspaceRepo.FindByID(c.Request.Context(), workspaceID)
		if checkTenantOwnerAccess(c, workspace, workspaceID, internalUserID, tenantMemberRepo) {
			c.Next()
			return
		}

		// Check workspace member access
		member := checkWorkspaceMemberAccess(c, workspaceID, internalUserID, workspaceMemberRepo)
		if member == nil {
			abortWithError(c, http.StatusForbidden, entity.ErrWorkspaceAccessDenied)
			return
		}

		c.Set(workspaceIDKey, workspaceID)
		c.Set(workspaceRoleKey, member.Role)
		c.Next()
	}
}

// checkSuperAdminAccess checks if user has superadmin access and grants OWNER role.
// Returns true if access was granted and processing should stop.
func checkSuperAdminAccess(c *gin.Context, workspaceID, internalUserID string) bool {
	sysRole, hasSysRole := GetSystemRole(c)
	if !hasSysRole || !sysRole.HasPermission(entity.SystemRoleSuperAdmin) {
		return false
	}

	c.Set(workspaceIDKey, workspaceID)
	c.Set(workspaceRoleKey, entity.WorkspaceRoleOwner)
	slog.DebugContext(c.Request.Context(), "superadmin workspace access granted",
		slog.String("user_id", internalUserID),
		slog.String("workspace_id", workspaceID),
		slog.String("operation_id", GetOperationID(c)),
	)
	return true
}

// checkTenantOwnerAccess checks if user is tenant owner for the workspace's tenant.
// Returns true if access was granted and processing should stop.
func checkTenantOwnerAccess(
	c *gin.Context,
	workspace *entity.Workspace,
	workspaceID, internalUserID string,
	tenantMemberRepo port.TenantMemberRepository,
) bool {
	if workspace == nil || workspace.TenantID == nil || *workspace.TenantID == "" {
		return false
	}

	tenantMember, err := tenantMemberRepo.FindActiveByUserAndTenant(
		c.Request.Context(), internalUserID, *workspace.TenantID,
	)
	if err != nil || !tenantMember.Role.HasPermission(entity.TenantRoleOwner) {
		return false
	}

	c.Set(workspaceIDKey, workspaceID)
	c.Set(workspaceRoleKey, entity.WorkspaceRoleAdmin)
	slog.DebugContext(c.Request.Context(), "tenant owner workspace access granted",
		slog.String("user_id", internalUserID),
		slog.String("workspace_id", workspaceID),
		slog.String("tenant_id", *workspace.TenantID),
		slog.String("operation_id", GetOperationID(c)),
	)
	return true
}

// checkWorkspaceMemberAccess verifies user has direct workspace membership.
// Returns the member if found, nil otherwise.
func checkWorkspaceMemberAccess(
	c *gin.Context,
	workspaceID, internalUserID string,
	workspaceMemberRepo port.WorkspaceMemberRepository,
) *entity.WorkspaceMember {
	member, err := workspaceMemberRepo.FindActiveByUserAndWorkspace(
		c.Request.Context(), internalUserID, workspaceID,
	)
	if err != nil {
		slog.WarnContext(c.Request.Context(), "workspace access denied",
			slog.String("error", err.Error()),
			slog.String("user_id", internalUserID),
			slog.String("workspace_id", workspaceID),
			slog.String("operation_id", GetOperationID(c)),
		)
		return nil
	}
	return member
}

// GetInternalUserID retrieves the internal user ID from the Gin context.
func GetInternalUserID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(internalUserIDKey); exists {
		if userID, ok := val.(string); ok && userID != "" {
			return userID, true
		}
	}
	return "", false
}

// GetWorkspaceID retrieves the current workspace ID from the Gin context.
func GetWorkspaceID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(workspaceIDKey); exists {
		if wsID, ok := val.(string); ok && wsID != "" {
			return wsID, true
		}
	}
	return "", false
}

// GetWorkspaceIDFromHeader retrieves the workspace ID directly from the X-Workspace-ID header.
// Use this when you need to check the header without requiring full WorkspaceContext middleware.
func GetWorkspaceIDFromHeader(c *gin.Context) (string, bool) {
	workspaceID := c.GetHeader(WorkspaceIDHeader)
	return workspaceID, workspaceID != ""
}

// GetWorkspaceRole retrieves the user's role in the current workspace.
func GetWorkspaceRole(c *gin.Context) (entity.WorkspaceRole, bool) {
	if val, exists := c.Get(workspaceRoleKey); exists {
		if role, ok := val.(entity.WorkspaceRole); ok {
			return role, true
		}
	}
	return "", false
}
