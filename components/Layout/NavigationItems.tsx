import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { menuItems } from './menuItems';

interface NavigationItemsProps {
  collapsed?: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export const NavigationItems = ({ collapsed = false, isMobile = false, onNavigate }: NavigationItemsProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <>
      {menuItems.map((item) => {
        const isActive = pathname === item.path;
        const IconComponent = item.icon;

        const navButton = (
          <Button
            key={item.path}
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              "w-full transition-all duration-300 ease-out rounded-xl overflow-hidden hover:scale-105",
              collapsed ? "h-12 justify-center" : "h-12 justify-start",
              isActive && [
                "bg-accent text-accent-foreground",
                "shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.6),inset_6px_6px_12px_rgba(0,0,0,0.04),inset_-6px_-6px_12px_rgba(255,255,255,0.4)]",
                "hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7),inset_8px_8px_16px_rgba(0,0,0,0.05),inset_-8px_-8px_16px_rgba(255,255,255,0.5)]",
                "dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.05),inset_6px_6px_12px_rgba(0,0,0,0.15),inset_-6px_-6px_12px_rgba(255,255,255,0.02)]",
                "dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.06),inset_8px_8px_16px_rgba(0,0,0,0.2),inset_-8px_-8px_16px_rgba(255,255,255,0.03)]"
              ],
              !isActive && [
                "text-muted-foreground hover:text-foreground",
                "hover:shadow-[2px_2px_6px_rgba(0,0,0,0.08),4px_4px_12px_rgba(0,0,0,0.04)]",
                "dark:hover:shadow-[2px_2px_6px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(255,255,255,0.03),4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.015)]"
              ]
            )}
            onClick={() => handleNavigation(item.path)}
          >
            <IconComponent className={cn(
              "h-5 w-5 transition-all duration-300 ease-out shrink-0",
              !collapsed && "mr-3"
            )} />
            <span className={cn(
              "font-medium truncate transition-all duration-300 ease-out min-w-0",
              collapsed 
                ? "opacity-0 w-0 scale-95 translate-x-[-8px] delay-0" 
                : "opacity-100 w-auto scale-100 translate-x-0 delay-75"
            )}>
              {item.text}
            </span>
          </Button>
        );

        return collapsed ? (
          <Tooltip key={item.path} delayDuration={300}>
            <TooltipTrigger asChild>
              {navButton}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.text}
            </TooltipContent>
          </Tooltip>
        ) : navButton;
      })}
    </>
  );
};