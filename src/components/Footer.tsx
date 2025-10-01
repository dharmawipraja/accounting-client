import { APP_CONFIG } from '@/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              © {currentYear} {APP_CONFIG.NAME}
            </span>
            <span>•</span>
            <span>Version {APP_CONFIG.VERSION}</span>
          </div>

          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            {/* <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for better accounting</span> */}
          </div>
        </div>
      </div>
    </footer>
  )
}
