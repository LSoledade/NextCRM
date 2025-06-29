'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

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
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Barra de Pesquisa e Filtros Básicos */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Pesquisar leads..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
            />
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Origem</InputLabel>
              <Select
                value={filters.source}
                label="Origem"
                onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="Favale">Favale</MenuItem>
                <MenuItem value="Pink">Pink</MenuItem>
                <MenuItem value="Instagram">Instagram</MenuItem>
                <MenuItem value="Facebook">Facebook</MenuItem>
                <MenuItem value="Site">Site</MenuItem>
                <MenuItem value="Indicação">Indicação</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="New">Novo</MenuItem>
                <MenuItem value="Contacted">Contatado</MenuItem>
                <MenuItem value="Converted">Convertido</MenuItem>
                <MenuItem value="Lost">Perdido</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Campanha</InputLabel>
              <Select
                value={filters.campaign}
                label="Campanha"
                onChange={(e) => onFiltersChange({ ...filters, campaign: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="Instagram">Instagram</MenuItem>
                <MenuItem value="Facebook">Facebook</MenuItem>
                <MenuItem value="Email">E-mail</MenuItem>
                <MenuItem value="Site">Site</MenuItem>
                <MenuItem value="Indicação">Indicação</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant={hasActiveFilters ? "contained" : "outlined"}
              color="primary"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              startIcon={<FilterList />}
              size="small"
            >
              Filtros
              {hasActiveFilters && (
                <Chip
                  label={activeFilterCount}
                  size="small"
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Filtros Avançados */}
      <Collapse in={expanded}>
        <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'grey.50' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight={600}>
              Filtros Avançados
            </Typography>
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
            >
              Limpar Tudo
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.state}
                  label="Estado"
                  onChange={(e) => onFiltersChange({ ...filters, state: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="SP">São Paulo</MenuItem>
                  <MenuItem value="RJ">Rio de Janeiro</MenuItem>
                  <MenuItem value="MG">Minas Gerais</MenuItem>
                  <MenuItem value="RS">Rio Grande do Sul</MenuItem>
                  <MenuItem value="PR">Paraná</MenuItem>
                  <MenuItem value="SC">Santa Catarina</MenuItem>
                  <MenuItem value="BA">Bahia</MenuItem>
                  <MenuItem value="DF">Distrito Federal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tag</InputLabel>
                <Select
                  value={filters.tag}
                  label="Tag"
                  onChange={(e) => onFiltersChange({ ...filters, tag: e.target.value })}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Período</InputLabel>
                <Select
                  value={filters.dateRange}
                  label="Período"
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="today">Hoje</MenuItem>
                  <MenuItem value="last7days">Últimos 7 dias</MenuItem>
                  <MenuItem value="last30days">Últimos 30 dias</MenuItem>
                  <MenuItem value="thisMonth">Este mês</MenuItem>
                  <MenuItem value="lastMonth">Mês passado</MenuItem>
                  <MenuItem value="thisYear">Este ano</MenuItem>
                  <MenuItem value="custom">Período personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {filters.dateRange === 'custom' && (
              <>
                <Grid item xs={6} md={1.5}>
                  <TextField
                    fullWidth
                    label="Data inicial"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={filters.startDate}
                    onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <TextField
                    fullWidth
                    label="Data final"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={filters.endDate}
                    onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}