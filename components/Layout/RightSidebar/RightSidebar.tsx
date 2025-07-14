'use client';

import { cn } from "@/lib/utils";
import { RightSidebarProps, RightSidebarContext } from './types';
import DefaultContextContent from './DefaultContextContent';
import LeadContextContent from './LeadContextContent';
import TaskContextContent from './TaskContextContent';
import AppointmentContextContent from './AppointmentContextContent';

/**
 * Renderiza o conteúdo apropriado baseado no contexto atual
 */
const renderContextContent = (
  context: RightSidebarContext, 
  contextData: any, 
  onClose?: () => void
) => {
  switch (context) {
    case 'lead':
      return <LeadContextContent lead={contextData} onClose={onClose} />;
    case 'task':
      return <TaskContextContent task={contextData} onClose={onClose} />;
    case 'appointment':
      return <AppointmentContextContent appointment={contextData} onClose={onClose} />;
    default:
      return <DefaultContextContent onClose={onClose} />;
  }
};

/**
 * Componente principal do painel lateral direito
 * Suporta diferentes contextos: default, lead, task, appointment
 */
export default function RightSidebar({ 
  className, 
  isVisible = true, 
  onToggle, 
  context = 'default', 
  contextData, 
  onClose 
}: RightSidebarProps) {
  // Se não estiver visível, não renderiza nada
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-background transition-all duration-300 ease-out no-transform",
        "w-80 min-w-[320px] h-full z-20 pt-16",
        className
      )}
    >
      {/* Container principal do painel */}
      <div className="h-full p-4">
        <div className="h-full main-content-container rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm no-transform relative z-10">
          <div className="h-full p-6 overflow-auto">
            {renderContextContent(context, contextData, onClose)}
          </div>
        </div>
      </div>
    </aside>
  );
}