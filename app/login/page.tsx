'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert as ShadAlert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Renamed
import { Separator } from '@/components/ui/separator'; // For Divider
import { Dumbbell, Mail, LockKeyhole, AlertTriangle } from 'lucide-react'; // Replaced icons
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false); // To toggle between login and sign up messages

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (isSignUp) {
        response = await supabase.auth.signUp({ email, password });
      } else {
        response = await supabase.auth.signInWithPassword({ email, password });
      }

      const { data, error: authError } = response;

      if (authError) {
        setError(authError.message || (isSignUp ? 'Erro ao criar conta.' : 'Email ou senha incorretos.'));
        return;
      }

      if (data.user) {
        // For sign up, Supabase might send a confirmation email.
        // For login, redirect immediately.
        // The AuthContext should handle profile creation on user state change.
        if (isSignUp && data.session === null) {
            // New user, email confirmation might be required by your Supabase settings
            setError("Conta criada! Verifique seu email para confirmação antes de fazer login.");
            // Optionally clear form or redirect to a "check your email" page
        } else {
            router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-muted/40">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
              <Dumbbell className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            FavaleTrainer CRM
          </CardTitle>
          <CardDescription className="text-md">
            {isSignUp ? 'Crie sua conta para começar.' : 'Entre com sua conta para acessar o sistema.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <ShadAlert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </ShadAlert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <LockKeyhole className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={loading}>
              {loading ? (
                <svg className="w-5 h-5 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isSignUp ? 'Criar Conta' : 'Entrar'}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-card text-muted-foreground">
                Ou
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full text-lg py-6"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null); // Clear error when switching modes
            }}
            disabled={loading}
          >
            {isSignUp ? 'Já tenho uma conta' : 'Criar Nova Conta'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}