import { useSidebarStore } from '@/stores/sidebar-store'
import { SidebarContent } from './SidebarContent'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function MobileSidebar() {
  const { isMobileOpen, closeMobile } = useSidebarStore()

  return (
    <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent
        side="left"
        className="flex w-[280px] flex-col p-0 pt-16"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation sidebar</SheetDescription>
        </SheetHeader>
        <SidebarContent
          isExpanded={true}
          onNavigate={closeMobile}
          showAnimations={false}
        />
      </SheetContent>
    </Sheet>
  )
}
