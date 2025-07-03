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
    <div className="container mx-auto max-w-7xl px-6 lg:px-8">
      <div className="py-8 lg:py-12 space-y-10">
        {/* Header Skeleton */}
        <header className="space-y-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-6 w-full max-w-3xl" />
            </div>
          </div>
        </header>
        
        {/* Tabs Skeleton */}
        <div className="space-y-8">
          <div className="border-b border-border pb-6">
            <Skeleton className="h-12 w-full max-w-md" />
          </div>
          
          {/* Content Area Skeleton */}
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-full max-w-2xl" />
            </div>
            
            <Card>
              <CardHeader className="pb-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-80" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
);

const AccessDeniedPage = () => (
  <AppLayout>
    <div className="container mx-auto max-w-7xl px-6 lg:px-8">
      <div className="py-8 lg:py-12">
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-2xl border-destructive/20 bg-destructive/5">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 ring-1 ring-destructive/20">
                <Shield className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-4">
                <CardTitle className="text-3xl font-semibold">Acesso Restrito</CardTitle>
                <CardDescription className="text-lg max-w-lg mx-auto">
                  Você não tem permissão para acessar as configurações do sistema
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-8">
              <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 p-6">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-base text-amber-800 dark:text-amber-200 ml-2">
                  <strong className="font-semibold">Acesso de Administrador Necessário</strong>
                  <br />
                  <span className="mt-2 block">
                    Apenas administradores podem gerenciar configurações e usuários. 
                    Entre em contato com um administrador se precisar de acesso a esta área.
                  </span>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
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
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="py-8 lg:py-12 space-y-10">
          {/* Page Header */}
          <header className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shrink-0">
                <Settings className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  Configurações
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
                  Gerencie usuários, permissões e configurações do sistema para manter 
                  sua organização funcionando perfeitamente
                </p>
              </div>
            </div>
          </header>

          {/* Settings Navigation & Content */}
          <div className="space-y-10">
            <Tabs defaultValue="users" className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pb-6">
                <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
                  <TabsTrigger value="users" className="gap-3 text-sm font-medium px-6">
                    <Users className="h-4 w-4" />
                    Equipe
                  </TabsTrigger>
                  <TabsTrigger value="general" className="gap-3 text-sm font-medium px-6">
                    <Cog className="h-4 w-4" />
                    Sistema
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="users" className="space-y-8 mt-8">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight">Gerenciamento de Equipe</h2>
                  <p className="text-base text-muted-foreground max-w-2xl">
                    Controle o acesso e permissões dos membros da sua equipe de forma centralizada
                  </p>
                </div>
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="general" className="space-y-8 mt-8">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight">Configurações do Sistema</h2>
                  <p className="text-base text-muted-foreground max-w-2xl">
                    Personalize o comportamento global do sistema e suas integrações
                  </p>
                </div>
                
                <Card className="border-dashed bg-muted/20">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 ring-1 ring-border">
                          <Cog className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-semibold">
                            Configurações Gerais
                          </CardTitle>
                          <CardDescription className="text-base mt-1">
                            Configurações globais do sistema e preferências avançadas
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        Em desenvolvimento
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 pb-8">
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 ring-1 ring-border">
                        <Cog className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-foreground">
                          Configurações Avançadas
                        </h3>
                        <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                          Esta seção estará disponível em breve com opções para personalizar 
                          o comportamento do sistema, notificações, integrações e muito mais.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-6 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-full border border-amber-200 dark:border-amber-800/50">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-medium">Funcionalidade em desenvolvimento</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
