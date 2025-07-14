import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu as MenuIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserMenu } from './UserMenu';
import { SidebarContent } from './SidebarContent';

interface MobileLayoutProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  currentPageTitle: string;
  user: any;
  userInitials: string;
  handleLogout: () => void;
  children: React.ReactNode;
}

export const MobileLayout = ({ 
  mobileOpen, 
  setMobileOpen, 
  currentPageTitle, 
  user, 
  userInitials, 
  handleLogout, 
  children 
}: MobileLayoutProps) => {
  return (
    <div className="flex flex-col h-screen bg-background app-layout-container">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SidebarContent isMobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <h1 className="text-lg font-semibold text-foreground">
          {currentPageTitle}
        </h1>
        
        <div className="flex items-center gap-2 dropdown-fix">
          <ThemeToggle />
          <UserMenu user={user} userInitials={userInitials} onLogout={handleLogout} />
        </div>
      </header>

      {/* Mobile Main Content */}
      <main className="flex-1 overflow-hidden bg-background">
        <div className="h-full p-4">
          <div className="h-full main-content-container rounded-2xl shadow-lg overflow-hidden no-transform">
            <div className="h-full p-6 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};