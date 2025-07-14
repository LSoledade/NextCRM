'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { RightSidebarContext as RightSidebarContextType } from '@/components/Layout/RightSidebar';

interface RightSidebarContextValue {
  openRightSidebar: (context: RightSidebarContextType, data?: any) => void;
  closeRightSidebar: () => void;
  rightSidebarContext: RightSidebarContextType;
  rightSidebarData: any;
  rightPanelVisible: boolean;
}

const RightSidebarContext = createContext<RightSidebarContextValue | undefined>(undefined);

interface RightSidebarProviderProps {
  children: ReactNode;
  value: RightSidebarContextValue;
}

export const RightSidebarProvider: React.FC<RightSidebarProviderProps> = ({ children, value }) => {
  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  );
};

export const useRightSidebar = (): RightSidebarContextValue => {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
};