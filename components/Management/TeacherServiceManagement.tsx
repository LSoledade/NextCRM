'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Link, Unlink } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Teacher {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface TeacherService {
  id: string;
  teacher_id: string;
  service_id: string;
  teacher?: Teacher;
  service?: Service;
}

export function TeacherServiceManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teacherServices, setTeacherServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Buscar professores
      const { data: teachersData, error: teachersError } = await supabase
        .from('trainers')
        .select('id, name, email, company')
        .order('name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Buscar serviços ativos
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, description, duration_minutes, price, is_active')
        .eq('is_active', true)
        .order('name');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Buscar vínculos professor-serviço
      const { data: teacherServicesData, error: teacherServicesError } = await supabase
        .from('teacher_services')
        .select(`
          *,
          teacher:trainers(id, name, email, company),
          service:services(id, name, description, duration_minutes, price, is_active)
        `);

      if (teacherServicesError) throw teacherServicesError;
      setTeacherServices(teacherServicesData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    if (!selectedTeacher || selectedServices.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione um professor e pelo menos um serviço.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Primeiro, remover vínculos existentes do professor
      const { error: deleteError } = await supabase
        .from('teacher_services')
        .delete()
        .eq('teacher_id', selectedTeacher);

      if (deleteError) throw deleteError;

      // Inserir novos vínculos
      const newTeacherServices = selectedServices.map(serviceId => ({
        teacher_id: selectedTeacher,
        service_id: serviceId,
        user_id: user.id
      }));

      const { error: insertError } = await supabase
        .from('teacher_services')
        .insert(newTeacherServices);

      if (insertError) throw insertError;
      
      toast({
        title: 'Sucesso',
        description: 'Vínculos atualizados com sucesso!'
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar vínculos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os vínculos.',
        variant: 'destructive'
      });
    }
  };

  const handleEditTeacherServices = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    
    // Buscar serviços já vinculados ao professor
    const currentServices = teacherServices
      .filter(ts => ts.teacher_id === teacherId)
      .map(ts => ts.service_id);
    
    setSelectedServices(currentServices);
    setDialogOpen(true);
  };

  const handleRemoveTeacherService = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este vínculo?')) return;

    try {
      const { error } = await supabase
        .from('teacher_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Vínculo removido com sucesso!'
      });
      
      fetchData();
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o vínculo.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setSelectedTeacher('');
    setSelectedServices([]);
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, serviceId]);
    } else {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  // Agrupar vínculos por professor
  const teacherServiceGroups = teachers.map(teacher => {
    const services = teacherServices
      .filter(ts => ts.teacher_id === teacher.id)
      .map(ts => ts.service);
    return { teacher, services };
  }).filter(group => group.services.length > 0);

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Vínculos Professor-Serviço</h2>
        <p className="text-muted-foreground">Gerencie quais serviços cada professor pode oferecer</p>
      </div>

      <div className="flex justify-end items-center">

        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Gerenciar Vínculos
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Vínculos Professor-Serviço</DialogTitle>
              <DialogDescription>
                Selecione um professor e os serviços que ele pode oferecer.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="teacher">Professor</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} - {teacher.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label>Serviços Disponíveis</Label>
                  <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                    {services.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum serviço ativo encontrado.</p>
                    ) : (
                      <div className="space-y-3">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={`service-${service.id}`}
                              checked={selectedServices.includes(service.id)}
                              onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`service-${service.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {service.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {service.description} • {formatDuration(service.duration_minutes)} • {formatPrice(service.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Vínculos
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {teacherServiceGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum vínculo cadastrado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          teacherServiceGroups.map(({ teacher, services }) => (
            <Card key={teacher.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {teacher.name}
                      <Badge variant="outline">{teacher.company}</Badge>
                    </CardTitle>
                    <CardDescription>{teacher.email}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTeacherServices(teacher.id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Vínculos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Serviços Vinculados ({services.length})
                  </h4>
                  <div className="grid gap-2">
                    {services.map((service) => {
                      const teacherService = teacherServices.find(
                        ts => ts.teacher_id === teacher.id && ts.service_id === service?.id
                      );
                      
                      return (
                        <div key={service?.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Link className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium">{service?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDuration(service?.duration_minutes || 0)} • {formatPrice(service?.price || 0)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => teacherService && handleRemoveTeacherService(teacherService.id)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}