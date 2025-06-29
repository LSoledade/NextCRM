import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
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
            <AuthProvider>
              {children}
            </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}