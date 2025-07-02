# 🔧 DIAGNÓSTICO: Mensagens WhatsApp Não Chegam

## 🎯 PROBLEMA IDENTIFICADO:
- ✅ **Mensagens enviadas funcionam** (11 mensagens enviadas registradas)
- ❌ **Mensagens recebidas não chegam** (apenas 1 mensagem recebida)
- 🔍 **O webhook não está processando mensagens recebidas**

## 📝 PASSOS PARA DIAGNÓSTICO:

### 1. **Verificar Configuração do Webhook**
```bash
# Acesse: http://localhost:3000/whatsapp/debug
# Clique em "Verificar Config"
```

### 2. **Reconfigurar Webhook se Necessário**
```bash
# No debug monitor, clique em "Reconfigurar Webhook"
# Isso vai garantir que o webhook está apontando para a URL correta
```

### 3. **Verificar Variáveis de Ambiente**
Certifique-se que estas variáveis estão configuradas:
```env
EVOLUTION_API_URL=sua_url_da_evolution_api
EVOLUTION_API_KEY=sua_chave_da_api
WHATSAPP_INSTANCE_NAME=nome_da_sua_instancia
NEXT_PUBLIC_WEBHOOK_URL=https://sua-url-publica.com/api/whatsapp/webhook
```

### 4. **Testar Webhook Manualmente**
```bash
# Use o botão "Testar Webhook" no debug monitor
# Isso simula uma mensagem recebida
```

### 5. **Verificar Logs da Evolution API**
- Acesse o painel da Evolution API
- Verifique se há erros nos logs
- Confirme se o webhook está configurado

### 6. **Verificar URL Pública**
- O webhook precisa de uma URL pública acessível
- Se estiver em desenvolvimento, use ngrok ou similar:
```bash
ngrok http 3000
# Use a URL gerada no NEXT_PUBLIC_WEBHOOK_URL
```

## 🔍 POSSÍVEIS CAUSAS:

### 1. **Webhook Não Configurado**
- Evolution API não tem webhook configurado
- URL do webhook incorreta

### 2. **URL Não Acessível**
- Webhook apontando para localhost (não funciona)
- Firewall bloqueando conexões

### 3. **Credenciais Incorretas**
- API Key incorreta
- Nome da instância incorreto

### 4. **Eventos Não Configurados**
- Webhook não está escutando evento MESSAGES_UPSERT

## ✅ VERIFICAÇÕES RÁPIDAS:

1. **Teste o debug monitor:**
   - Acesse http://localhost:3000/whatsapp/debug
   - Clique em "Verificar Config"
   - Veja se a configuração está correta

2. **Reconfigure o webhook:**
   - Clique em "Reconfigurar Webhook"
   - Verifique se retorna sucesso

3. **Teste mensagem simulada:**
   - Clique em "Testar Webhook"
   - Veja se aparece na lista de mensagens

4. **Envie mensagem real:**
   - Mande mensagem do seu telefone para o WhatsApp Business
   - Verifique se aparece nos logs

## 🚨 SOLUÇÕES MAIS COMUNS:

### **Solução 1: URL Pública**
Se estiver em desenvolvimento:
```bash
# Terminal 1: Rode o projeto
npm run dev

# Terminal 2: Exponha publicamente
ngrok http 3000

# Use a URL do ngrok em NEXT_PUBLIC_WEBHOOK_URL
```

### **Solução 2: Reconfigurar Webhook**
```bash
# No debug monitor:
# 1. Clique "Verificar Config"
# 2. Clique "Reconfigurar Webhook"
# 3. Teste com "Testar Webhook"
```

### **Solução 3: Verificar Evolution API**
- Acesse painel da Evolution API
- Vá em Webhooks
- Confirme se está configurado corretamente

## 📊 PRÓXIMOS PASSOS:

1. **Execute os diagnósticos acima**
2. **Verifique os logs no debug monitor**
3. **Configure URL pública se necessário**
4. **Teste mensagem real**
5. **Reporte resultados**

---

## 🔧 COMANDOS ÚTEIS:

```bash
# Ver logs em tempo real (no debug monitor)
# Monitorar subscription Realtime
# Verificar mensagens no banco de dados
```
