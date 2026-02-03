package middleware

import (
	"github.com/gin-gonic/gin"

	"github.com/rendis/pdf-forge/internal/core/port"
)

// Provider centralizes middleware construction with their required dependencies.
// This avoids passing repositories through multiple layers just to initialize middlewares.
type Provider struct {
	userRepo            port.UserRepository
	systemRoleRepo      port.SystemRoleRepository
	workspaceRepo       port.WorkspaceRepository
	workspaceMemberRepo port.WorkspaceMemberRepository
	tenantMemberRepo    port.TenantMemberRepository
}

// NewProvider creates a new middleware provider with all required repositories.
func NewProvider(
	userRepo port.UserRepository,
	systemRoleRepo port.SystemRoleRepository,
	workspaceRepo port.WorkspaceRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
	tenantMemberRepo port.TenantMemberRepository,
) *Provider {
	return &Provider{
		userRepo:            userRepo,
		systemRoleRepo:      systemRoleRepo,
		workspaceRepo:       workspaceRepo,
		workspaceMemberRepo: workspaceMemberRepo,
		tenantMemberRepo:    tenantMemberRepo,
	}
}

// IdentityContext returns a middleware that loads user identity from the database.
func (p *Provider) IdentityContext() gin.HandlerFunc {
	return IdentityContext(p.userRepo)
}

// SystemRoleContext returns a middleware that loads the user's system role if they have one.
func (p *Provider) SystemRoleContext() gin.HandlerFunc {
	return SystemRoleContext(p.systemRoleRepo)
}

// WorkspaceContext returns a middleware that loads workspace context and user's role.
func (p *Provider) WorkspaceContext() gin.HandlerFunc {
	return WorkspaceContext(p.workspaceRepo, p.workspaceMemberRepo, p.tenantMemberRepo)
}

// TenantContext returns a middleware that loads tenant context and user's role.
func (p *Provider) TenantContext() gin.HandlerFunc {
	return TenantContext(p.tenantMemberRepo)
}
