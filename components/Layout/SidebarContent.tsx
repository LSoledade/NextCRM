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
    {/* Logo/Brand */}
    <div className={cn(
      "flex items-center transition-all duration-300 ease-out overflow-hidden",
      collapsed ? "justify-center p-3 min-h-[65px]" : "justify-start p-4 min-h-[65px]"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "rounded-xl bg-primary/10 p-2 transition-all duration-300 ease-out flex items-center justify-center shrink-0",
          collapsed && "bg-primary/15"
        )}>
          <Image 
            src="/logotipofavale.svg" 
            alt="Favale Logo" 
            width={collapsed ? 32 : 36}
            height={collapsed ? 32 : 36}
            className="transition-all duration-300 ease-out"
          />
        </div>
        <div className={cn(
          "flex flex-col min-w-0 transition-all duration-300 ease-out",
          collapsed ? "opacity-0 w-0 scale-95 translate-x-[-10px]" : "opacity-100 w-auto scale-100 translate-x-0"
        )}>
          <h1 className={cn(
            "text-lg font-bold text-foreground leading-tight whitespace-nowrap transition-all duration-300 ease-out",
            collapsed ? "delay-0" : "delay-75"
          )}>
            Favale Manager
          </h1>
          <p className={cn(
            "text-xs text-muted-foreground whitespace-nowrap transition-all duration-300 ease-out",
            collapsed ? "delay-0" : "delay-100"
          )}>
            Favale Físico Saúde
          </p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-3 space-y-1">
      <NavigationItems collapsed={collapsed} isMobile={isMobile} onNavigate={onNavigate} />
    </nav>
  </div>
);