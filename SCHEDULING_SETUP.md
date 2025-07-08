# 📅 Sistema de Agendamento - Instruções de Instalação

## ⚡ Execução da Migração SQL

### 1. Acesse o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Faça login e acesse seu projeto
- Vá para **SQL Editor** no menu lateral

### 2. Execute a Migração
- Copie todo o conteúdo do arquivo `20250708000000_create_scheduling_tables.sql`
- Cole no SQL Editor do Supabase
- Clique em **Run** para executar a migração

### 3. Verificação
Após executar, verifique se as seguintes tabelas foram criadas:
- ✅ `recurring_sessions`
- ✅ `teacher_availability` 
- ✅ `teacher_absences`
- ✅ `holidays`
- ✅ `services`

## 🚀 Recursos Implementados

### 📊 Calendário Inteligente
- **Visualização completa**: Mês, Semana, Dia e Agenda
- **Eventos coloridos** por tipo:
  - 🔵 Aulas regulares
  - 🟢 Aulas recorrentes
  - 🟠 Ausências de professores
  - 🔴 Feriados
- **Navegação fluida** entre períodos
- **Interface responsiva** e moderna

### 📝 Formulário de Agendamento
- **Validação robusta** com Zod e React Hook Form
- **Seleção inteligente** de alunos e professores
- **Data e hora** com validação
- **Recorrência avançada** com seleção de dias da semana
- **Feedback visual** para o usuário

### 🔄 Gestão de Recorrência
- **RRule** para padrões complexos de repetição
- **Visualização automática** de todas as ocorrências
- **Edição** de séries recorrentes
- **Flexibilidade total** nos padrões

### 🎯 Hooks Personalizados
- **`useCalendarEvents`**: Busca e processa todos os eventos
- **`useUsers`**: Gerencia alunos e professores
- **`useAppointmentMutations`**: CRUD de agendamentos
- **Cache inteligente** com React Query

### 🔒 Segurança
- **Row Level Security (RLS)** em todas as tabelas
- **Políticas específicas** por usuário
- **Dados isolados** por empresa/usuário

### 🚀 Performance
- **Índices otimizados** para consultas rápidas
- **Cache automático** de dados
- **Lazy loading** de componentes
- **Consultas otimizadas** com joins

## 📱 Como Usar

### Acessar o Calendário
1. Vá para `/schedule` na aplicação
2. O calendário carregará automaticamente os eventos

### Criar Agendamento
1. Clique em um slot vazio no calendário
2. Preencha o formulário que abrir
3. Escolha se é recorrente ou único
4. Salve o agendamento

### Editar Agendamento
1. Clique em um evento existente
2. O formulário abrirá preenchido
3. Faça as alterações necessárias
4. Salve as mudanças

### Visualizar Diferentes Períodos
- Use os botões **Anterior/Próximo** para navegar
- Clique em **Hoje** para voltar ao período atual
- Alterne entre **Mês/Semana/Dia/Agenda** conforme necessário

## 🛠️ Próximos Passos

### Implementar
- [ ] **Edição/Exclusão** de agendamentos
- [ ] **Filtros** por aluno/professor
- [ ] **Notificações** por email/WhatsApp
- [ ] **Relatórios** de agendamentos
- [ ] **Integração** com sistema de pagamentos
- [ ] **Disponibilidade** de professores
- [ ] **Conflitos** de horários

### Melhorias
- [ ] **Drag & Drop** para reagendar
- [ ] **Visão mensal** compacta
- [ ] **Exportação** para Google Calendar
- [ ] **Lembretes** automáticos
- [ ] **Dashboard** de estatísticas

## 🎨 Customização

O sistema foi desenvolvido para ser facilmente customizável:
- **Cores** dos eventos podem ser alteradas no `eventStyleGetter`
- **Textos** são todos em português brasileiro
- **Campos** do formulário podem ser estendidos
- **Validações** são facilmente modificáveis

## 🐛 Troubleshooting

### Erro: "Cannot find module 'rrule'"
```bash
npm install rrule @types/rrule
```

### Erro: "Cannot find module use-toast"
- Verificar se o caminho está correto: `@/hooks/use-toast`

### Calendário não carrega eventos
- Verificar se as tabelas foram criadas corretamente
- Verificar se há dados nas tabelas `students` e `trainers`
- Conferir políticas RLS no Supabase

### Formulário não salva
- Verificar autenticação do usuário
- Conferir logs no console do navegador
- Verificar se o user_id está sendo passado corretamente

---

💡 **Dica**: Este sistema foi projetado para ser escalável e pode facilmente suportar múltiplas empresas, professores e tipos de serviços.
