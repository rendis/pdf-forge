import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Outlet />
    </div>
  )
}
