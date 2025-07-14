export type RightSidebarContext = 'default' | 'lead' | 'task' | 'appointment';

export interface RightSidebarProps {
  className?: string;
  isVisible?: boolean;
  onToggle?: (isVisible: boolean) => void;
  context?: RightSidebarContext;
  contextData?: any;
  onClose?: () => void;
}

export interface ContextContentProps {
  onClose?: () => void;
}

export interface LeadContextProps extends ContextContentProps {
  lead: any;
}

export interface TaskContextProps extends ContextContentProps {
  task: any;
}

export interface AppointmentContextProps extends ContextContentProps {
  appointment: any;
}