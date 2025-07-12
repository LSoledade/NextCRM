'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader, // Shadcn specific
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card"; // For Paper replacement
import { MoreHorizontal, Edit3, Trash2, Eye, PhoneCall, Mail } from 'lucide-react'; // Replaced icons
import { Database } from '@/types/database';
import { getCompanyBadgeStyles, getStudentBadgeStyles, type Company } from '@/lib/company-utils';
import { cn } from '@/lib/utils';

// Função para formatar telefone brasileiro
const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se tem 13 dígitos e começa com 55 (código do Brasil)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const number = cleaned.substring(2); // Remove o 55
    return `(${number.substring(0, 2)}) ${number.substring(2, 7)}-${number.substring(7)}`;
  }
  
  // Se tem 11 dígitos (celular brasileiro)
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  
  // Se tem 10 dígitos (telefone fixo brasileiro)
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  // Retorna o telefone original se não conseguir formatar
  return phone;
};

// Função para verificar se o nome é um telefone e retornar nome apropriado
const getDisplayName = (name: string | null | undefined): string => {
  if (!name) return 'Sem nome';
  
  // Verifica se o nome é apenas números (possivelmente um telefone)
  const cleaned = name.replace(/\D/g, '');
  if (cleaned.length >= 10 && cleaned === name.replace(/[\s\-\(\)]/g, '')) {
    return 'Contato WhatsApp';
  }
  
  return name;
};

type Lead = Database['public']['Tables']['leads']['Row'] & {
  is_student?: boolean;
};

// Assuming you might want a custom pagination component or integrate with shadcn's table capabilities
// For simplicity, basic pagination logic is kept, but UI will need shadcn components.
// Shadcn UI doesn't have a direct TablePagination component like MUI.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // For Rows per page

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onView: (lead: Lead) => void;
  // Paginação do backend
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Ordenação
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export default function LeadTable({
  leads,
  loading,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
}: LeadTableProps) {

  // Os leads já vêm ordenados e paginados do backend

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const newSelectedIds = leads.map((lead) => lead.id);
      onSelectionChange(Array.from(new Set([...selectedIds, ...newSelectedIds])));
    } else {
      const pageIds = leads.map((lead) => lead.id);
      onSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectOne = (checked: boolean | 'indeterminate', id: string) => {
    if (checked === true) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleChangePage = (newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    onPageSizeChange(parseInt(value, 10));
  };

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newSortOrder);
  };

  const getStatusBadgeVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case 'New': return 'secondary'; // Using secondary for New for better differentiation
      case 'Contacted': return 'outline'; // Using outline for Contacted
      case 'Converted': return 'default'; // Using default (primary color) for Converted
      case 'Lost': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch (e) {
        return 'Data inválida';
    }
  };

  const isAllOnPageSelected = leads.length > 0 && leads.every(lead => selectedIds.includes(lead.id));
  const isSomeOnPageSelected = leads.some(lead => selectedIds.includes(lead.id));
  const selectAllCheckedState = isAllOnPageSelected ? true : isSomeOnPageSelected ? 'indeterminate' : false;

  // Customização de colunas
  const defaultColumns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefone' },
    { key: 'company', label: 'Empresa' },
    { key: 'status', label: 'Status' },
    { key: 'source', label: 'Origem' },
    { key: 'tags', label: 'Tags' },
    { key: 'created_at', label: 'Criado em' },
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leads_visible_columns');
      if (saved) {
        const parsedColumns = JSON.parse(saved);
        // Garantir que a coluna company esteja sempre visível se não estiver
        if (!parsedColumns.includes('company')) {
          parsedColumns.push('company');
        }
        return parsedColumns;
      }
    }
    return defaultColumns.map(c => c.key);
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leads_visible_columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center justify-center">
          <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm text-muted-foreground">Carregando leads...</p>
        </div>
      </Card>
    );
  }

  if (leads.length === 0 && !loading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Nenhum lead encontrado.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAllCheckedState}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos na página"
                  />
                </TableHead>
                {visibleColumns.includes('name') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    Nome {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('email') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('phone') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('phone')}
                  >
                    Telefone {sortBy === 'phone' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('company') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('company')}
                  >
                    Empresa {sortBy === 'company' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('status') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('source') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('source')}
                  >
                    Origem {sortBy === 'source' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {visibleColumns.includes('tags') && (
                  <TableHead>Tags</TableHead>
                )}
                {visibleColumns.includes('created_at') && (
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    Criado em {sortBy === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )}
                {/* <TableHead className="text-right">Ações</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  data-state={selectedIds.includes(lead.id) && "selected"}
                  className={
                    cn(
                      "transition-colors cursor-pointer hover:bg-muted/60",
                      selectedIds.includes(lead.id) && "bg-primary/10"
                    )
                  }
                  onClick={() => onView(lead)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectOne(checked, lead.id)}
                      aria-label={`Selecionar lead ${lead.name}`}
                    />
                  </TableCell>
                  {visibleColumns.includes('name') && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{getDisplayName(lead.name)}</span>
                        {lead.is_student && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs px-2 py-0.5", getStudentBadgeStyles((lead as any).company as Company))}
                          >
                            Aluno
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('email') && (
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('phone') && (
                    <TableCell>
                      {lead.phone ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PhoneCall className="w-4 h-4" />
                          {formatPhone(lead.phone)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Não informado</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('company') && (
                    <TableCell>
                      {(lead as any).company ? (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs px-2 py-0.5", getCompanyBadgeStyles((lead as any).company as Company))}
                        >
                          {(lead as any).company}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('source') && (
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.source || 'Não informada'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('tags') && (
                    <TableCell>
                      {lead.tags && lead.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                              {tag}
                            </Badge>
                          ))}
                          {lead.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">+{lead.tags.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('created_at') && (
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                  )}
                  {/* <TableCell className="text-right">Ações</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Custom Pagination Controls */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedIds.length} de {totalCount.toLocaleString('pt-BR')} linha(s) selecionadas.
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Linhas por página</p>
            <Select
              value={`${pageSize}`}
              onValueChange={handleChangeRowsPerPage}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50, 100].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">
            Página {currentPage + 1} de {totalPages.toLocaleString('pt-BR')} ({totalCount.toLocaleString('pt-BR')} leads)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(0)}
              disabled={!hasPreviousPage}
            >
              <span className="sr-only">Primeira página</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={!hasPreviousPage}
            >
              <span className="sr-only">Página anterior</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(currentPage + 1)}
              disabled={!hasNextPage}
            >
              <span className="sr-only">Próxima página</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(totalPages - 1)}
              disabled={!hasNextPage}
            >
              <span className="sr-only">Última página</span>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}