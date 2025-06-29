import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/lib/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FavaleTrainer CRM',
  description: 'Sistema de CRM para Personal Trainers da Favale',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={outfit.className}>
        <ReactQueryProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}