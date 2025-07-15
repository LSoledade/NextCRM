# Migrações Consolidadas do NextCRM

Este diretório contém as migrações consolidadas e organizadas do sistema NextCRM. As migrações foram reorganizadas por módulos funcionais para melhor manutenibilidade e compreensão.

## Estrutura das Migrações

### 01_core_schema.sql
**Esquema Principal - Tabelas fundamentais**
- `users` - Usuários do sistema com controle de acesso
- `leads` - Leads/prospects com validação de contato
- `trainers` - Instrutores/treinadores
- `students` - Estudantes vinculados aos leads
- `tasks` - Sistema de tarefas e acompanhamento
- Políticas RLS (Row Level Security) para todas as tabelas
- Funções utilitárias para administração

### 02_whatsapp_module.sql
**Módulo WhatsApp - Integração completa**
- `whatsapp_connections` - Conexões/instâncias do WhatsApp
- `whatsapp_messages` - Mensagens do WhatsApp com metadados
- Funções para gerenciamento de conexões
- Funções para histórico de conversas
- Políticas de segurança específicas
- Triggers para atualização automática

### 03_scheduling_system.sql
**Sistema de Agendamento - Funcionalidade completa**
- `trainer_availability` - Disponibilidade dos treinadores
- `appointments` - Agendamentos individuais
- `recurring_appointments` - Agendamentos recorrentes
- Funções para verificação de disponibilidade
- Funções para geração de slots disponíveis
- Funções para criação automática de agendamentos recorrentes

### 04_realtime_and_utilities.sql
**Realtime e Utilitários - Configurações finais**
- Configuração de realtime para todas as tabelas
- `notification_preferences` - Preferências de notificação
- `activity_log` - Log de atividades do sistema
- `system_settings` - Configurações do sistema
- Funções utilitárias (dashboard, limpeza, logs)
- Triggers para logging automático
- Configurações padrão do sistema

## Como Usar

### Para um novo projeto:
1. Execute as migrações na ordem numérica (01, 02, 03, 04)
2. Cada arquivo é independente e pode ser executado separadamente
3. Todas as dependências estão resolvidas na ordem correta

### Para projeto existente:
- **ATENÇÃO**: Estas migrações consolidadas substituem todas as migrações antigas
- Faça backup do banco antes de aplicar
- Verifique se não há conflitos com dados existentes

## Funcionalidades Principais

### Segurança
- Row Level Security (RLS) em todas as tabelas
- Políticas específicas para usuários e administradores
- Controle de acesso baseado em roles

### Performance
- Índices otimizados para consultas frequentes
- Constraints para integridade dos dados
- Funções eficientes para operações complexas

### Auditoria
- Log automático de atividades
- Timestamps de criação e atualização
- Rastreamento de mudanças importantes

### Realtime
- Subscrições configuradas para atualizações em tempo real
- Notificações automáticas de mudanças

## Diferenças das Migrações Antigas

### Organização
- ✅ Agrupadas por funcionalidade
- ✅ Ordem lógica de execução
- ✅ Dependências claras
- ❌ Antes: Arquivos espalhados e desorganizados

### WhatsApp
- ✅ Schema consolidado e funcional
- ✅ Políticas RLS corretas
- ✅ Funções otimizadas
- ❌ Antes: Múltiplas tentativas e rollbacks

### Manutenibilidade
- ✅ Código limpo e documentado
- ✅ Padrões consistentes
- ✅ Fácil de entender e modificar
- ❌ Antes: Código duplicado e inconsistente

## Notas Importantes

1. **Backup**: Sempre faça backup antes de aplicar migrações
2. **Ordem**: Execute sempre na ordem numérica
3. **Dependências**: Não pule migrações
4. **Teste**: Teste em ambiente de desenvolvimento primeiro
5. **Rollback**: Mantenha scripts de rollback se necessário

## Suporte

Para dúvidas ou problemas com as migrações:
1. Verifique os logs do Supabase
2. Confirme que todas as dependências foram aplicadas
3. Verifique se não há conflitos de dados existentes