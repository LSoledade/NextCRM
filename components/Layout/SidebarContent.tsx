import { cn } from '@/lib/utils';
import Image from 'next/image';
import { NavigationItems } from './NavigationItems';

interface SidebarContentProps {
  collapsed?: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export const SidebarContent = ({ collapsed = false, isMobile = false, onNavigate }: SidebarContentProps) => (
  <div className="flex h-full flex-col bg-background sidebar-container">
    {/* Logo/Brand - Fixed */}
    <div className="fixed top-0 z-50 bg-background flex items-center justify-start p-4 min-h-[65px] w-60">
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-xl bg-primary/10 p-2 flex items-center justify-center shrink-0">
          <Image 
            src="/logotipofavale.svg" 
            alt="Favale Logo" 
            width={36}
            height={36}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight whitespace-nowrap">
            Favale Manager
          </h1>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Favale Físico Saúde
          </p>
        </div>
      </div>
    </div>

    {/* Navigation - With Animation */}
    <nav className={cn(
      "flex-1 p-3 space-y-1 pt-[81px] transition-all duration-300 ease-out overflow-hidden",
      collapsed ? "opacity-50 scale-95" : "opacity-100 scale-100"
    )}>
      <NavigationItems collapsed={collapsed} isMobile={isMobile} onNavigate={onNavigate} />
    </nav>
  </div>
);