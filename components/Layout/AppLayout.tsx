'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  Calendar,
  UserCircle,
  LogOut,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import WeatherWidget from '../ui/WeatherWidget';
import Image from 'next/image';

// Constants
const SIDEBAR_EXPANDED_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const MOBILE_BREAKPOINT = 768;

const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { text: 'Leads', icon: Users, path: '/leads' },
  { text: 'WhatsApp', icon: MessageSquare, path: '/whatsapp' },
  { text: 'Tarefas', icon: ClipboardList, path: '/tasks' },
  { text: 'Treinadores', icon: Dumbbell, path: '/trainers' },
  { text: 'Alunos', icon: GraduationCap, path: '/students' },
  { text: 'Sessões', icon: Calendar, path: '/sessions' },
] as const;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize sidebar state from localStorage immediately
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Memoized user initials
  const userInitials = useMemo(() => {
    if (!user?.user_metadata?.name && !user?.email) return '';
    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';
    return displayName
      .split(' ')
      .map((name: string) => name.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.user_metadata?.name, user?.email]);

  // Get current page title based on pathname
  const currentPageTitle = useMemo(() => {
    const currentMenuItem = menuItems.find(item => item.path === pathname);
    if (currentMenuItem) {
      return currentMenuItem.text;
    }
    
    // Handle dynamic routes or other pages
    if (pathname.startsWith('/leads/')) {
      return 'Detalhes do Lead';
    }
    if (pathname.startsWith('/students/')) {
      return 'Detalhes do Aluno';
    }
    if (pathname.startsWith('/tasks/')) {
      return 'Detalhes da Tarefa';
    }
    if (pathname === '/profile') {
      return 'Perfil';
    }
    if (pathname === '/settings') {
      return 'Configurações';
    }
    
    return 'CRM Personal Trainer';
  }, [pathname]);

  // Initialize component
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers
  const handleSidebarToggle = useCallback(() => {
    const newState = !sidebarExpanded;
    setSidebarExpanded(newState);
    localStorage.setItem('sidebar-expanded', JSON.stringify(newState));
  }, [sidebarExpanded]);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [signOut, router]);

  const handleNavigation = useCallback((path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [router, isMobile]);

  // Animated Toggle Icon Component
  const AnimatedToggleIcon = ({ isExpanded }: { isExpanded: boolean }) => (
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

  const NavigationItems = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {menuItems.map((item) => {
        const isActive = pathname === item.path;
        const IconComponent = item.icon;

        const navButton = (
          <Button
            key={item.path}
            variant={isActive ? "default" : "ghost"}
            size={collapsed ? "icon" : "default"}
            className={cn(
              "w-full transition-all duration-300 ease-out rounded-xl",
              collapsed ? "h-12 justify-center" : "h-12 justify-start",
              isActive && [
                "bg-background text-foreground border-0",
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
              "h-5 w-5 transition-all duration-200",
              !collapsed && "mr-3"
            )} />
            {!collapsed && (
              <span className="font-medium truncate">{item.text}</span>
            )}
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

  // Sidebar Content
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col bg-background sidebar-container">
      {/* Logo/Brand */}
      <div className={cn(
        "flex items-center transition-all duration-200 ease-out",
        collapsed ? "justify-center p-3 min-h-[65px]" : "justify-start p-4 min-h-[65px]"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-xl bg-primary/10 p-2 transition-all duration-200 flex items-center justify-center",
            collapsed && "bg-primary/15"
          )}>
            <Image 
              src="/logotipofavale.svg" 
              alt="Favale Logo" 
              width={collapsed ? 32 : 36}
              height={collapsed ? 32 : 36}
              className="transition-all duration-200"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-foreground leading-tight">
                Favale Manager
              </h1>
              <p className="text-xs text-muted-foreground">
                Favale Físico Saúde
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavigationItems collapsed={collapsed} />
      </nav>
    </div>
  );

  // User Menu
  const UserMenu = () => (
    <div className="dropdown-fix">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer transition-all duration-300 ease-out rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 hover:shadow-[0_0_8px_rgba(239,68,68,0.5)] dark:hover:shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Configurações</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Suporte</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-3" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <TooltipProvider>
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
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-semibold text-foreground">
              {currentPageTitle}
            </h1>
            
            <div className="flex items-center gap-2 dropdown-fix">
              <ThemeToggle />
              <UserMenu />
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
      </TooltipProvider>
    );
  }

  // Desktop Layout
  return (
    <TooltipProvider>
      <div className={cn(
        "flex h-screen bg-background overflow-hidden app-layout-container",
        !isInitialized && "opacity-0"
      )}>
        {/* Desktop Sidebar */}
        <aside className={cn(
          "flex flex-col transition-all duration-300 ease-out bg-background no-transform",
          sidebarExpanded ? "w-60" : "w-[72px]"
        )}>
          <SidebarContent collapsed={!sidebarExpanded} />
        </aside>

        {/* Desktop Main Area */}
        <div className="flex flex-col flex-1 min-w-0 no-transform">
          {/* Desktop Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
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
              <UserMenu />
            </div>
          </header>

          {/* Desktop Main Content */}
          <main className="flex-1 overflow-hidden bg-background">
            <div className="h-full p-4">
              <div className="h-full main-content-container rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm no-transform">
                <div className="h-full p-8 overflow-auto">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}