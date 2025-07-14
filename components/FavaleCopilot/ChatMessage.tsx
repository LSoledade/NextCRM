import { Message } from './ChatInterface';
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  MoreHorizontal,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ChatMessage({ message, isFirst, isLast }: ChatMessageProps) {
  const isUser = message.type === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    if (message.content && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(feedback === type ? null : type);
  };

  return (
    <div className={cn(
      "group relative flex items-start gap-3",
      isUser && "justify-end"
    )}>
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[80%] space-y-2",
        isUser ? "order-1 items-end flex flex-col" : "order-2 items-start"
      )}>
        <div className="font-semibold text-sm">
          {isUser ? "Você" : "Favale Copilot"}
        </div>
        <div className={cn(
          "relative rounded-lg px-3 py-2",
          isUser 
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}>
          {message.isThinking ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Pensando...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {!isUser && !message.isThinking && message.content && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7", feedback === 'up' && "bg-green-500/20 text-green-600")} onClick={() => handleFeedback('up')}>
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7", feedback === 'down' && "bg-red-500/20 text-red-600")} onClick={() => handleFeedback('down')}>
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem className="text-sm">Regenerar</DropdownMenuItem>
                <DropdownMenuItem className="text-sm">Copiar</DropdownMenuItem>
                <DropdownMenuItem className="text-sm text-red-600">Reportar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0 order-2">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback className="bg-primary/80 text-primary-foreground">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}