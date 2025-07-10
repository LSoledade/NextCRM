'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherManagement } from './TeacherManagement';
import { ServiceManagement } from './ServiceManagement';
import { TeacherServiceManagement } from './TeacherServiceManagement';
import { AvailabilitySummary } from './AvailabilitySummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, Link, BarChart } from 'lucide-react';

export function ManagementDashboard() {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento</h1>
            <p className="text-muted-foreground">Administre professores, serviços e suas disponibilidades.</p>
        </div>
        <Tabs defaultValue="teachers" className="space-y-4">
            <TabsList>
                <TabsTrigger value="teachers">
                    <Users className="mr-2 h-4 w-4" />
                    Professores
                </TabsTrigger>
                <TabsTrigger value="services">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Serviços
                </TabsTrigger>
                <TabsTrigger value="teacher-services">
                    <Link className="mr-2 h-4 w-4" />
                    Vínculos
                </TabsTrigger>
                <TabsTrigger value="summary">
                    <BarChart className="mr-2 h-4 w-4" />
                    Resumo
                </TabsTrigger>
            </TabsList>

            <TabsContent value="teachers">
                <TeacherManagement />
            </TabsContent>

            <TabsContent value="services">
                <ServiceManagement />
            </TabsContent>

            <TabsContent value="teacher-services">
                <TeacherServiceManagement />
            </TabsContent>

            <TabsContent value="summary">
                <AvailabilitySummary />
            </TabsContent>
        </Tabs>
    </div>
  );
}