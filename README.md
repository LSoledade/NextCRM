# FavaleTrainer CRM

Sistema de CRM moderno focado em Personal Trainers, desenvolvido com Next.js, React, Supabase e TailwindCSS.

## Visão Geral
O FavaleTrainer CRM permite o gerenciamento completo de leads, alunos, tarefas, sessões e treinadores, com dashboards analíticos, operações em lote e autenticação segura.

## Funcionalidades Principais
- **Gestão de Leads:** Cadastro, edição, filtragem, visualização detalhada e operações em lote (status, origem, exclusão).
- **Gestão de Alunos:** Conversão de leads em alunos, histórico e acompanhamento.
- **Tarefas e Kanban:** Criação, edição, exclusão e movimentação de tarefas em board Kanban, com prioridades e vínculo a leads.
- **Sessões:** Agendamento e acompanhamento de sessões de treino.
- **Dashboard Analítico:** KPIs, gráficos de status, origem, conversão, tendências e atividades semanais.
- **Autenticação:** Login, cadastro e controle de acesso por usuário (admin/user) via Supabase Auth.
- **Notificações e UI Moderna:** Toasts, diálogos, temas claro/escuro, responsivo e acessível.

## Tecnologias Utilizadas
- **Next.js** (App Router, SSR, API Routes)
- **React 18**
- **Supabase** (Database, Auth, Realtime)
- **React Query** (tanstack)
- **TailwindCSS** + Radix UI (componentes acessíveis)
- **Recharts** (gráficos)
- **Zod** (validação)

## Estrutura de Pastas
- `app/` - Páginas (dashboard, leads, tasks, login, etc)
- `components/` - Componentes reutilizáveis (UI, Layout, Leads, Tasks)
- `contexts/` - Contextos globais (Auth, React Query)
- `hooks/` - Hooks customizados (mutations, analytics, realtime)
- `lib/` - Configuração do Supabase e utilitários
- `types/` - Tipos TypeScript do banco
- `supabase/` - Migrations e políticas de segurança

## Setup e Execução
1. **Pré-requisitos:** Node.js 18+, Yarn/NPM, conta no [Supabase](https://supabase.com/)
2. **Clone o repositório:**
   ```sh
   git clone <repo-url>
   cd NextCRM
   ```
3. **Instale as dependências:**
   ```sh
   npm install
   # ou
   yarn
   ```
4. **Configuração do Supabase:**
   - Crie um projeto no Supabase
   - Copie as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para um arquivo `.env.local`
   - Execute as migrations SQL em `supabase/migrations/` para criar as tabelas e políticas
5. **Inicie o projeto:**
   ```sh
   npm run dev
   # ou
   yarn dev
   ```
6. **Acesse:** [http://localhost:3000](http://localhost:3000)

## Scripts
- `dev` - Inicia o servidor Next.js em modo desenvolvimento
- `build` - Gera build de produção
- `start` - Inicia o servidor em produção
- `lint` - Lint do código

## Banco de Dados & Segurança
- **Migrations:** SQL em `supabase/migrations/` (tabelas: users, leads, trainers, students, sessions, tasks)
- **RLS:** Row Level Security habilitado em todas as tabelas
- **Políticas:** Usuário só acessa seus próprios dados

## Licença
MIT

---

> Desenvolvido por FavaleTrainer. Para dúvidas ou sugestões, abra uma issue.
