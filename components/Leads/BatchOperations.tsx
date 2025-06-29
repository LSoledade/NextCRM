'use client';

import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import { Clear, Delete } from '@mui/icons-material';

interface BatchOperationsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchStatusUpdate: (status: string) => void;
  onBatchSourceUpdate: (source: string) => void;
  onBatchDelete: () => void;
}

export default function BatchOperations({
  selectedCount,
  onClearSelection,
  onBatchStatusUpdate,
  onBatchSourceUpdate,
  onBatchDelete,
}: BatchOperationsProps) {
  if (selectedCount === 0) return null;

  return (
    <Box
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'primary.50',
        border: 1,
        borderColor: 'primary.200',
        borderRadius: 2,
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={selectedCount}
              color="primary"
              size="small"
            />
            <Typography variant="body2">
              {selectedCount === 1 ? 'lead selecionado' : 'leads selecionados'}
            </Typography>
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={onClearSelection}
              sx={{ ml: 1 }}
            >
              Limpar
            </Button>
          </Box>
        </Grid>
        
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Alterar Status</InputLabel>
            <Select
              label="Alterar Status"
              onChange={(e) => onBatchStatusUpdate(e.target.value)}
              value=""
            >
              <MenuItem value="New">Novo</MenuItem>
              <MenuItem value="Contacted">Contatado</MenuItem>
              <MenuItem value="Converted">Convertido</MenuItem>
              <MenuItem value="Lost">Perdido</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Alterar Origem</InputLabel>
            <Select
              label="Alterar Origem"
              onChange={(e) => onBatchSourceUpdate(e.target.value)}
              value=""
            >
              <MenuItem value="Favale">Favale</MenuItem>
              <MenuItem value="Pink">Pink</MenuItem>
              <MenuItem value="Instagram">Instagram</MenuItem>
              <MenuItem value="Facebook">Facebook</MenuItem>
              <MenuItem value="Site">Site</MenuItem>
              <MenuItem value="Indicação">Indicação</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={onBatchDelete}
            size="small"
          >
            Excluir Selecionados
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}