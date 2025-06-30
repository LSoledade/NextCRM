'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'icon' | 'text';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ThemeToggle({ 
  variant = 'icon', 
  size = 'icon',
  className 
}: ThemeToggleProps) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size={size} 
        className={cn(
          "relative transition-all duration-200",
          size === 'icon' && "h-9 w-9",
          className
        )}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const currentIcon = resolvedTheme === 'dark' ? Moon : Sun;
  const CurrentIcon = currentIcon;

  if (variant === 'text') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size} className={className}>
            <CurrentIcon className="h-4 w-4 mr-2" />
            {resolvedTheme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
            <span className="sr-only">Abrir menu de tema</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Modo Claro</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Modo Escuro</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>Sistema</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={size}
          className={cn(
            "relative transition-all duration-200 hover:bg-accent/50",
            size === 'icon' && "h-9 w-9 rounded-full",
            className
          )}
        >
          <CurrentIcon className="h-4 w-4 transition-all duration-200" />
          <span className="sr-only">Abrir menu de tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={cn(
            "cursor-pointer",
            theme === 'light' && "bg-accent text-accent-foreground"
          )}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Modo Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={cn(
            "cursor-pointer",
            theme === 'dark' && "bg-accent text-accent-foreground"
          )}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Modo Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={cn(
            "cursor-pointer",
            theme === 'system' && "bg-accent text-accent-foreground"
          )}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Automático</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}