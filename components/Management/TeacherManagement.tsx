'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Mail, Building } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AvailabilityEditor } from './AvailabilityEditor';
import { Availability, Blockout } from '@/types/types';


interface Teacher {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  company: string;
  created_at: string;
}



export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [blockouts, setBlockouts] = useState<Blockout[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialties: '',
    company: ''
  });

  const fetchTeacherAvailability = async (teacherId: string) => {
    try {
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', teacherId);
      if (availabilityError) throw availabilityError;
      setAvailability(availabilityData || []);

      const { data: blockoutsData, error: blockoutsError } = await supabase
        .from('blockouts')
        .select('*')
        .eq('teacher_id', teacherId);
      if (blockoutsError) throw blockoutsError;
      setBlockouts(blockoutsData || []);
    } catch (error) {
      console.error('Erro ao buscar disponibilidade do professor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a disponibilidade do professor.',
        variant: 'destructive',
      });
    }
  };

  
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();

  const fetchTeachers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os professores.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const specialtiesArray = formData.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const teacherData = {
        name: formData.name,
        email: formData.email,
        specialties: specialtiesArray,
        company: formData.company,
        user_id: user.id
      };

      if (editingTeacher) {
        const { error } = await supabase
          .from('trainers')
          .update(teacherData)
          .eq('id', editingTeacher.id);

        if (error) throw error;

        // Salvar disponibilidade e bloqueios
        if (editingTeacher) {
          // Deletar dados antigos
          await supabase.from('availability').delete().eq('teacher_id', editingTeacher.id);
          await supabase.from('blockouts').delete().eq('teacher_id', editingTeacher.id);

          // Inserir novos dados
          const availabilityToInsert = availability.map(a => ({ ...a, teacher_id: editingTeacher.id }));
          const blockoutsToInsert = blockouts.map(b => ({ ...b, teacher_id: editingTeacher.id }));

          if (availabilityToInsert.length > 0) {
            const { error: availabilityError } = await supabase.from('availability').insert(availabilityToInsert);
            if (availabilityError) throw availabilityError;
          }

          if (blockoutsToInsert.length > 0) {
            const { error: blockoutsError } = await supabase.from('blockouts').insert(blockoutsToInsert);
            if (blockoutsError) throw blockoutsError;
          }
        }
        
        toast({
          title: 'Sucesso',
          description: 'Professor atualizado com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('trainers')
          .insert([teacherData]);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Professor cadastrado com sucesso!'
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchTeachers();
    } catch (error) {
      console.error('Erro ao salvar professor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o professor.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = async (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      specialties: teacher.specialties?.join(', ') || '',
      company: teacher.company || ''
    });
    fetchTeacherAvailability(teacher.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;

    try {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Professor excluído com sucesso!'
      });
      
      fetchTeachers();
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o professor.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', specialties: '', company: '' });
    setAvailability([]);
    setBlockouts([]);
    setEditingTeacher(null);
  };



  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Professores</h2>
          <p className="text-muted-foreground">Gerencie o cadastro de professores</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Professor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? 'Editar Professor' : 'Novo Professor'}
              </DialogTitle>
              <DialogDescription>
                {editingTeacher ? 'Edite as informações do professor.' : 'Cadastre um novo professor no sistema.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Select value={formData.company} onValueChange={(value) => setFormData({ ...formData, company: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Favale">Favale</SelectItem>
                      <SelectItem value="Pink">Pink</SelectItem>
                      <SelectItem value="Favale&Pink">Favale & Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="specialties">Especialidades</Label>
                  <Textarea
                    id="specialties"
                    placeholder="Digite as especialidades separadas por vírgula"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    rows={3}
                  />
                </div>

                {editingTeacher && (
                  <div className="pt-4">
                     <Card>
                       <CardHeader>
                         <CardTitle>Disponibilidade e Bloqueios</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <AvailabilityEditor 
                           availability={availability}
                           setAvailability={setAvailability}
                           blockouts={blockouts}
                           setBlockouts={setBlockouts}
                         />
                       </CardContent>
                     </Card>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTeacher ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>



      <Card>
        <CardHeader>
          <CardTitle>Lista de Professores</CardTitle>
          <CardDescription>
            {teachers.length} professor(es) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Especialidades</TableHead>

                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {teacher.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teacher.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{teacher.company}</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(teacher)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {teachers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum professor cadastrado ainda.
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}