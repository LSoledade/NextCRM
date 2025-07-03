'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UserRole, ROLE_OPTIONS, ROLE_LABELS } from '@/types/roles';
import { Plus, UserCheck, Trash2, Users, Shield, Settings2, MoreVertical, Search, Filter, UserPlus, Mail, Eye, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  email?: string;
  user_metadata: {
    name?: string;
    role?: UserRole;
  };
}

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'marketing':
      return 'default';
    case 'comercial':
      return 'secondary';
    case 'financeiro':
      return 'outline';
    case 'professor':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return <Shield className="h-3 w-3" />;
    default:
      return null;
  }
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
    
    {/* Search and Filter Skeleton */}
    <div className="flex flex-col sm:flex-row gap-4">
      <Skeleton className="h-10 flex-1 max-w-sm" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Cards Skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Não foi possível carregar os usuários');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast({ 
        title: 'Erro ao carregar usuários', 
        description: 'Tente novamente em alguns instantes',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtered users based on search and role filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.user_metadata.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || user.user_metadata.role === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  // Role statistics
  const roleStats = useMemo(() => {
    const stats = users.reduce((acc, user) => {
      const role = user.user_metadata.role || 'professor';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return stats;
  }, [users]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Não foi possível criar o usuário');
      }

      toast({ 
        title: 'Usuário criado com sucesso!',
        description: `${name} foi adicionado à equipe como ${ROLE_LABELS[role as UserRole]}`
      });
      setIsDialogOpen(false);
      fetchUsers();
      event.currentTarget.reset();
      setShowPassword(false);
    } catch (error: any) {
      toast({ 
        title: 'Erro ao criar usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: UserRole, userName: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Não foi possível atualizar a função');
      }

      toast({ 
        title: 'Função atualizada!',
        description: `${userName} agora é ${ROLE_LABELS[role]}`
      });
      fetchUsers();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar função', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Não foi possível remover o usuário');
      }

      toast({ 
        title: 'Usuário removido',
        description: `${userName} foi removido da equipe`
      });
      fetchUsers();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao remover usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Equipe</h2>
            <Badge variant="secondary" className="ml-1">
              {users.length} {users.length === 1 ? 'membro' : 'membros'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie membros da equipe e suas permissões
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Novo Membro da Equipe
              </DialogTitle>
              <DialogDescription>
                Adicione um novo membro à equipe e defina suas permissões
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Digite o nome completo"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="exemplo@empresa.com"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha temporária</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    placeholder="Senha que será enviada ao usuário"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função na equipe</Label>
                  <Select name="role" defaultValue="professor">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            {role.value === 'admin' && <Shield className="h-4 w-4" />}
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Criando...' : 'Adicionar Membro'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Membros da Equipe
          </CardTitle>
          <CardDescription className="text-xs">
            Lista de todos os membros da equipe e suas respectivas funções
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium text-muted-foreground mb-1">Nenhum membro encontrado</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Adicione o primeiro membro da sua equipe
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-2" />
                Adicionar Primeiro Membro
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {user.user_metadata.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">
                        {user.user_metadata.name || 'Nome não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Select
                      value={user.user_metadata.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value as UserRole, user.user_metadata.name || user.email || 'Usuário')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              {role.value === 'admin' && <Shield className="h-4 w-4" />}
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Badge variant={getRoleBadgeVariant(user.user_metadata.role!)}>
                      {ROLE_LABELS[user.user_metadata.role!]}
                    </Badge>

                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover membro da equipe</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover <strong>{user.user_metadata.name || user.email}</strong> da equipe? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDeleteUser(user.id, user.user_metadata.name || user.email || 'Usuário')}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
