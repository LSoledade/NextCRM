# FavaleTrainer CRM - Sistema de CRM para Personal Trainers

## 📋 Visão Geral

O **FavaleTrainer CRM** é um sistema completo de gerenciamento de relacionamento com clientes (CRM) desenvolvido especificamente para personal trainers da empresa Favale. O sistema integra funcionalidades modernas de gestão de leads, tarefas, comunicação via WhatsApp e análise de dados, proporcionando uma solução completa para profissionais de fitness.

## 🏗️ Arquitetura e Stack Tecnológica

### **Frontend**
- **Next.js 15.3.4** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **shadcn/ui** - Biblioteca de componentes UI moderna
- **Radix UI** - Componentes primitivos acessíveis
- **Framer Motion** - Animações e transições
- **Lucide React** - Ícones SVG
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### **Backend & Database**
- **Supabase** - Backend-as-a-Service (PostgreSQL + Auth + Realtime)
- **Edge Functions** - Processamento serverless
- **Row Level Security (RLS)** - Segurança a nível de linha
- **Realtime Subscriptions** - Atualizações em tempo real

### **Integrações Externas**
- **Evolution API** - Integração WhatsApp Business
- **Vercel KV** - Cache Redis
- **Papa Parse** - Processamento CSV

### **Gerenciamento de Estado**
- **React Query (TanStack Query)** - Cache e sincronização de dados
- **React Context** - Estado global de autenticação
- **React Hooks** - Estados locais e efeitos

## 🔧 Estrutura do Projeto

```
NextCRM/
├── app/                          # App Router (Next.js 13+)
│   ├── api/                      # API Routes
│   │   ├── leads/                # Gestão de leads
│   │   ├── whatsapp/             # Integração WhatsApp
│   │   └── test-evolution/       # Testes da Evolution API
│   ├── auth/                     # Páginas de autenticação
│   ├── dashboard/                # Dashboard principal
│   ├── leads/                    # Gestão de leads
│   ├── students/                 # Gestão de alunos
│   ├── tasks/                    # Gestão de tarefas
│   ├── whatsapp/                 # Interface WhatsApp
│   ├── layout.tsx                # Layout raiz
│   └── page.tsx                  # Página inicial
├── components/                   # Componentes React
│   ├── Dashboard/                # Componentes do dashboard
│   ├── Layout/                   # Layouts da aplicação
│   ├── Leads/                    # Componentes de leads
│   ├── Tasks/                    # Componentes de tarefas
│   ├── Whatsapp/                 # Componentes WhatsApp
│   └── ui/                       # Biblioteca shadcn/ui
├── contexts/                     # React Contexts
├── hooks/                        # Custom Hooks
├── lib/                          # Utilitários e serviços
├── types/                        # Definições TypeScript
├── utils/                        # Funções utilitárias
└── supabase/                     # Migrações e configurações
    └── migrations/               # Migrations SQL
```

## 🚀 Funcionalidades Principais

### **1. Gestão de Leads**

#### **Importação de Leads**
- **Importação em lote via CSV** com template pré-definido
- **Processamento assíncrono** em chunks para grandes volumes
- **Validação automática** de dados (email, telefone, status)
- **Sistema de tags** para categorização
- **Suporte a múltiplas empresas** (Favale Functional, Personal, etc.)

#### **Gestão Individual**
- **CRUD completo** com interface intuitiva
- **Status personalizáveis**: New, Contacted, Converted, Lost
- **Campos flexíveis**: nome, email, telefone, empresa, fonte, tags
- **Relacionamento com alunos** - conversão automática
- **Histórico de interações** e anotações

#### **Funcionalidades Avançadas**
- **Operações em lote**: edição e exclusão múltipla
- **Filtros avançados**: por status, empresa, data, tags
- **Busca inteligente**: nome, email, telefone
- **Exportação de dados**
- **Interface responsiva** com tabelas otimizadas

### **2. Sistema de Tarefas (Kanban)**

#### **Organização Visual**
- **Board Kanban** com colunas personalizáveis
- **Drag & Drop** para movimentação de tarefas
- **Cores por prioridade**: Low (verde), Medium (azul), High (laranja), Urgent (vermelho)
- **Cards informativos** com dados relevantes

#### **Gestão de Tarefas**
- **Prioridades configráveis**: Low, Medium, High, Urgent
- **Datas de vencimento** com alertas visuais
- **Associação com leads** para contexto
- **Estados**: To Do, In Progress, Review, Done
- **Descrições detalhadas** e anotações

#### **Produtividade**
- **Filtros por status** e prioridade
- **Notificações de prazo** e tarefas pendentes
- **Métricas de produtividade** no dashboard
- **Sincronização em tempo real** entre usuários

### **3. Integração WhatsApp Business**

#### **Configuração da Evolution API**
- **Instância dedicada "Leonardo"** auto-configurada
- **QR Code automático** para pareamento
- **Status de conexão** em tempo real
- **Webhook inteligente** para recebimento de mensagens

#### **Comunicação Integrada**
- **Chat nativo** dentro do CRM
- **Envio de mensagens** direto dos leads
- **Suporte a mídias**: imagens, vídeos, áudios, documentos
- **Histórico completo** de conversas
- **Rate limiting** inteligente (30 msg/min)

#### **Recursos Avançados**
- **Lista de conversas** com último contato
- **Indicadores de mensagens** não lidas
- **Busca em conversas** e contatos
- **Interface familiar** similar ao WhatsApp Web
- **Notificações em tempo real**

### **4. Dashboard Analítico**

#### **KPIs Principais**
- **Total de Leads** com tendência mensal
- **Taxa de Conversão** leads → alunos
- **Alunos Ativos** e crescimento
- **Tarefas Pendentes** e concluídas
- **Sessões de Treino** (ativas/concluídas)

#### **Visualizações**
- **Gráficos interativos** (Chart.js/Recharts)
- **Métricas por período** (diário, semanal, mensal)
- **Distribuição por fonte** de leads
- **Status pipeline** visual
- **Heatmap de atividades**

#### **Relatórios**
- **Performance temporal** com comparativos
- **Análise de conversão** por canal
- **Produtividade pessoal** e da equipe
- **Insights automáticos** baseados em dados

### **5. Gestão de Alunos**

#### **Conversão Automática**
- **Leads → Alunos** com um clique
- **Relacionamento bidirecional** preservado
- **Histórico mantido** durante conversão
- **Status diferenciado** na interface

#### **Acompanhamento**
- **Lista dedicada** de alunos ativos
- **Progresso individual** e metas
- **Sessões de treino** agendadas/realizadas
- **Comunicação direta** via WhatsApp

## 🗄️ Estrutura do Banco de Dados

### **Tabelas Principais**

#### **leads**
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- name (TEXT, NOT NULL)
- email (TEXT, UNIQUE)
- phone (TEXT)
- company (TEXT) -- Favale Functional, Personal, etc.
- status (TEXT) -- New, Contacted, Converted, Lost
- source (TEXT) -- Instagram, Indicação, Site, etc.
- tags (TEXT[])
- created_at, updated_at (TIMESTAMP)
```

#### **students**
```sql
- id (UUID, PK)
- lead_id (UUID, FK → leads.id)
- user_id (UUID, FK → auth.users)
- enrollment_date (DATE)
- status (TEXT) -- Active, Inactive, Suspended
- created_at, updated_at (TIMESTAMP)
```

#### **tasks**
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- title (TEXT, NOT NULL)
- description (TEXT)
- status (TEXT) -- To Do, In Progress, Review, Done
- priority (TEXT) -- Low, Medium, High, Urgent
- due_date (DATE)
- related_lead_id (UUID, FK → leads.id)
- created_at, updated_at (TIMESTAMP)
```

#### **whatsapp_connections**
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- instance_name (TEXT)
- status (TEXT) -- connecting, connected, disconnected, error
- qr_code (TEXT)
- whatsapp_user (JSONB)
- last_connected_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

#### **whatsapp_messages**
```sql
- id (UUID, PK)
- lead_id (UUID, FK → leads.id)
- user_id (UUID, FK → auth.users)
- message_content (TEXT)
- media_url (TEXT)
- media_type (TEXT)
- is_from_lead (BOOLEAN)
- message_timestamp (TIMESTAMP)
- evolution_message_id (TEXT)
- created_at (TIMESTAMP)
```

#### **training_sessions**
```sql
- id (UUID, PK)
- student_id (UUID, FK → students.id)
- user_id (UUID, FK → auth.users)
- scheduled_date (TIMESTAMP)
- actual_date (TIMESTAMP)
- status (TEXT) -- Scheduled, Completed, Cancelled, No-show
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### **Recursos de Segurança**

#### **Row Level Security (RLS)**
- **Isolamento por usuário**: cada trainer vê apenas seus dados
- **Políticas automáticas** para todas as tabelas
- **Segurança na API** e consultas diretas
- **Auditoria completa** de acessos

#### **Autenticação**
- **Supabase Auth** integrado
- **Sessions persistentes** e seguras
- **Logout automático** por inatividade
- **Recuperação de senha** por email

## 🔗 Integrações e APIs

### **Evolution API (WhatsApp)**

#### **Configuração**
```env
EVOLUTION_API_URL=https://evolution-api.domain.com
EVOLUTION_API_KEY=your-api-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=https://your-app.com/api/whatsapp/webhook
```

#### **Endpoints Utilizados**
- `GET /instance/connect/{instance}` - Conectar instância
- `POST /message/sendText/{instance}` - Enviar texto
- `POST /message/sendMedia/{instance}` - Enviar mídia
- `GET /instance/fetchInstances` - Status das instâncias
- `POST /webhook/set/{instance}` - Configurar webhook

#### **Webhook Events**
- `CONNECTION_UPDATE` - Status da conexão
- `MESSAGES_UPSERT` - Novas mensagens
- `CHATS_UPSERT` - Novos chats
- `CHATS_UPDATE` - Atualizações de chat

### **Supabase Realtime**

#### **Subscriptions Ativas**
- **whatsapp_messages**: Mensagens em tempo real
- **whatsapp_connections**: Status de conexão
- **tasks**: Atualizações de tarefas
- **leads**: Mudanças nos leads

## 🎨 Interface e UX

### **Design System**

#### **Paleta de Cores**
- **Primary**: Sistema baseado no tema escuro/claro
- **Company Colors**: 
  - Favale Functional: Verde (#22c55e)
  - Personal Training: Azul (#3b82f6)
  - FIT: Roxo (#8b5cf6)

#### **Componentes**
- **Design consistente** com shadcn/ui
- **Acessibilidade** (ARIA, contraste, keyboard navigation)
- **Responsividade** mobile-first
- **Loading states** e skeleton screens
- **Error boundaries** para estabilidade

#### **Temas**
- **Light/Dark mode** automático
- **Persistência** da preferência
- **Transições suaves** entre temas
- **Compatibilidade** com preferências do sistema

### **Navegação**

#### **Sidebar Inteligente**
- **Ícones intuitivos** com labels
- **Estados ativos** destacados
- **Contadores dinâmicos** (tarefas pendentes, mensagens)
- **Collapse/expand** para economizar espaço

#### **Breadcrumbs**
- **Navegação contextual** em páginas profundas
- **Histórico preservado** ao voltar
- **Links funcionais** para navegação rápida

## 📊 Métricas e Analytics

### **KPIs Monitorados**

#### **Vendas e Conversão**
- **Leads por período** (diário, semanal, mensal)
- **Taxa de conversão** leads → alunos
- **Tempo médio** para conversão
- **Fontes mais efetivas** de leads
- **Performance por personal trainer**

#### **Operacional**
- **Tarefas completadas** vs pendentes
- **Tempo de resposta** no WhatsApp
- **Sessões agendadas** vs realizadas
- **Taxa de no-show** dos alunos

#### **Engajamento**
- **Interações por lead** (calls, whatsapp, emails)
- **Tempo médio** de resposta
- **Satisfação** baseada em conversões
- **Retenção** de alunos

### **Relatórios Automatizados**

#### **Dashboard Executive**
- **Visão consolidada** de métricas principais
- **Comparativos** período anterior
- **Tendências** e projeções
- **Alertas** de performance

#### **Relatórios Personalizados**
- **Filtros avançados** por período, trainer, empresa
- **Exportação** PDF/CSV
- **Agendamento** de relatórios recorrentes
- **Compartilhamento** com stakeholders

## 🚀 Deploy e Infraestrutura

### **Vercel (Frontend)**
- **Deploy automático** via Git push
- **Edge Functions** para performance
- **Domain customizado** com SSL
- **Analytics** e monitoring integrados

### **Supabase (Backend)**
- **Database PostgreSQL** na nuvem
- **Automatic backups** diários
- **SSL/TLS** por padrão
- **Monitoring** de performance

### **Evolution API**
- **Self-hosted** em servidor dedicado
- **Docker containerized**
- **Reverse proxy** (Nginx)
- **Monitoring** de uptime

### **Variáveis de Ambiente**

#### **Produção**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Evolution API
EVOLUTION_API_URL=https://evolution.yourdomain.com
EVOLUTION_API_KEY=your-evolution-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=https://yourapp.vercel.app/api/whatsapp/webhook

# Redis (Opcional)
KV_URL=your-vercel-kv-url
KV_REST_API_URL=your-kv-rest-url
KV_REST_API_TOKEN=your-kv-token
```

## 🔧 Desenvolvimento Local

### **Pré-requisitos**
- Node.js 18+ 
- npm/yarn/pnpm
- Git
- Conta Supabase
- Evolution API configurada

### **Configuração**

#### **1. Clone e Instale**
```bash
git clone <repository-url>
cd NextCRM
npm install
```

#### **2. Configure Ambiente**
```bash
cp .env.example .env.local
# Configure todas as variáveis necessárias
```

#### **3. Configure Supabase**
```bash
# Execute as migrations
npx supabase db push

# Configure RLS policies
# Dados de exemplo (opcional)
npm run seed
```

#### **4. Inicie o Desenvolvimento**
```bash
npm run dev
# Aplicação disponível em http://localhost:3000
```

### **Scripts Disponíveis**
```json
{
  "dev": "next dev",                    // Desenvolvimento
  "build": "next build",                // Build de produção
  "start": "next start",                // Servidor de produção
  "lint": "next lint",                  // Linting do código
  "type-check": "tsc --noEmit"          // Verificação de tipos
}
```

## 🧪 Testes e Qualidade

### **Estratégia de Testes**
- **TypeScript** para verificação de tipos
- **ESLint** para qualidade de código
- **Prettier** para formatação consistente
- **Testes de integração** com APIs

### **Monitoramento**

#### **Performance**
- **Vercel Analytics** para métricas web
- **Core Web Vitals** monitorados
- **Error tracking** automático
- **Query performance** via React Query DevTools

#### **Logs**
- **Structured logging** com prefixos
- **Error boundaries** para captura de erros
- **API monitoring** com status codes
- **WhatsApp integration** logging detalhado

## 📈 Roadmap e Melhorias Futuras

### **Curto Prazo (1-3 meses)**
- [ ] **Notificações push** para tarefas e mensagens
- [ ] **Calendário integrado** para agendamentos
- [ ] **Templates** de mensagens WhatsApp
- [ ] **Relatórios PDF** automáticos
- [ ] **Backup/restore** de dados

### **Médio Prazo (3-6 meses)**
- [ ] **App móvel** (React Native/PWA)
- [ ] **Integração calendário** (Google Calendar)
- [ ] **Automações** de marketing
- [ ] **AI para análise** de sentimento
- [ ] **Multi-tenant** para múltiplas empresas

### **Longo Prazo (6+ meses)**
- [ ] **Pagamentos integrados** (Stripe/PagSeguro)
- [ ] **CRM avançado** com funil de vendas
- [ ] **Marketplace** de personal trainers
- [ ] **Analytics preditivos** com ML
- [ ] **Integrações** com equipamentos fitness

## 🤝 Contribuição e Suporte

### **Estrutura de Desenvolvimento**
- **Feature branches** para novas funcionalidades
- **Code review** obrigatório
- **Conventional commits** para versionamento
- **Semantic versioning** para releases

### **Documentação**
- **README.md** para setup básico
- **WHATSAPP_INTEGRATION.md** para configuração WhatsApp
- **CLAUDE.MD** (este arquivo) para visão geral
- **JSDoc** inline para funções complexas

### **Contato e Suporte**
- **Issues** no repositório para bugs
- **Discussions** para perguntas gerais
- **Wiki** com documentação adicional
- **Slack/Discord** para comunicação rápida

---

## 📝 Conclusão

O **FavaleTrainer CRM** representa uma solução moderna e completa para personal trainers, combinando as melhores práticas de desenvolvimento web com funcionalidades específicas do setor fitness. A arquitetura escalável, integração WhatsApp nativa e interface intuitiva fazem dele uma ferramenta poderosa para crescimento do negócio.

A escolha tecnológica (Next.js + Supabase + Evolution API) garante performance, segurança e facilidade de manutenção, enquanto o design system baseado em shadcn/ui proporciona uma experiência de usuário consistente e profissional.

**Versão do Documento**: 1.0  
**Última Atualização**: Julho 2025  
**Autor**: Equipe de Desenvolvimento Favale
