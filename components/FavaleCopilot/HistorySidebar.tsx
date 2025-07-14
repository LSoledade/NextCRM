import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  MessageSquare, 
  Clock, 
  Trash2, 
  MoreHorizontal,
  Plus,
  Calendar,
  Star,
  Archive
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChatHistory {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messageCount: number;
  isStarred?: boolean;
  isArchived?: boolean;
}

const mockHistory: ChatHistory[] = [
  {
    id: '1',
    title: 'Análise de dados de vendas',
    preview: 'Como posso analisar os dados de vendas do último trimestre?',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    messageCount: 12,
    isStarred: true
  },
  {
    id: '2',
    title: 'Criação de API REST',
    preview: 'Preciso criar uma API REST em Node.js com autenticação...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    messageCount: 8
  },
  {
    id: '3',
    title: 'Design de interface',
    preview: 'Quais são as melhores práticas para design responsivo?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    messageCount: 15,
    isStarred: true
  },
  {
    id: '4',
    title: 'Otimização de banco de dados',
    preview: 'Como otimizar consultas SQL complexas?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    messageCount: 6
  },
  {
    id: '5',
    title: 'Configuração Docker',
    preview: 'Ajuda com configuração de containers Docker...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    messageCount: 4,
    isArchived: true
  }
];

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Agora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function HistorySidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const filteredHistory = mockHistory.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = showArchived || !chat.isArchived;
    return matchesSearch && matchesArchive;
  });

  const groupedHistory = filteredHistory.reduce((groups, chat) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let group = 'Mais antigo';
    if (chat.timestamp.toDateString() === today.toDateString()) {
      group = 'Hoje';
    } else if (chat.timestamp.toDateString() === yesterday.toDateString()) {
      group = 'Ontem';
    } else if (chat.timestamp > weekAgo) {
      group = 'Esta semana';
    }

    if (!groups[group]) groups[group] = [];
    groups[group].push(chat);
    return groups;
  }, {} as Record<string, ChatHistory[]>);

  return (
    <div className="h-full flex flex-col bg-card/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Histórico
          </h2>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="h-7 text-xs"
          >
            <Archive className="h-3 w-3 mr-1" />
            Arquivados
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedHistory).map(([group, chats]) => (
            <div key={group} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group}
                </span>
              </div>
              
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
                      "hover:bg-accent/50 hover:shadow-sm",
                      selectedChat === chat.id && "bg-accent border border-primary/20",
                      chat.isArchived && "opacity-60"
                    )}
                    onClick={() => setSelectedChat(chat.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {chat.isStarred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                          )}
                          <h3 className="font-medium text-sm truncate">
                            {chat.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {chat.preview}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(chat.timestamp)}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {chat.messageCount}
                          </Badge>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="text-xs">
                            <Star className="h-3 w-3 mr-2" />
                            {chat.isStarred ? 'Remover favorito' : 'Favoritar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">
                            <Archive className="h-3 w-3 mr-2" />
                            {chat.isArchived ? 'Desarquivar' : 'Arquivar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs text-red-600">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {filteredHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Tente outros termos de busca' : 'Inicie uma nova conversa'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}