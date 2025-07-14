'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppLayout } from './useAppLayout';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const {
    isMobile,
    mobileOpen,
    setMobileOpen,
    currentPageTitle,
    user,
    userInitials,
    handleLogout,
    sidebarExpanded,
    handleSidebarToggle,
    rightPanelVisible,
    handleRightPanelToggle,
    isInitialized,
  } = useAppLayout();

  if (isMobile) {
    return (
      <TooltipProvider>
        <MobileLayout
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          currentPageTitle={currentPageTitle}
          user={user}
          userInitials={userInitials}
          handleLogout={handleLogout}
        >
          {children}
        </MobileLayout>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <DesktopLayout
        sidebarExpanded={sidebarExpanded}
        handleSidebarToggle={handleSidebarToggle}
        currentPageTitle={currentPageTitle}
        user={user}
        userInitials={userInitials}
        handleLogout={handleLogout}
        rightPanelVisible={rightPanelVisible}
        handleRightPanelToggle={handleRightPanelToggle}
        isInitialized={isInitialized}
      >
        {children}
      </DesktopLayout>
    </TooltipProvider>
  );
}