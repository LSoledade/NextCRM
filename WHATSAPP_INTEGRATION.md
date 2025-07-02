# Integração WhatsApp - Evolution API

## Configuração da Instância "Leonardo"

Este CRM está configurado para usar a Evolution API self-hosted com a instância **"Leonardo"**.

### Configuração do Ambiente

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure as variáveis de ambiente no .env.local:**
   ```bash
   # Evolution API Configuration
   EVOLUTION_API_URL=https://evolution-evolution-api.okkagk.easypanel.host
   EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
   WHATSAPP_INSTANCE_NAME=Leonardo
   ```

### Como Usar

#### 1. Conexão WhatsApp
- Acesse `/whatsapp` na aplicação
- Use o componente `WhatsappConnection` para conectar seu WhatsApp
- Escaneie o QR Code que aparece na tela
- A conexão será sincronizada via Supabase Realtime

#### 2. Envio de Mensagens
O serviço oferece as seguintes funções:

**Mensagem de Texto:**
```typescript
import { sendWhatsappMessage } from '@/lib/evolution.service';

await sendWhatsappMessage(leadId, {
  to: '+5511999999999',
  body: 'Sua mensagem aqui'
});
```

**Mensagem com Mídia:**
```typescript
await sendWhatsappMessage(leadId, {
  to: '+5511999999999',
  body: 'Legenda da mídia',
  mediaUrl: 'https://example.com/file.jpg'
});
```

#### 3. Recebimento de Mensagens
- As mensagens são recebidas automaticamente via webhook
- Webhook configurado em: `/api/whatsapp/webhook`
- Mensagens são salvas na tabela `whatsapp_messages`
- Atualizações em tempo real via Supabase Realtime

### Estrutura de Arquivos

```
lib/
  evolution.service.ts          # Serviço principal da Evolution API
app/api/whatsapp/
  connection/route.ts           # API para conexão WhatsApp
  send/route.ts                 # API para envio de mensagens
  webhook/route.ts              # Webhook para receber mensagens
components/Whatsapp/
  WhatsappConnection.tsx        # Componente de conexão
  WhatsappChatList.tsx          # Lista de conversas
  WhatsappChatView.tsx          # Visualização de chat
hooks/
  useWhatsAppConnection.ts      # Hook para gerenciar conexão
```

### Funcionalidades Implementadas

✅ **Conexão WhatsApp**
- Geração e exibição de QR Code
- Status de conexão em tempo real
- Reconexão automática

✅ **Envio de Mensagens**
- Mensagens de texto
- Mensagens com mídia (imagem, vídeo, áudio, documento)
- Rate limiting (30 mensagens/minuto)
- Validação de formato de arquivo

✅ **Recebimento de Mensagens**
- Webhook automático
- Sincronização com Supabase
- Atualização em tempo real

✅ **Integração com CRM**
- Associação automática com leads
- Histórico de conversas
- Interface integrada no painel

### APIs Disponíveis

#### GET /api/whatsapp/connection
Obtém o status da conexão WhatsApp e inicializa se necessário.

#### POST /api/whatsapp/send
Envia mensagens WhatsApp.

**Payload:**
```json
{
  "leadId": "uuid-do-lead",
  "to": "+5511999999999",
  "body": "Mensagem",
  "mediaUrl": "https://optional-media-url.com/file.jpg"
}
```

#### POST /api/whatsapp/webhook
Recebe webhooks da Evolution API (configurado automaticamente).

### Monitoramento e Debug

- Todos os logs são prefixados com `[Evolution]`
- Status da conexão disponível via `useWhatsAppConnection` hook
- Erros são capturados e exibidos na interface

### Limitações

- Máximo 30 mensagens por minuto por usuário
- Arquivos de até 50MB
- Tipos de arquivo suportados: imagem, vídeo, áudio, PDF, documentos Office

### Solução de Problemas

1. **QR Code não aparece:**
   - Verifique se a Evolution API está rodando
   - Confirme as variáveis de ambiente
   - Verifique os logs do servidor

2. **Mensagens não são enviadas:**
   - Confirme se o WhatsApp está conectado
   - Verifique o formato do número de telefone
   - Confirme se não excedeu o rate limit

3. **Webhook não funciona:**
   - Verifique se a URL do webhook está acessível
   - Confirme se a Evolution API consegue fazer POST para `/api/whatsapp/webhook`
   - Verifique os logs do webhook

### Configuração da Evolution API

A instância "Leonardo" deve estar configurada na Evolution API com:
- Webhook URL: `https://seu-dominio.com/api/whatsapp/webhook`
- Webhook Events: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`
- Instance Name: `Leonardo`

## 3. Configurando o Webhook na Evolution API

O webhook é **essencial** para que o CRM receba atualizações em tempo real, como novas mensagens.

1.  Acesse o painel da sua instância da Evolution API.
2.  Vá para a seção de configurações da instância que você está usando (ex: `Leonardo`).
3.  Encontre o campo **"Webhook URL"** e configure-o de acordo com o ambiente:

    -   **Para Produção (Vercel, etc.):**
        Use a URL completa da sua aplicação, apontando para a rota de webhook.
        Exemplo: `https://seu-dominio.com/api/whatsapp/webhook`

    -   **Para Desenvolvimento Local (com `localhost`):**
        Você precisa expor sua porta local (geralmente `3000`) para a internet. Recomendamos usar o **ngrok**.
        a. Instale o [ngrok](https://ngrok.com/download).
        b. Com seu projeto Next.js rodando (`npm run dev`), execute o ngrok:
           ```bash
           ngrok http 3000
           ```
        c. O ngrok fornecerá uma URL pública (ex: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`).
        d. Use essa URL no seu webhook, adicionando o caminho da API:
           `https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/whatsapp/webhook`

4.  **Eventos do Webhook:**
    Marque os seguintes eventos para serem enviados ao seu webhook. Eles são cruciais para o funcionamento do sistema:
    -   `CONNECTION_UPDATE`
    -   `MESSAGES_UPSERT`
    -   `CHATS_UPSERT`
    -   `CHATS_UPDATE`
    -   Opcional: `APPLICATION_STARTUP` (para verificar o status na inicialização)

## 4. Testando a Integração

Após configurar as variáveis de ambiente e o webhook, vá para a página `/whatsapp` no seu CRM. Clique em "Conectar" para iniciar a instância. O status da conexão deve ser atualizado em tempo real.
