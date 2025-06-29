'use client';

import { useEffect, useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Collapse } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";

const drawerWidth = 280;
const drawerCollapsedWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { text: 'Leads', icon: Users, path: '/leads' },
  { text: 'Tarefas', icon: ClipboardList, path: '/tasks' },
  { text: 'Treinadores', icon: Dumbbell, path: '/trainers' },
  { text: 'Alunos', icon: GraduationCap, path: '/students' },
  { text: 'Sessões', icon: Calendar, path: '/sessions' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const currentDrawerWidthClass = sidebarExpanded ? `w-[${drawerWidth}px]` : `w-[${drawerCollapsedWidth}px]`;

  const drawerContent = (
    <div className="flex h-full flex-col bg-background transition-all duration-150 ease-in-out">
      {/* Logo da Sidebar */}
      <div
        className={cn(
          "flex items-center min-h-[64px] transition-all duration-150 ease-in-out",
          sidebarExpanded ? "justify-start p-4" : "justify-center p-2"
        )}
      >
        <div className="flex items-center gap-2">
          <Dumbbell
            className={cn(
              "text-primary transition-all duration-150",
              sidebarExpanded ? "h-7 w-7" : "h-6 w-6"
            )}
          />
          {sidebarExpanded && (
            <h1 className="text-lg font-semibold text-primary whitespace-nowrap">
              FavaleTrainer
            </h1>
          )}
        </div>
      </div>

      {/* Lista de Navegação */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <TooltipProvider>
          {menuItems.map((item) => {
            const isSelected = pathname === item.path;
            const IconComponent = item.icon;

            const navItem = (
              <Button
                variant={isSelected ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-sm font-medium h-11",
                  !sidebarExpanded && "justify-center px-0",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isSelected && "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleNavigation(item.path)}
              >
                <IconComponent className={cn("h-5 w-5", sidebarExpanded && "mr-3")} />
                {sidebarExpanded && <span>{item.text}</span>}
              </Button>
            );

            return (
              <div key={item.text}>
                {!sidebarExpanded ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {navItem}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.text}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  navItem
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>
    </div>
  );

  if (isMobile) {
    // Layout mobile com Sheet
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <MenuIcon className="w-6 h-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn("w-[280px] p-0")}>
              {drawerContent}
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">CRM Personal Trainer</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                  <AvatarFallback>
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.displayName || 'Minha Conta'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}> {/* Assuming a profile page */}
                <UserCircle className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 overflow-auto bg-muted/40">
          <div className="p-4 bg-background rounded-lg shadow min-h-[calc(100vh-8rem)]">
             {children}
          </div>
        </main>
      </div>
    );
  }

  // Layout desktop com CSS Grid e efeito visual moderno + sidebar expansível
  return (
    <div
      className={cn(
        "grid h-screen overflow-hidden bg-background transition-all duration-150 ease-in-out",
        sidebarExpanded ? `grid-cols-[${drawerWidth}px_1fr]` : `grid-cols-[${drawerCollapsedWidth}px_1fr]`,
        "grid-rows-[auto_1fr]",
        "[grid-template-areas:_'sidebar_header'_'sidebar_content']"
      )}
    >
      {/* Header - estilo Gmail */}
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between min-h-[64px] px-4 py-2 bg-background",
          "[grid-area:header]"
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSidebarToggle}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <MenuIcon className="w-6 h-6" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <h1 className="text-lg font-medium text-foreground">
            CRM Personal Trainer
          </h1>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback>
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{user?.displayName || 'Minha Conta'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserCircle className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Sidebar Expansível */}
      <aside
        className={cn(
          "flex flex-col overflow-hidden bg-background transition-all duration-150 ease-in-out",
          currentDrawerWidthClass,
          "[grid-area:sidebar]"
        )}
      >
        {drawerContent}
      </aside>

      {/* Conteúdo Principal com efeito visual */}
      <main
        className={cn(
          "p-2 pb-3 flex flex-col h-full overflow-hidden transition-all duration-150 ease-in-out",
          "[grid-area:content]"
        )}
      >
        <div
          className="flex flex-col flex-1 h-full p-6 overflow-hidden bg-card rounded-lg shadow-sm"
        >
          <div className="flex-1 h-full overflow-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}