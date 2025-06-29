'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Container,
  Stack,
  Divider,
} from '@mui/material';
import { FitnessCenter, Lock, Email } from '@mui/icons-material';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Email ou senha incorretos');
        return;
      }

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError('Erro ao criar conta: ' + error.message);
        return;
      }

      if (data.user) {
        // O perfil do usuário será criado automaticamente pelo AuthContext
        // Aguardar um momento para garantir que o processo termine
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Card variant="elevation" sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                }}
              >
                <FitnessCenter fontSize="large" />
              </Box>
              
              <Typography variant="h4" component="h1" textAlign="center">
                FavaleTrainer CRM
              </Typography>
              
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Entre com sua conta para acessar o sistema
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
                <Stack spacing={3}>
                  <TextField
                    required
                    fullWidth
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <Email sx={{ color: 'text.secondary', mr: 1 }} />
                      ),
                    }}
                  />
                  
                  <TextField
                    required
                    fullWidth
                    type="password"
                    label="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <Lock sx={{ color: 'text.secondary', mr: 1 }} />
                      ),
                    }}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ py: 1.5 }}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                  
                  <Divider>ou</Divider>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={handleSignUp}
                    disabled={loading}
                    sx={{ py: 1.5 }}
                  >
                    Criar Nova Conta
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}