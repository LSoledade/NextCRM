'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppLayout } from './useAppLayout';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import { RightSidebarProvider } from '@/contexts/RightSidebarContext';

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
    rightSidebarContext,
    rightSidebarData,
    openRightSidebar,
    closeRightSidebar,
  } = useAppLayout();

  const rightSidebarContextValue = {
    openRightSidebar,
    closeRightSidebar,
    rightSidebarContext,
    rightSidebarData,
    rightPanelVisible,
  };

  if (isMobile) {
    return (
      <RightSidebarProvider value={rightSidebarContextValue}>
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
      </RightSidebarProvider>
    );
  }

  return (
    <RightSidebarProvider value={rightSidebarContextValue}>
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
          rightSidebarContext={rightSidebarContext}
          rightSidebarData={rightSidebarData}
          onRightSidebarClose={closeRightSidebar}
        >
          {children}
        </DesktopLayout>
      </TooltipProvider>
    </RightSidebarProvider>
  );
}