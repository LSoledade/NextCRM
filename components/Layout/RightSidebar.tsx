'use client';

import { useCallback } from 'react';
import {
  CalendarDays,
  StickyNote,
  CheckSquare,
  Bookmark,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  className?: string;
  isVisible?: boolean;
  onToggle?: (isVisible: boolean) => void;
}

export default function RightSidebar({ className, isVisible = true, onToggle }: RightSidebarProps) {
  // Handler for toggling right panel visibility
  const handleRightPanelToggle = useCallback(() => {
    if (onToggle) {
      onToggle(!isVisible);
    }
  }, [isVisible, onToggle]);

  // If not visible, don't render anything
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex flex-col items-center justify-between py-3 px-2 bg-background/50 backdrop-blur-sm border-l border-border/50 transition-all duration-300 ease-out no-transform",
        "w-14 min-w-[56px] h-full z-30",
        className
      )}
    >
      {/* Top section with colorful Google-style icons */}
      <div className="flex flex-col gap-3 items-center mt-1">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-white bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <CalendarDays className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Agenda
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-white bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <StickyNote className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Keep (Notas)
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <CheckSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Tarefas
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-white bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Favoritos
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 hover:scale-105"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Notificações
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Bottom section with hide button */}
      <div className="flex flex-col gap-3 items-center mb-1">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRightPanelToggle}
              className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 transition-all duration-200 hover:bg-accent/50"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Esconder painel</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            Esconder painel
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
