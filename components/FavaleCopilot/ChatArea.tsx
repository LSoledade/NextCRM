import { Message } from './ChatInterface';
import { ChatMessage } from './ChatMessage';
import { Sparkles, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatAreaProps {
  messages: Message[];
}

const EmptyState = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Olá!
        </h1>
        <p className="text-muted-foreground text-xl">
          Como posso te ajudar hoje?
        </p>
      </div>
    </div>
  );
};

export function ChatArea({ messages }: ChatAreaProps) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {messages.map((message, index) => (
          <div key={message.id} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <ChatMessage 
              message={message} 
              isFirst={index === 0}
              isLast={index === messages.length - 1}
            />
          </div>
        ))}
        {/* Scroll anchor */}
        <div className="h-4" />
      </div>
    </div>
  );
}