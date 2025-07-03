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
- **Evolution API** - Integração WhatsApp Business (HTTP nativo otimizado)
- **Vercel KV** - Cache Redis distribuído
- **Papa Parse** - Processamento CSV em lote

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

### **Evolution API (WhatsApp) - Integração Otimizada**

#### **Nova Arquitetura HTTP**
- **Fetch Nativo** substituindo Axios para melhor performance
- **Sistema de Retry** com backoff exponencial e jitter
- **Error Classification** - Network, API, Rate Limit errors
- **Request Timeout** configurável (padrão: 30s)
- **Circuit Breaker** para proteção contra falhas
- **Connection Pooling** para reutilização de conexões

#### **Configuração Avançada**
```env
# Core Configuration
EVOLUTION_API_URL=https://evolution-api.domain.com
EVOLUTION_API_KEY=your-api-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=https://your-app.com/api/whatsapp/webhook

# Performance Tuning (opcional)
HTTP_TIMEOUT=30000
HTTP_RETRIES=3
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=30
```

#### **Endpoints Otimizados**
- `GET /instance/fetchInstances` - Status das instâncias (com cache)
- `GET /instance/connect/{instance}` - Conectar instância (com retry)
- `POST /message/sendText/{instance}` - Enviar texto (com confirmação)
- `POST /message/sendMedia/{instance}` - Enviar mídia (upload otimizado)
- `POST /webhook/set/{instance}` - Configurar webhook (validação)
- `DELETE /instance/logout/{instance}` - Desconectar (cleanup)

#### **Webhook Events Processados**
- `CONNECTION_UPDATE` - Status da conexão com persistência
- `MESSAGES_UPSERT` - Novas mensagens com auto-criação de leads
- `MESSAGES_UPDATE` - Status de mensagens (lida/entregue)
- `MESSAGES_DELETE` - Mensagens deletadas
- `CHATS_UPSERT` - Novos chats com metadados
- `CONTACTS_UPSERT` - Atualizações de contatos
- `SEND_MESSAGE` - Confirmação de envio
- `QRCODE_UPDATED` - Novo QR Code disponível

### **Supabase Realtime**

#### **Subscriptions Ativas Otimizadas**
- **whatsapp_messages**: Mensagens em tempo real com cache invalidation
- **whatsapp_connections**: Status de conexão com persistência
- **tasks**: Atualizações de tarefas
- **leads**: Mudanças nos leads com auto-refresh

#### **Melhorias na Visibilidade de Mensagens**
- **Real-time Subscriptions**: Adicionadas em todos os componentes de chat
- **Cache Invalidation**: Invalidação automática após envio de mensagens
- **Query Refresh**: Atualização forçada após operações críticas
- **Fallback Polling**: Refresh a cada 5 segundos como backup
- **Error Recovery**: Reconexão automática em caso de falhas

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

### **Configuração de Ambiente**

#### **Variáveis de Ambiente - Desenvolvimento**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Evolution API Configuration
EVOLUTION_API_URL=https://evolution.yourdomain.com
EVOLUTION_API_KEY=your-evolution-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=http://localhost:3000/api/whatsapp/webhook

# Optional: Vercel KV for caching
KV_URL=your-vercel-kv-url
KV_REST_API_URL=your-kv-rest-url
KV_REST_API_TOKEN=your-kv-token
```

#### **Variáveis de Ambiente - Produção**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Evolution API Configuration
EVOLUTION_API_URL=https://evolution.yourdomain.com
EVOLUTION_API_KEY=your-evolution-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=https://yourapp.vercel.app/api/whatsapp/webhook

# Vercel KV for Production Caching
KV_URL=your-vercel-kv-url
KV_REST_API_URL=your-kv-rest-url
KV_REST_API_TOKEN=your-kv-token
```

#### **Configuração de Segurança**

##### **Supabase Security**
- **RLS Policies**: Habilitadas em todas as tabelas
- **User Authentication**: Supabase Auth integrado
- **API Keys**: Separação entre anon key e service role
- **Database**: SSL/TLS por padrão

##### **Evolution API Security**
- **API Key Authentication**: Chave única por instância
- **Webhook Validation**: Verificação de origem
- **Rate Limiting**: 30 mensagens/minuto
- **Instance Isolation**: Uma instância por usuário

##### **Best Practices**
```env
# NUNCA commitir no git
# Usar diferentes chaves para dev/prod
# Rotacionar chaves regularmente
# Monitorar uso de APIs
```

## 🔧 Desenvolvimento Local

### **Pré-requisitos**
- **Node.js 18+** (recomendado 18.17.0 ou superior)
- **npm/yarn/pnpm** (npm 9+ recomendado)
- **Git** para controle de versão
- **Conta Supabase** (tier gratuito suficiente para desenvolvimento)
- **Evolution API** configurada e acessível
- **Editor de código** (VS Code recomendado com extensões TypeScript)

### **Configuração Inicial**

#### **1. Clone e Instale Dependências**
```bash
git clone <repository-url>
cd NextCRM
npm install
```

#### **2. Configure Variáveis de Ambiente**
```bash
# Crie o arquivo de ambiente local
cp .env.example .env.local

# Configure as seguintes variáveis:
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Evolution API
EVOLUTION_API_URL=https://evolution.yourdomain.com
EVOLUTION_API_KEY=your-evolution-key
WHATSAPP_INSTANCE_NAME=Leonardo
NEXT_PUBLIC_WEBHOOK_URL=http://localhost:3000/api/whatsapp/webhook

# Opcional: Vercel KV (para cache)
KV_URL=your-vercel-kv-url
KV_REST_API_URL=your-kv-rest-url
KV_REST_API_TOKEN=your-kv-token
```

#### **3. Configure Supabase**
```bash
# Execute as migrations do banco de dados
npx supabase db push

# Configure as políticas RLS (Row Level Security)
# As políticas são aplicadas automaticamente via migrations

# Opcional: Adicione dados de exemplo
npm run seed  # (se disponível)
```

#### **4. Inicie o Servidor de Desenvolvimento**
```bash
npm run dev
# Aplicação disponível em http://localhost:3000
```

### **Scripts Disponíveis**
```json
{
  "dev": "next dev",          // Servidor de desenvolvimento (porta 3000)
  "build": "next build",      // Build otimizado para produção
  "start": "next start",      // Servidor de produção
  "lint": "next lint"         // Verificação de qualidade do código
}
```

### **Comandos Úteis para Desenvolvimento**

#### **Verificação de Tipos**
```bash
npx tsc --noEmit  # Verificação de tipos TypeScript
```

#### **Linting e Formatação**
```bash
npm run lint      # Verificação de regras ESLint
npm run lint:fix  # Correção automática de problemas
```

#### **Teste de Webhook (Desenvolvimento)**
```bash
# Teste de configuração do webhook
node check-webhook-config.js

# Diagnóstico completo
node diagnose-webhook.js

# Teste com mensagens reais
node test-webhook-real.js
```

## 🧪 Testes e Qualidade

### **Estratégia de Testes**

#### **Verificação de Tipos**
- **TypeScript** em modo estrito para prevenção de erros
- **Configuração rigorosa** no tsconfig.json
- **Tipos personalizados** para database e APIs
- **Validação em tempo de compilação**

#### **Qualidade de Código**
- **ESLint** com configuração Next.js
- **Prettier** para formatação consistente
- **Conventional commits** para versionamento
- **Code review** obrigatório para PRs

#### **Testes de Integração**
- **Scripts de teste** para Evolution API
- **Webhook testing** com cenários reais
- **Database migrations** testadas
- **Supabase RLS** validado

### **Ferramentas de Teste Disponíveis**

#### **Webhook Testing**
```bash
# Teste de configuração básica
node check-webhook-config.js

# Diagnóstico completo da integração
node diagnose-webhook.js

# Simulação de mensagens reais
node test-webhook-real.js

# Teste de eventos específicos
node test-webhook-specific-events.js

# Teste de rotas catch-all
node test-catch-all-routes.js
```

#### **Database Testing**
```bash
# Verificação de migrations
npx supabase db diff

# Teste de políticas RLS
npx supabase db test

# Verificação de tipos
npx supabase gen types typescript
```

### **Monitoramento e Observabilidade**

#### **Performance Monitoring**
- **Vercel Analytics** para métricas web vitais
- **Core Web Vitals** (LCP, FID, CLS) monitorados
- **React Query DevTools** para debugging
- **Next.js Built-in Analytics** para performance

#### **Error Tracking**
- **Error Boundaries** React para captura de erros
- **Structured logging** com prefixos contextuais
- **API monitoring** com status codes detalhados
- **WhatsApp integration** logging com timestamps

#### **Logs Estruturados**
```javascript
// Exemplo de logging estruturado
console.log('[WEBHOOK]', 'Message received:', {
  timestamp: new Date().toISOString(),
  messageId: data.messageId,
  from: data.from,
  type: data.type
});
```

### **Debugging e Troubleshooting**

#### **React Query DevTools**
- **Query inspection** em desenvolvimento
- **Cache invalidation** debugging
- **Network requests** monitoring
- **Mutation tracking** para operações

#### **Supabase Debugging**
- **Real-time subscriptions** monitoring
- **Database queries** performance
- **RLS policies** testing
- **Auth flow** debugging

#### **WhatsApp Integration Debug**
- **Webhook payload** inspection
- **Message flow** tracking
- **Connection status** monitoring
- **Rate limiting** verification

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

## 🛠️ Configurações e Personalizações

### **Next.js Configuration**
```javascript
// next.config.js
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,  // Para builds mais rápidos
  },
  images: {
    unoptimized: true,         // Para compatibilidade
  },
  typescript: {
    ignoreBuildErrors: false,  // Type checking habilitado
  }
};
```

### **TypeScript Configuration**
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "jsx": "preserve",
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### **Tailwind CSS Configuration**
```javascript
// tailwind.config.ts
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'favale-functional': '#22c55e',
        'personal-training': '#3b82f6',
        'fit': '#8b5cf6',
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
```

## 🤝 Contribuição e Desenvolvimento

### **Workflow de Desenvolvimento**

#### **Git Flow**
```bash
# Criar nova feature
git checkout -b feature/nova-funcionalidade

# Commits convencionais
git commit -m "feat: adicionar nova funcionalidade"
git commit -m "fix: corrigir bug no login"
git commit -m "docs: atualizar documentação"

# Push e PR
git push origin feature/nova-funcionalidade
# Criar Pull Request no GitHub
```

#### **Conventional Commits**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Alterações na documentação
- `style:` - Mudanças que não afetam o código
- `refactor:` - Refatoração de código
- `test:` - Adição ou correção de testes
- `chore:` - Tarefas de manutenção

### **Estrutura de Code Review**

#### **Checklist de Review**
- [ ] **Funcionalidade** implementada corretamente
- [ ] **Testes** adicionados quando necessário
- [ ] **TypeScript** sem erros
- [ ] **ESLint** sem warnings
- [ ] **Performance** considerada
- [ ] **Security** verificada
- [ ] **Documentação** atualizada

#### **Critérios de Qualidade**
- **Componentes** reutilizáveis e bem estruturados
- **Hooks customizados** para lógica complexa
- **Error handling** apropriado
- **Loading states** implementados
- **Responsive design** considerado

### **Documentação e Suporte**

#### **Documentação Técnica**
- **CLAUDE.MD** - Visão geral completa do projeto
- **README.md** - Setup básico e instruções
- **WHATSAPP_INTEGRATION.md** - Configuração WhatsApp
- **API.md** - Documentação das APIs
- **DEPLOYMENT.md** - Guia de deploy

#### **Inline Documentation**
```typescript
/**
 * Hook para gerenciar conexões WhatsApp
 * @returns {Object} Estado da conexão e funções de controle
 */
function useWhatsAppConnection() {
  // Implementação...
}
```

#### **Componente Documentation**
```typescript
interface LeadTableProps {
  /** Lista de leads para exibir */
  leads: Lead[];
  /** Função callback para seleção */
  onLeadSelect: (lead: Lead) => void;
  /** Habilita seleção múltipla */
  multiSelect?: boolean;
}
```

### **Suporte e Comunicação**

#### **Canais de Comunicação**
- **GitHub Issues** - Bugs e solicitações de features
- **GitHub Discussions** - Perguntas gerais e ideias
- **Pull Requests** - Code review e colaboração
- **Slack/Discord** - Comunicação rápida da equipe

#### **Processo de Suporte**
1. **Verificar** documentação existente
2. **Buscar** issues similares no GitHub
3. **Criar** issue detalhada se necessário
4. **Fornecer** logs e contexto relevante
5. **Seguir** template de issue quando disponível

## 📚 Recursos Adicionais

### **Extensões VS Code Recomendadas**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### **Snippets e Produtividade**

#### **Componente React Template**
```typescript
// rfc - React Functional Component
import React from 'react';

interface ComponentNameProps {
  // Props interface
}

const ComponentName: React.FC<ComponentNameProps> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

#### **Custom Hook Template**
```typescript
// rhook - React Hook
import { useState, useEffect } from 'react';

interface UseHookNameReturn {
  // Return type
}

function useHookName(): UseHookNameReturn {
  // Hook logic
  return {
    // Return object
  };
}

export default useHookName;
```

### **Performance Tips**

#### **React Query Configuration**
```typescript
// Configuração otimizada para produção
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### **Otimizações Next.js**
```typescript
// Dynamic imports para code splitting
const LazyComponent = dynamic(() => import('./LazyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// Image optimization
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={300}
  height={200}
  placeholder="blur"
  blurDataURL="data:image/..."
/>;
```

### **Troubleshooting Guide**

#### **Problemas Comuns**

**1. Webhook não recebe mensagens**
```bash
# Verificar configuração
node diagnose-webhook.js

# Testar conexão
curl -X POST https://your-app.com/api/whatsapp/webhook
```

**2. Erro de conexão Supabase**
```typescript
// Verificar configuração
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + '...');
```

**3. Problemas de build**
```bash
# Limpar cache
rm -rf .next
npm run build

# Verificar tipos
npx tsc --noEmit
```

---

## 📝 Conclusão

O **FavaleTrainer CRM** representa uma solução moderna e completa para personal trainers, combinando as melhores práticas de desenvolvimento web com funcionalidades específicas do setor fitness. A arquitetura escalável, integração WhatsApp nativa e interface intuitiva fazem dele uma ferramenta poderosa para crescimento do negócio.

### **Principais Diferenciais**

- **Arquitetura Moderna**: Next.js 15 + TypeScript + Supabase
- **Integração WhatsApp**: Nativa com Evolution API
- **Real-time**: Atualizações instantâneas com Supabase Realtime
- **Multi-tenant**: Isolamento seguro de dados por usuário
- **Performance**: Otimizações avançadas com React Query
- **UX/UI**: Design system consistente com shadcn/ui
- **Segurança**: RLS, autenticação robusta, validação de dados
- **Escalabilidade**: Preparado para crescimento empresarial

### **Tecnologias de Ponta**

A escolha tecnológica (Next.js + Supabase + Evolution API) garante:
- **Performance superior** com App Router e Edge Functions
- **Segurança enterprise** com Row Level Security
- **Facilidade de manutenção** com TypeScript e ESLint
- **Experiência de usuário** profissional e responsiva
- **Integração perfeita** com WhatsApp Business

### **Próximos Passos**

Para começar a usar o FavaleTrainer CRM:
1. Siga o **guia de configuração local**
2. Configure suas **variáveis de ambiente**
3. Execute as **migrations do banco**
4. Conecte sua **instância WhatsApp**
5. Importe seus **leads iniciais**

**Versão do Documento**: 2.0  
**Última Atualização**: Julho 2025  
**Autor**: Equipe de Desenvolvimento Favale  
**Revisado por**: Claude AI Assistant
