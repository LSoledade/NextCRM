'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ThemeToggle({ 
  size = 'icon',
  className 
}: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={cn(
          "relative transition-all duration-200",
          size === 'icon' && "h-9 w-9 rounded-full",
          className
        )}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button 
      variant="ghost" 
      size={size}
      onClick={toggleTheme}
      className={cn(
        "relative transition-all duration-200 hover:bg-accent/50",
        size === 'icon' && "h-9 w-9 rounded-full",
        className
      )}
    >
      <div className="relative h-4 w-4">
        {/* Sol - visível no modo escuro */}
        <Sun 
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
            isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
          )} 
        />
        {/* Lua - visível no modo claro */}
        <Moon 
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
            !isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )} 
        />
      </div>
      <span className="sr-only">
        Alternar para {isDark ? 'modo claro' : 'modo escuro'}
      </span>
    </Button>
  );
}