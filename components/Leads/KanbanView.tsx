'use client'

import { useEffect, useState, useMemo } from 'react'
import { Database } from '@/types/database'
import { useUpdateLeadMutation } from '@/hooks/useLeadMutations'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Phone, Mail, Building2, Calendar, Tag, User, TrendingUp, UserPlus, MessageCircle, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']

interface KanbanViewProps {
  leads: Lead[];
  onUpdateLead: (leadId: string, newStatus: Lead['status']) => void;
  stats: {
    totalCount: number;
    statusCounts: Record<string, number>;
  };
}

const statusTitles: { [key in Lead['status']]: string } = {
  New: 'Novos Leads',
  Contacted: 'Em Negociação',
  Converted: 'Convertidos',
  Lost: 'Perdidos',
}

const columnOrder: Lead['status'][] = ['New', 'Contacted', 'Converted', 'Lost']

function LeadCard({ lead, onDrop }: { lead: Lead; onDrop: (leadId: string, newStatus: Lead['status']) => void }) {

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'New': return 'border-l-blue-500'
      case 'Contacted': return 'border-l-yellow-500'
      case 'Converted': return 'border-l-green-500'
      case 'Lost': return 'border-l-red-500'
      default: return 'border-l-gray-500'
    }
  }

  const getCompanyColor = (company: Lead['company']) => {
    switch (company) {
      case 'Favale': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Pink': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'Favale&Pink': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className={cn(
        "mb-2 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4",
        getStatusColor(lead.status)
      )}>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-sm font-medium">
                  {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold truncate">
                  {lead.name}
                </CardTitle>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 mr-1.5" />
                  {formatDate(lead.created_at)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2.5">
          {lead.company && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="secondary" className={cn("text-xs font-normal", getCompanyColor(lead.company))}>
                {lead.company}
              </Badge>
            </div>
          )}
          
          <div className="space-y-1.5">
            {lead.email && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 mr-2" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 mr-2" />
                <span>{lead.phone}</span>
              </div>
            )}
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div className="flex items-start space-x-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {lead.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                    {tag}
                  </Badge>
                ))}
                {lead.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    +{lead.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {lead.source && (
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 mr-2" />
              <span className="truncate">{lead.source}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KanbanColumn({ status, leads, visibleCount, onLoadMore, onDrop }: { 
  status: Lead['status']; 
  leads: Lead[]; 
  visibleCount: number; 
  onLoadMore: () => void;
  onDrop: (leadId: string, newStatus: Lead['status']) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const visibleLeads = leads.slice(0, visibleCount);

  const getStatusIcon = (status: Lead['status'], size = "h-4 w-4") => {
    switch (status) {
      case 'New': return <UserPlus className={size} />
      case 'Contacted': return <MessageCircle className={size} />
      case 'Converted': return <CheckCircle className={size} />
      case 'Lost': return <XCircle className={size} />
      default: return <Tag className={size} />
    }
  }

  const getStatusColumnClass = (status: Lead['status']) => {
    switch (status) {
      case 'New': return 'border-t-blue-500'
      case 'Contacted': return 'border-t-yellow-500'
      case 'Converted': return 'border-t-green-500'
      case 'Lost': return 'border-t-red-500'
      default: return 'border-t-gray-500'
    }
  }

  return (
    <div 
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const leadId = e.dataTransfer.getData('text/plain')
        if (leadId) {
          onDrop(leadId, status)
        }
      }}
      className={cn(
        "w-80 flex-shrink-0 rounded-lg border bg-muted/50 p-3 transition-colors duration-200 border-t-4",
        getStatusColumnClass(status),
        isDragOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{statusTitles[status]}</h3>
        </div>
        <Badge variant="secondary" className="font-semibold">{leads.length}</Badge>
      </div>
      
        <div className={cn(
          "min-h-[200px] max-h-[500px] overflow-y-auto -mx-3 px-3",
          isDragOver && "bg-primary/10 rounded-lg"
        )}>
          {visibleLeads.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center h-48 text-muted-foreground",
              isDragOver && "text-primary"
            )}>
              <div className="w-16 h-16 flex items-center justify-center mb-4">
                {getStatusIcon(status, "h-8 w-8")}
              </div>
              <p className="text-sm text-center font-semibold mb-1">Nenhum lead aqui</p>
              <p className="text-xs text-center">
                {isDragOver ? "Solte para adicionar" : "Arraste um lead para esta coluna"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onDrop={onDrop} />
              ))}
            </div>
          )}
        </div>
      
      {leads.length > visibleCount && (
        <Button 
          onClick={onLoadMore} 
          variant="outline"
          className="w-full mt-3"
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Carregar Mais ({leads.length - visibleCount} restantes)
        </Button>
      )}
    </div>
  );
}

const LEADS_PER_PAGE = 10;

export default function KanbanView({ leads, onUpdateLead, stats }: KanbanViewProps) {
  const { toast } = useToast();
  const [visibleLeadsCount, setVisibleLeadsCount] = useState<Record<Lead['status'], number>>({ New: LEADS_PER_PAGE, Contacted: LEADS_PER_PAGE, Converted: LEADS_PER_PAGE, Lost: LEADS_PER_PAGE });

  const handleLoadMore = (status: Lead['status']) => {
    setVisibleLeadsCount(prev => ({
      ...prev,
      [status]: (prev[status] || LEADS_PER_PAGE) + LEADS_PER_PAGE
    }));
  };

  const leadsByStatus = useMemo(() => {
    const grouped: { [key in Lead['status']]?: Lead[] } = {}
    for (const status of columnOrder) {
      grouped[status] = []
    }
    leads.forEach(lead => {
      const status = lead.status || 'New'
      if (grouped[status]) {
        grouped[status]?.push(lead)
      }
    })
    return grouped
  }, [leads])

  const handleLeadDrop = (leadId: string, newStatus: Lead['status']) => {
    onUpdateLead(leadId, newStatus);
  };

  const totalLeads = stats.totalCount;
  const convertedLeads = stats.statusCounts['Converted'] || 0;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';
  const activeLeads = (stats.statusCounts['New'] || 0) + (stats.statusCounts['Contacted'] || 0);

  return (
    <div className="bg-muted/40 min-h-screen">
      {/* Pipeline Stats */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">Todos os leads no funil</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLeads}</div>
              <p className="text-xs text-muted-foreground">Novos + Em Negociação</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsByStatus['Converted']?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Leads que viraram clientes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className={cn(
                  "text-xs text-muted-foreground",
                  parseFloat(conversionRate) >= 20 ? "text-green-600 dark:text-green-500" : 
                  parseFloat(conversionRate) >= 10 ? "text-yellow-600 dark:text-yellow-500" : 
                  "text-red-600 dark:text-red-500"
                )}>
                  {parseFloat(conversionRate) >= 20 ? "Excelente" : 
                   parseFloat(conversionRate) >= 10 ? "Bom" : 
                   "A melhorar"}
                </p>
            </CardContent>
          </Card>
        </div>
      </div>

        <div className="flex overflow-x-auto p-4 gap-4">
          {columnOrder.map(status => (
            <KanbanColumn 
              key={status}
              status={status} 
              leads={leadsByStatus[status] || []} 
              visibleCount={visibleLeadsCount[status] || LEADS_PER_PAGE}
              onLoadMore={() => handleLoadMore(status)}
              onDrop={handleLeadDrop}
            />
          ))}
        </div>
    </div>
  );
}