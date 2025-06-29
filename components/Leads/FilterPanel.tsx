'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label'; // For better form structure
import { Badge } from '@/components/ui/badge'; // For active filter count
import { Filter, XCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'; // Replaced icons
import { cn } from '@/lib/utils';

interface FilterState {
  source: string;
  status: string;
  campaign: string;
  state: string;
  startDate: string;
  endDate: string;
  tag: string;
  dateRange: string;
}

interface FilterPanelProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableTags: string[];
}

export default function FilterPanel({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  availableTags,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDateRangeChange = (range: string) => {
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];
    
    switch(range) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        break;
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        startDate = last7Days.toISOString().split('T')[0];
        break;
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        startDate = last30Days.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = thisMonth.toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastDayLastMonth.toISOString().split('T')[0];
        break;
      case 'thisYear':
        const thisYear = new Date(today.getFullYear(), 0, 1);
        startDate = thisYear.toISOString().split('T')[0];
        break;
      case 'custom':
        return;
      default:
        startDate = '';
        endDate = '';
    }
    
    onFiltersChange({ ...filters, startDate, endDate, dateRange: range });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      source: '',
      status: '',
      campaign: '',
      state: '',
      startDate: '',
      endDate: '',
      tag: '',
      dateRange: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const activeFilterCount = Object.values(filters).filter(value => value !== '' && value !== undefined).length;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="mb-6 space-y-4">
      {/* Barra de Pesquisa e Filtros Básicos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
        <div className="relative md:col-span-4">
          <Search className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar leads (nome, email, telefone)..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sourceFilter" className="sr-only">Origem</Label>
          <Select
            value={filters.source}
            onValueChange={(value) => onFiltersChange({ ...filters, source: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="sourceFilter"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
              <SelectItem value="Favale">Favale</SelectItem>
              <SelectItem value="Pink">Pink</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
           <Label htmlFor="statusFilter" className="sr-only">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="statusFilter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="New">Novo</SelectItem>
              <SelectItem value="Contacted">Contatado</SelectItem>
              <SelectItem value="Converted">Convertido</SelectItem>
              <SelectItem value="Lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="campaignFilter" className="sr-only">Campanha</Label>
          <Select
            value={filters.campaign}
            onValueChange={(value) => onFiltersChange({ ...filters, campaign: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="campaignFilter"><SelectValue placeholder="Campanha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Campanhas</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Email">E-mail</SelectItem>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CollapsibleTrigger asChild className="md:col-span-2">
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            className="w-full"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
      </div>

      {/* Filtros Avançados */}
      <CollapsibleContent>
        <div className="p-4 space-y-4 border rounded-md bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Filtros Avançados
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="text-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Limpar Tudo ({activeFilterCount})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <Label htmlFor="stateFilterAdv" className="text-xs text-muted-foreground">Estado</Label>
              <Select
                value={filters.state}
                onValueChange={(value) => onFiltersChange({ ...filters, state: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="stateFilterAdv"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  {/* Add other states as needed */}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tagFilterAdv" className="text-xs text-muted-foreground">Tag</Label>
              <Select
                value={filters.tag}
                onValueChange={(value) => onFiltersChange({ ...filters, tag: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="tagFilterAdv"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dateRangeFilterAdv" className="text-xs text-muted-foreground">Período</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleDateRangeChange(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="dateRangeFilterAdv"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer data</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês passado</SelectItem>
                  <SelectItem value="thisYear">Este ano</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDateFilterAdv" className="text-xs text-muted-foreground">Data Inicial</Label>
                  <Input
                    id="startDateFilterAdv"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDateFilterAdv" className="text-xs text-muted-foreground">Data Final</Label>
                  <Input
                    id="endDateFilterAdv"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}