'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppLayout from '@/components/Layout/AppLayout';
import UserManagement from '@/components/Settings/UserManagement';
import { Settings, Users, Shield, AlertTriangle, Cog } from 'lucide-react';

const LoadingPage = () => (
  <AppLayout>
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

const AccessDeniedPage = () => (
  <AppLayout>
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acesso Restrito</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar as configurações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Apenas administradores podem gerenciar configurações e usuários. 
              Entre em contato com um administrador se precisar de acesso.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingPage />;
  }

  if (user?.role !== 'admin') {
    return <AccessDeniedPage />;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
              <p className="text-muted-foreground">
                Gerencie usuários, permissões e configurações do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Cog className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Configurações Gerais
                  <Badge variant="secondary">Em breve</Badge>
                </CardTitle>
                <CardDescription>
                  Configurações globais do sistema e preferências
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Cog className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Configurações do Sistema</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Esta seção estará disponível em breve com opções para personalizar 
                    o comportamento do sistema, notificações e integrações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
