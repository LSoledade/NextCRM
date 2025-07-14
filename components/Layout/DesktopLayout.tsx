import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnimatedToggleIcon } from './AnimatedToggleIcon';
import { SidebarContent } from './SidebarContent';
import { UserMenu } from './UserMenu';
import WeatherWidget from '../ui/WeatherWidget';
import RightSidebar from './RightSidebar';
import { Menu as MenuIcon, ChevronLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DesktopLayoutProps {
  sidebarExpanded: boolean;
  handleSidebarToggle: () => void;
  currentPageTitle: string;
  user: any;
  userInitials: string;
  handleLogout: () => void;
  rightPanelVisible: boolean;
  handleRightPanelToggle: (visible: boolean) => void;
  isInitialized: boolean;
  children: React.ReactNode;
}

export const DesktopLayout = ({ 
  sidebarExpanded, 
  handleSidebarToggle, 
  currentPageTitle, 
  user, 
  userInitials, 
  handleLogout, 
  rightPanelVisible, 
  handleRightPanelToggle, 
  isInitialized,
  children 
}: DesktopLayoutProps) => {
  return (
    <TooltipProvider>
      <div className={cn(
        "flex h-screen bg-background overflow-hidden app-layout-container",
        !isInitialized && "opacity-0"
      )}>

        {/* Desktop Sidebar */}
        <aside className={cn(
          "flex flex-col transition-all duration-300 ease-out bg-background no-transform relative z-40",
          sidebarExpanded ? "w-60" : "w-[72px]"
        )}>
          <SidebarContent collapsed={!sidebarExpanded} />
        </aside>

        {/* Desktop Main Area */}
        <div className="flex flex-1 min-w-0 no-transform">
          <div className="flex flex-col flex-1">
            {/* Desktop Header - Fixed */}
            <header className="fixed top-0 right-0 left-60 z-30 flex items-center justify-between h-16 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSidebarToggle}
                  className="text-muted-foreground hover:text-foreground rounded-full h-10 w-10 transition-all duration-200 hover:bg-accent/50"
                >
                  <AnimatedToggleIcon isExpanded={sidebarExpanded} />
                  <span className="sr-only">
                    {sidebarExpanded ? 'Recolher menu' : 'Expandir menu'}
                  </span>
                </Button>
                <h1 className="text-xl font-semibold text-foreground">
                  {currentPageTitle}
                </h1>
              </div>
              
              <div className="flex items-center gap-2 dropdown-fix">
                <WeatherWidget />
                <ThemeToggle />
                {/* Button to toggle right panel */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRightPanelToggle(!rightPanelVisible)}
                  className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 transition-all duration-200 hover:bg-accent/50"
                >
                  {/* Prevent hydration mismatch by showing default icon until initialized */}
                  {!isInitialized ? (
                    <MenuIcon className="h-4 w-4" />
                  ) : rightPanelVisible ? (
                    <MenuIcon className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {rightPanelVisible ? 'Fechar painel lateral' : 'Mostrar painel lateral'}
                  </span>
                </Button>
                <UserMenu user={user} userInitials={userInitials} onLogout={handleLogout} />
              </div>
            </header>

            {/* Desktop Main Content */}
            <main className="flex-1 overflow-hidden bg-background pt-16">
              <div className="h-full p-4">
                <div className="h-full main-content-container rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm no-transform relative z-10">
                  <div className="h-full p-8 overflow-auto">
                    {children}
                  </div>
                </div>
              </div>
            </main>
          </div>
          
          {/* Right Sidebar (Google-like panel) */}
          {rightPanelVisible && (
            <RightSidebar 
              isVisible={rightPanelVisible}
              onToggle={handleRightPanelToggle}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};