import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore, type Theme } from '@/stores/theme-store'
import { cn } from '@/lib/utils'

const themeOrder: Theme[] = ['system', 'light', 'dark']

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const toggleTheme = () => {
    const currentTheme = theme ?? 'system'
    const currentIndex = themeOrder.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    setTheme(themeOrder[nextIndex] ?? 'system')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleTheme}
    >
      <div className="relative h-4 w-4">
        <Monitor
          className={cn(
            'absolute inset-0 h-4 w-4 transition-all duration-300',
            (theme ?? 'system') === 'system'
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 rotate-90 opacity-0'
          )}
        />
        <Sun
          className={cn(
            'absolute inset-0 h-4 w-4 transition-all duration-300',
            (theme ?? 'system') === 'light'
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0'
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 h-4 w-4 transition-all duration-300',
            (theme ?? 'system') === 'dark'
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 rotate-90 opacity-0'
          )}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
