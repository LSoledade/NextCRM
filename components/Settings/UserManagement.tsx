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
  <div className="space-y-10">
    {/* Header Skeleton */}
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full max-w-3xl" />
      </div>
      <Skeleton className="h-12 w-48" />
    </div>
    
    {/* Search and Filter Skeleton */}
    <div className="flex flex-col sm:flex-row gap-6">
      <Skeleton className="h-12 flex-1 max-w-md" />
      <Skeleton className="h-12 w-48" />
    </div>
    
    {/* Team Stats Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
    
    {/* Main Card Skeleton */}
    <Card>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-8">
              <div className="flex items-center space-x-6">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-10 w-10" />
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
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
            {users.length} {users.length === 1 ? 'membro' : 'membros'}
          </Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-3 h-12 px-8 text-base">
              <UserPlus className="h-5 w-5" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="space-y-4 pb-4">
              <DialogTitle className="flex items-center gap-4 text-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                Novo Membro da Equipe
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                Adicione um novo membro à equipe e defina suas permissões de acesso ao sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-8">
              <div className="grid gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-medium">Nome completo</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="Digite o nome completo"
                      className="h-12 text-base"
                      required 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-base font-medium">E-mail</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      placeholder="exemplo@empresa.com"
                      className="h-12 text-base"
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-base font-medium">Senha temporária</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha que será enviada ao usuário"
                      className="h-12 pr-12 text-base"
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="role" className="text-base font-medium">Função na equipe</Label>
                  <Select name="role" defaultValue="professor">
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="py-4">
                          <div className="flex items-center gap-4">
                            {role.value === 'admin' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                                <Shield className="h-4 w-4 text-destructive" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-base">{role.label}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {role.value === 'admin' && 'Acesso total ao sistema'}
                                {role.value === 'marketing' && 'Gestão de campanhas e leads'}
                                {role.value === 'comercial' && 'Gestão de vendas e propostas'}
                                {role.value === 'financeiro' && 'Gestão financeira e relatórios'}
                                {role.value === 'professor' && 'Acesso básico do sistema'}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-4 sm:gap-0 pt-6">
                <DialogClose asChild>
                  <Button variant="outline" className="h-12 px-8 text-base">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating} className="h-12 px-8 text-base">
                  {isCreating ? (
                    <>
                      <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-3 h-5 w-5" />
                      Adicionar Membro
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-48 h-12 text-base">
            <Filter className="mr-3 h-5 w-5" />
            <SelectValue placeholder="Filtrar por função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="py-3">Todas as funções</SelectItem>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role.value} value={role.value} className="py-3">
                <div className="flex items-center gap-3">
                  {role.value === 'admin' && <Shield className="h-4 w-4" />}
                  {role.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Statistics */}
      {users.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLE_OPTIONS.map((role) => {
            const count = roleStats[role.value] || 0;
            return (
              <Card key={role.value} className={`p-6 transition-colors ${count > 0 ? 'bg-card' : 'bg-muted/30'}`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    role.value === 'admin' ? 'bg-destructive/10' : 'bg-primary/10'
                  }`}>
                    {role.value === 'admin' ? (
                      <Shield className="h-5 w-5 text-destructive" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${count === 0 ? 'text-muted-foreground' : ''}`}>
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{role.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Users List */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Settings2 className="h-6 w-6" />
                Membros da Equipe
                {filteredUsers.length !== users.length && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {filteredUsers.length} de {users.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-base">
                {searchTerm || selectedRole !== 'all' 
                  ? `Mostrando ${filteredUsers.length} membro${filteredUsers.length !== 1 ? 's' : ''} encontrado${filteredUsers.length !== 1 ? 's' : ''}`
                  : `Lista completa de ${users.length} membro${users.length !== 1 ? 's' : ''} da equipe`
                }
              </CardDescription>
            </div>
            {(searchTerm || selectedRole !== 'all') && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-4"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              {searchTerm || selectedRole !== 'all' ? (
                <>
                  <Search className="h-16 w-16 text-muted-foreground mb-6" />
                  <h3 className="text-xl font-medium text-muted-foreground mb-3">
                    Nenhum membro encontrado
                  </h3>
                  <p className="text-base text-muted-foreground mb-6 max-w-md">
                    Não encontramos membros que correspondem aos filtros aplicados
                  </p>
                  <Button 
                    variant="outline" 
                    className="h-12 px-6"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedRole('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 mb-6">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium text-muted-foreground mb-3">
                    Nenhum membro cadastrado
                  </h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-md">
                    Adicione o primeiro membro da sua equipe para começar a gerenciar permissões
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} className="gap-3 h-12 px-6">
                    <UserPlus className="h-5 w-5" />
                    Adicionar Primeiro Membro
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-8 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-6">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                      <span className="text-base font-semibold text-primary">
                        {user.user_metadata.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-base">
                        {user.user_metadata.name || 'Nome não informado'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-base text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Select
                      value={user.user_metadata.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value as UserRole, user.user_metadata.name || user.email || 'Usuário')}
                    >
                      <SelectTrigger className="w-40 h-10 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.value} value={role.value} className="py-3">
                            <div className="flex items-center gap-3">
                              {role.value === 'admin' && <Shield className="h-4 w-4 text-destructive" />}
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Badge 
                      variant={getRoleBadgeVariant(user.user_metadata.role!)}
                      className="gap-2 font-medium px-3 py-1 text-sm"
                    >
                      {getRoleIcon(user.user_metadata.role!)}
                      {ROLE_LABELS[user.user_metadata.role!]}
                    </Badge>

                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="px-4 py-3">Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive px-4 py-3">
                              <Trash2 className="h-4 w-4 mr-3" />
                              Remover da equipe
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <AlertDialogContent className="sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">Remover membro da equipe</AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Tem certeza que deseja remover <strong>{user.user_metadata.name || user.email}</strong> da equipe? 
                            Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3 sm:gap-0">
                          <AlertDialogCancel className="h-11 px-6">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 h-11 px-6"
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
