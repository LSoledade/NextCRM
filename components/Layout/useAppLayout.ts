import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { menuItems } from './menuItems';

const MOBILE_BREAKPOINT = 768;

export const useAppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const currentPageTitle = useMemo(() => {
    const currentMenuItem = menuItems.find(item => item.path === pathname);
    if (currentMenuItem) {
      return currentMenuItem.text;
    }
    
    if (pathname.startsWith('/leads/')) return 'Detalhes do Lead';
    if (pathname.startsWith('/students/')) return 'Detalhes do Aluno';
    if (pathname.startsWith('/tasks/')) return 'Detalhes da Tarefa';
    if (pathname === '/profile') return 'Perfil';
    if (pathname === '/settings') return 'Configurações';
    if (pathname === '/management') return 'Gerenciamento';
    
    return 'CRM Personal Trainer';
  }, [pathname]);

  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebar-expanded');
    if (savedSidebarState !== null) {
      setSidebarExpanded(JSON.parse(savedSidebarState));
    }
    
    const savedRightPanelState = localStorage.getItem('right-panel-visible');
    if (savedRightPanelState !== null) {
      setRightPanelVisible(JSON.parse(savedRightPanelState));
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleRightPanelToggle = useCallback((visible: boolean) => {
    setRightPanelVisible(visible);
    localStorage.setItem('right-panel-visible', JSON.stringify(visible));
  }, []);

  return {
    mobileOpen,
    setMobileOpen,
    isMobile,
    isInitialized,
    sidebarExpanded,
    rightPanelVisible,
    user,
    userInitials,
    currentPageTitle,
    handleSidebarToggle,
    handleMobileToggle,
    handleLogout,
    handleRightPanelToggle,
  };
};