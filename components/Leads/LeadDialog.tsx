'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type InsertLead = Database['public']['Tables']['leads']['Insert'];

interface LeadDialogProps {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSave: (lead: InsertLead) => Promise<void>;
}

export default function LeadDialog({ open, lead, onClose, onSave }: LeadDialogProps) {
  const [formData, setFormData] = useState<InsertLead>({
    name: '',
    email: '',
    phone: '',
    status: 'New',
    source: '',
    user_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        status: lead.status,
        source: lead.source || '',
        tags: lead.tags || [],
        user_id: lead.user_id,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'New',
        source: '',
        tags: [],
        user_id: '',
      });
    }
    setTagInput('');
  }, [lead, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTagKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTagAdd();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                >
                  <MenuItem value="New">Novo</MenuItem>
                  <MenuItem value="Contacted">Contatado</MenuItem>
                  <MenuItem value="Converted">Convertido</MenuItem>
                  <MenuItem value="Lost">Perdido</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Origem</InputLabel>
                <Select
                  value={formData.source}
                  label="Origem"
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                >
                  <MenuItem value="">Selecione uma origem</MenuItem>
                  <MenuItem value="Favale">Favale</MenuItem>
                  <MenuItem value="Pink">Pink</MenuItem>
                  <MenuItem value="Instagram">Instagram</MenuItem>
                  <MenuItem value="Facebook">Facebook</MenuItem>
                  <MenuItem value="Site">Site</MenuItem>
                  <MenuItem value="Indicação">Indicação</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adicionar Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="Digite uma tag e pressione Enter"
                helperText="Pressione Enter para adicionar uma tag"
              />
              
              {formData.tags && formData.tags.length > 0 && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Tags:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {formData.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        onDelete={() => handleTagRemove(tag)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.name || !formData.email}
          >
            {loading ? 'Salvando...' : lead ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}