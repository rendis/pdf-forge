import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, FolderOpen, Variable, Users, Shield, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'
import { logout } from '@/lib/oidc'
import { getInitials } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useWorkspaceTransitionStore } from '@/stores/workspace-transition-store'

interface NavItem {
  label: string
  icon: typeof FileText
  href: string
}

interface SidebarContentProps {
  /** Whether sidebar is expanded (shows text labels) */
  isExpanded: boolean
  /** Callback when navigation occurs (for closing mobile sidebar) */
  onNavigate?: () => void
  /** Whether to show animations (disable for mobile sheet) */
  showAnimations?: boolean
}

const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

const footerItemVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { opacity: 1, scale: 1 },
}

export function SidebarContent({
  isExpanded,
  onNavigate,
  showAnimations = true,
}: SidebarContentProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { userProfile } = useAuthStore()
  const { currentWorkspace, clearContext, isSystemContext } = useAppContextStore()
  const { phase: transitionPhase } = useWorkspaceTransitionStore()

  // Hide workspace name while transition animation is active
  const showWorkspaceName = transitionPhase === 'idle' || transitionPhase === 'complete'

  const workspaceId = currentWorkspace?.id || ''

  const allNavItems: NavItem[] = [
    {
      label: t('nav.templates'),
      icon: FileText,
      href: `/workspace/${workspaceId}/templates`,
    },
    {
      label: t('nav.documents'),
      icon: FolderOpen,
      href: `/workspace/${workspaceId}/documents`,
    },
    {
      label: t('nav.variables'),
      icon: Variable,
      href: `/workspace/${workspaceId}/variables`,
    },
    {
      label: t('nav.members', 'Members'),
      icon: Users,
      href: `/workspace/${workspaceId}/members`,
    },
    // Administration - only visible in SYSTEM workspace
    ...(isSystemContext()
      ? [
          {
            label: t('nav.administration', 'Administration'),
            icon: Shield,
            href: `/workspace/${workspaceId}/administration`,
          },
        ]
      : []),
  ]

  const visibleNavItems = allNavItems

  const displayName = userProfile
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() ||
      userProfile.username ||
      'User'
    : 'User'

  const email = userProfile?.email || 'user@example.com'
  const initials = getInitials(displayName)

  const handleLogout = async () => {
    onNavigate?.()
    clearContext()
    await logout()
    navigate({ to: '/login' })
  }

  const handleNavClick = () => {
    onNavigate?.()
  }

  const isActive = (href: string) => {
    return location.pathname.startsWith(href)
  }

  // Animation delay - 0 for mobile (no delay), standard for desktop
  const animationDelay = showAnimations ? 0.8 : 0

  return (
    <>
      <ScrollArea className={cn('flex-1 py-6', isExpanded ? 'px-4' : 'px-2')}>
        {/* Current Workspace */}
        {currentWorkspace && (
          <div className="relative mb-8 px-1">
            {/* Avatar - visible solo cuando colapsado */}
            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded || !showWorkspaceName ? 0 : 1,
                scale: isExpanded ? 0.8 : 1,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center"
              style={{ pointerEvents: isExpanded || !showWorkspaceName ? 'none' : 'auto' }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-default">
                    <AvatarFallback className="bg-primary/10 text-sm font-bold">
                      {getInitials(currentWorkspace.name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div className="text-xs text-muted-foreground">
                    {t('workspace.current')}
                  </div>
                  <div className="font-medium">{currentWorkspace.name}</div>
                </TooltipContent>
              </Tooltip>
            </motion.div>

            {/* Texto - visible solo cuando expandido */}
            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                x: isExpanded ? 0 : -10,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex h-10 items-center"
              style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
            >
              <div style={{ opacity: showWorkspaceName ? 1 : 0 }}>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {t('workspace.current')}
                </label>
                <div className="truncate font-display text-lg font-medium">
                  {currentWorkspace.name}
                </div>
              </div>
            </motion.div>

          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleNavItems.map((item, index) => {
              const active = isActive(item.href)
              return (
                <motion.div
                  key={item.href}
                >
                  <motion.div
                    variants={showAnimations ? navItemVariants : undefined}
                    initial={showAnimations ? 'hidden' : false}
                    animate={showAnimations ? 'visible' : false}
                    transition={{ duration: 0.3, delay: animationDelay + index * 0.08 }}
                  >
                    <Link
                      to={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        'group flex w-full items-center gap-4 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon
                        size={20}
                        strokeWidth={1.5}
                        className={cn(
                          'shrink-0',
                          active
                            ? 'text-sidebar-accent-foreground'
                            : 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
                        )}
                      />
                      <motion.span
                        initial={false}
                        animate={{
                          opacity: isExpanded ? 1 : 0,
                          width: isExpanded ? 'auto' : 0,
                        }}
                        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden whitespace-nowrap font-mono"
                      >
                        {item.label}
                      </motion.span>
                    </Link>
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('border-t py-4', isExpanded ? 'px-4' : 'px-2')}>
        {/* User profile */}
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 shrink-0 cursor-default">
                <AvatarFallback className="text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right" sideOffset={8}>
                <div className="font-medium">{email}</div>
                <div className="text-xs text-muted-foreground">
                  {currentWorkspace?.role || 'Member'}
                </div>
              </TooltipContent>
            )}
          </Tooltip>

          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 'auto' : 0,
            }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="min-w-0 overflow-hidden"
          >
            <div className="truncate text-xs font-semibold whitespace-nowrap">
              {email}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground whitespace-nowrap">
              {currentWorkspace?.role || 'Member'}
            </div>
          </motion.div>
        </div>

        {/* Logout button */}
        <motion.div
          variants={showAnimations ? footerItemVariants : undefined}
          initial={showAnimations ? 'hidden' : false}
          animate={showAnimations ? 'visible' : false}
          transition={{ duration: 0.3, delay: animationDelay }}
        >
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-4 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut
              size={20}
              strokeWidth={1.5}
              className="shrink-0 transition-transform group-hover:-translate-x-1"
            />
            <motion.span
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? 'auto' : 0,
              }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden whitespace-nowrap font-mono"
            >
              {t('nav.logout')}
            </motion.span>
          </button>
        </motion.div>
      </div>

    </>
  )
}
