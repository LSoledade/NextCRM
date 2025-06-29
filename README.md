# FavaleTrainer CRM

[![Next.js](https://img.shields.io/badge/Next.js-13.5.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.15.3-blue)](https://mui.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Descrição

O **FavaleTrainer CRM** é uma plataforma completa de gestão de relacionamento com clientes (CRM) desenvolvida especificamente para personal trainers e academias da Favale. O sistema oferece ferramentas abrangentes para gerenciar leads, alunos, sessões de treino e tarefas administrativas, proporcionando uma visão 360° do negócio com dashboards intuitivos e KPIs em tempo real.

Esta aplicação foi construída com foco na produtividade, experiência do usuário e escalabilidade, utilizando as mais modernas tecnologias web.

## ✨ Principais Funcionalidades

### 🎯 Gestão de Leads
- **Cadastro e acompanhamento** de prospects com status personalizáveis
- **Sistema de tags** para categorização avançada
- **Filtros inteligentes** por origem, status, período e localização
- **Operações em lote** para atualização massiva de dados
- **Importação/exportação** de dados em massa
- **Pipeline visual** do funil de vendas

### 👥 Gestão de Alunos e Treinadores
- **Perfis completos** de alunos convertidos
- **Cadastro de treinadores** com especialidades
- **Relacionamento** aluno-treinador
- **Histórico completo** de interações

### 📅 Gestão de Sessões
- **Agendamento** de sessões de treino
- **Controle de status** (Agendada, Em Andamento, Concluída, Cancelada)
- **Relatórios** de produtividade por treinador
- **Calendário visual** integrado

### ✅ Sistema de Tarefas
- **Kanban board** para organização visual
- **Prioridades** e prazos personalizáveis
- **Relacionamento** com leads específicos
- **Notificações** em tempo real
- **Filtros avançados** por status e responsável

### 📊 Dashboard e Analytics
- **KPIs em tempo real** com métricas de negócio
- **Taxa de conversão** de leads
- **Gráficos interativos** de performance
- **Resumo diário** de atividades
- **Widgets personalizáveis**

### 🔐 Autenticação e Segurança
- **Login seguro** com email/senha
- **Criação de contas** simplificada
- **Row Level Security (RLS)** no banco de dados
- **Políticas de acesso** granulares
- **Sessões protegidas**

## 🛠️ Tecnologias Utilizadas

### Frontend
- **[Next.js 13.5.1](https://nextjs.org/)** - Framework React com App Router
- **[React 18.2.0](https://reactjs.org/)** - Biblioteca para interfaces de usuário
- **[TypeScript 5.2.2](https://www.typescriptlang.org/)** - Superset JavaScript com tipagem estática
- **[Material-UI (MUI) 5.15.3](https://mui.com/)** - Biblioteca de componentes React
- **[Tailwind CSS 3.3.3](https://tailwindcss.com/)** - Framework CSS utilitário
- **[Lucide React](https://lucide.dev/)** - Biblioteca de ícones

### Backend & Database
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service (BaaS)
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security (RLS)** - Segurança a nível de linha
- **Real-time subscriptions** - Atualizações em tempo real

### UI Components
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes reutilizáveis
- **[Radix UI](https://www.radix-ui.com/)** - Primitivos de UI acessíveis
- **[Emotion](https://emotion.sh/)** - CSS-in-JS

### Desenvolvimento
- **[ESLint](https://eslint.org/)** - Linter para JavaScript/TypeScript
- **[PostCSS](https://postcss.org/)** - Processador CSS
- **[Autoprefixer](https://autoprefixer.github.io/)** - Plugin PostCSS

## 🚀 Instalação

### Pré-requisitos

- **Node.js 18+** instalado
- **npm** ou **yarn** como gerenciador de pacotes
- Conta no **[Supabase](https://supabase.com/)**

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/favale-trainer-crm.git
cd favale-trainer-crm
```

### 2. Instale as dependências

```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 4. Configure o banco de dados

Execute as migrações no Supabase:

```sql
-- As migrações estão localizadas em: supabase/migrations/
-- Execute o arquivo: 20250629024718_old_field.sql
-- no SQL Editor do seu projeto Supabase
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação rodando.

## ⚙️ Configuração

### Configuração do Supabase

1. **Crie um novo projeto** no [Supabase](https://supabase.com/)
2. **Obtenha as credenciais** do projeto:
   - URL do projeto
   - Chave anônima (anon key)
3. **Configure as variáveis de ambiente** no arquivo `.env.local`
4. **Execute as migrações** do banco de dados

### Configuração de Autenticação

O sistema utiliza autenticação por email/senha do Supabase:

```typescript
// Exemplo de configuração customizada
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}
```

### Configuração de Temas

O projeto utiliza Material-UI com tema customizado:

```typescript
// lib/theme.ts - Personalização do tema
export const theme = createTheme({
  palette: {
    primary: {
      main: '#E9342E', // Vermelho Favale
    },
    secondary: {
      main: '#FF9334', // Laranja
    }
  }
});
```

## 💡 Exemplos de Uso

### Autenticação

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginExample() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Carregando...</div>;
  
  return (
    <div>
      {user ? (
        <div>
          <p>Bem-vindo, {user.email}!</p>
          <button onClick={signOut}>Logout</button>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
```

### Criação de Leads

```typescript
import { supabase } from '@/lib/supabase';

async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      status: 'New',
      source: leadData.source,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Filtragem de Dados

```typescript
// Exemplo de filtro avançado de leads
const filteredLeads = leads.filter(lead => {
  const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filters.status === '' || lead.status === filters.status;
  const matchesSource = filters.source === '' || lead.source === filters.source;
  
  return matchesSearch && matchesStatus && matchesSource;
});
```

### Operações em Tempo Real

```typescript
useEffect(() => {
  // Subscription para atualizações em tempo real
  const subscription = supabase
    .channel('tasks_realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      // Atualizar estado local
      loadTasks();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, [user]);
```

## 📚 Estrutura do Projeto

```
favale-trainer-crm/
├── app/                    # App Router do Next.js
│   ├── dashboard/          # Página do dashboard
│   ├── leads/              # Páginas de gestão de leads
│   ├── tasks/              # Páginas de gestão de tarefas
│   ├── login/              # Página de login
│   ├── layout.tsx          # Layout raiz
│   └── page.tsx            # Página inicial
├── components/             # Componentes reutilizáveis
│   ├── Layout/             # Componentes de layout
│   ├── Leads/              # Componentes específicos de leads
│   └── ui/                 # Componentes básicos (shadcn/ui)
├── contexts/               # Context APIs do React
├── lib/                    # Utilitários e configurações
├── types/                  # Definições de tipos TypeScript
├── supabase/               # Configurações e migrações
│   └── migrations/         # Scripts SQL de migração
└── public/                 # Arquivos estáticos
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Cria build de produção
npm run start        # Inicia servidor de produção

# Linting
npm run lint         # Executa ESLint
```

## 🤝 Contribuindo

Contribuições são sempre bem-vindas! Para contribuir:

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### Diretrizes de Contribuição

- **Siga** os padrões de código estabelecidos
- **Escreva** testes para novas funcionalidades
- **Documente** mudanças significativas
- **Use** conventional commits
- **Mantenha** a compatibilidade com versões anteriores

### Reportando Bugs

Ao reportar bugs, inclua:
- **Descrição clara** do problema
- **Passos** para reproduzir
- **Comportamento esperado** vs. atual
- **Screenshots** (se aplicável)
- **Informações** do ambiente (OS, navegador, etc.)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2024 FavaleTrainer CRM

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Contato e Suporte

### Equipe de Desenvolvimento

- **Email**: dev@favaletrainer.com
- **Website**: [https://favaletrainer.com](https://favaletrainer.com)
- **Documentação**: [https://docs.favaletrainer.com](https://docs.favaletrainer.com)

### Links Úteis

- **[Supabase Documentation](https://supabase.com/docs)**
- **[Next.js Documentation](https://nextjs.org/docs)**
- **[Material-UI Documentation](https://mui.com/getting-started/)**
- **[TypeScript Documentation](https://www.typescriptlang.org/docs/)**

### Suporte

Para suporte técnico ou dúvidas sobre a aplicação:

1. **Verifique** a documentação existente
2. **Procure** por issues similares no GitHub
3. **Abra** uma nova issue com detalhes do problema
4. **Entre em contato** por email para suporte urgente

---

**Desenvolvido com ❤️ pela equipe FavaleTrainer**