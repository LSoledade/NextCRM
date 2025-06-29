'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'];

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
}

export default function LeadTable({
  leads,
  loading,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
}: LeadTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // DropdownMenu handles its own open/close state, no need for anchorEl or selectedLead for menu here

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const newSelectedIds = paginatedLeads.map((lead) => lead.id);
      onSelectionChange([...new Set([...selectedIds, ...newSelectedIds])]);
    } else {
      const pageIds = paginatedLeads.map((lead) => lead.id);
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
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(0);
  };

  const getStatusBadgeVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case 'New': return 'default';
      case 'Contacted': return 'secondary';
      case 'Converted': return 'success';
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

  const paginatedLeads = leads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const isAllOnPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedIds.includes(lead.id));
  const isSomeOnPageSelected = paginatedLeads.some(lead => selectedIds.includes(lead.id));
  const selectAllCheckedState = isAllOnPageSelected ? true : isSomeOnPageSelected ? 'indeterminate' : false;


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
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  data-state={selectedIds.includes(lead.id) && "selected"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectOne(checked, lead.id)}
                      aria-label={`Selecionar lead ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.phone ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PhoneCall className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não informado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.source || 'Não informada'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-8 h-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(lead)}>
                          <Eye className="w-4 h-4 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(lead)}>
                          <Edit3 className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(lead)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-700/20 dark:focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Custom Pagination Controls */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedIds.length} de {leads.length} linha(s) selecionadas.
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Linhas por página</p>
            <Select
              value={`${rowsPerPage}`}
              onValueChange={handleChangeRowsPerPage}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">
            Página {page + 1} de {Math.ceil(leads.length / rowsPerPage)}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(0)}
              disabled={page === 0}
            >
              <span className="sr-only">Primeira página</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(page - 1)}
              disabled={page === 0}
            >
              <span className="sr-only">Página anterior</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(page + 1)}
              disabled={page >= Math.ceil(leads.length / rowsPerPage) - 1}
            >
              <span className="sr-only">Próxima página</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </Button>
            <Button
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => handleChangePage(Math.ceil(leads.length / rowsPerPage) - 1)}
              disabled={page >= Math.ceil(leads.length / rowsPerPage) - 1}
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