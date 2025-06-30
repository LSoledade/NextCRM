import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { ThemeProvider } from '@/components/theme-provider';

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ReactQueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}