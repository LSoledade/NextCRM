'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityStats {
  totalTeachers: number;
  teachersWithAvailability: number;
  totalHoursPerWeek: number;
  averageHoursPerTeacher: number;
  totalBlockouts: number;
  mostAvailableDay: string;
  leastAvailableDay: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Availability {
  id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  teacher?: Teacher;
}

interface Absence {
  id: string;
  teacher_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  is_recurring: boolean;
  teacher?: Teacher;
}

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function AvailabilitySummary() {
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    try {
      // Buscar professores
      const { data: teachers, error: teachersError } = await supabase
        .from('trainers')
        .select('id, name, email');

      if (teachersError) throw teachersError;

      // Buscar disponibilidades
      const { data: availabilities, error: availabilitiesError } = await supabase
        .from('teacher_availability')
        .select('*');

      if (availabilitiesError) throw availabilitiesError;

      // Buscar bloqueios
      const { data: absences, error: absencesError } = await supabase
        .from('teacher_absences')
        .select('*');

      if (absencesError) throw absencesError;

      // Calcular estatísticas
      const totalTeachers = teachers?.length || 0;
      const teachersWithAvailability = new Set(availabilities?.map(a => a.teacher_id) || []).size;
      
      // Calcular horas totais por semana
      const totalHoursPerWeek = (availabilities || []).reduce((acc, av) => {
        const start = new Date(`2000-01-01T${av.start_time}`);
        const end = new Date(`2000-01-01T${av.end_time}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const averageHoursPerTeacher = teachersWithAvailability > 0 ? totalHoursPerWeek / teachersWithAvailability : 0;
      
      // Contar disponibilidades por dia
      const dayCount: { [key: number]: number } = {};
      (availabilities || []).forEach(av => {
        dayCount[av.day_of_week] = (dayCount[av.day_of_week] || 0) + 1;
      });
      
      const mostAvailableDay = Object.keys(dayCount).reduce((a, b) => 
        dayCount[parseInt(a)] > dayCount[parseInt(b)] ? a : b, '0'
      );
      
      const leastAvailableDay = Object.keys(dayCount).reduce((a, b) => 
        dayCount[parseInt(a)] < dayCount[parseInt(b)] ? a : b, '0'
      );

      setStats({
        totalTeachers,
        teachersWithAvailability,
        totalHoursPerWeek: Math.round(totalHoursPerWeek * 10) / 10,
        averageHoursPerTeacher: Math.round(averageHoursPerTeacher * 10) / 10,
        totalBlockouts: absences?.length || 0,
        mostAvailableDay: DAYS_OF_WEEK[parseInt(mostAvailableDay)] || 'N/A',
        leastAvailableDay: DAYS_OF_WEEK[parseInt(leastAvailableDay)] || 'N/A'
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas de disponibilidade.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">Carregando estatísticas...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Não foi possível carregar as estatísticas.
          </div>
        </CardContent>
      </Card>
    );
  }

  const coveragePercentage = stats.totalTeachers > 0 
    ? Math.round((stats.teachersWithAvailability / stats.totalTeachers) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cobertura</p>
                <p className="text-2xl font-bold">{coveragePercentage}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.teachersWithAvailability} de {stats.totalTeachers} professores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas/Semana</p>
                <p className="text-2xl font-bold">{stats.totalHoursPerWeek}h</p>
                <p className="text-xs text-muted-foreground">
                  Média: {stats.averageHoursPerTeacher}h por professor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dia Mais Ativo</p>
                <p className="text-lg font-bold">{stats.mostAvailableDay}</p>
                <p className="text-xs text-muted-foreground">
                  Menos ativo: {stats.leastAvailableDay}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bloqueios</p>
                <p className="text-2xl font-bold">{stats.totalBlockouts}</p>
                <p className="text-xs text-muted-foreground">
                  Períodos indisponíveis
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Status da Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Professores com disponibilidade configurada</span>
              <div className="flex items-center gap-2">
                <Badge variant={coveragePercentage >= 80 ? 'default' : coveragePercentage >= 50 ? 'secondary' : 'destructive'}>
                  {coveragePercentage}%
                </Badge>
                {coveragePercentage >= 80 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Média de horas por professor</span>
              <div className="flex items-center gap-2">
                <Badge variant={stats.averageHoursPerTeacher >= 20 ? 'default' : 'secondary'}>
                  {stats.averageHoursPerTeacher}h
                </Badge>
                {stats.averageHoursPerTeacher >= 20 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Bloqueios ativos</span>
              <div className="flex items-center gap-2">
                <Badge variant={stats.totalBlockouts === 0 ? 'default' : stats.totalBlockouts <= 5 ? 'secondary' : 'destructive'}>
                  {stats.totalBlockouts}
                </Badge>
                {stats.totalBlockouts <= 5 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}