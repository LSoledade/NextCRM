'use client';

import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Chip,
  Typography,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Phone,
  Email,
} from '@mui/icons-material';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = paginatedLeads.map((lead) => lead.id);
      onSelectionChange([...new Set([...selectedIds, ...newSelectedIds])]);
    } else {
      const pageIds = paginatedLeads.map((lead) => lead.id);
      onSelectionChange(selectedIds.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectOne = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (event.target.checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    setAnchorEl(event.currentTarget);
    setSelectedLead(lead);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLead(null);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'primary';
      case 'Contacted': return 'info';
      case 'Converted': return 'success';
      case 'Lost': return 'error';
      default: return 'default';
    }
  };

  const paginatedLeads = leads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isAllSelected = paginatedLeads.length > 0 && 
    paginatedLeads.every(lead => selectedIds.includes(lead.id));
  const isIndeterminate = paginatedLeads.some(lead => selectedIds.includes(lead.id)) && !isAllSelected;

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando leads...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Origem</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                hover
                selected={selectedIds.includes(lead.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(lead.id)}
                    onChange={(event) => handleSelectOne(event, lead.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {lead.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">{lead.email}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {lead.phone ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{lead.phone}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Não informado
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={lead.status}
                    color={getStatusColor(lead.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {lead.source || 'Não informada'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, lead)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={leads.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => {
          if (selectedLead) onView(selectedLead);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Visualizar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedLead) onEdit(selectedLead);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedLead) onDelete(selectedLead);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}