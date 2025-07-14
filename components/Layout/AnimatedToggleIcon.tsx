import { cn } from '@/lib/utils';
import { Menu as MenuIcon, ChevronRight } from 'lucide-react';

export const AnimatedToggleIcon = ({ isExpanded }: { isExpanded: boolean }) => {
  return (
    <div className="relative h-5 w-5 transition-all duration-300 ease-out">
      {/* Menu Icon - visible when sidebar is expanded */}
      <div className={cn(
        "absolute inset-0 transition-all duration-300 ease-out",
        isExpanded ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-180 scale-75"
      )}>
        <MenuIcon className="h-5 w-5" />
      </div>
      
      {/* Arrow Right Icon - visible when sidebar is collapsed */}
      <div className={cn(
        "absolute inset-0 transition-all duration-300 ease-out",
        !isExpanded ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-180 scale-75"
      )}>
        <ChevronRight className="h-5 w-5" />
      </div>
    </div>
  );
};