// Script para verificar e configurar webhook na Evolution API
// Este script vai verificar a configuração atual e tentar identificar o problema

const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-evolution-api.okkagk.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || 'Leonardo';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function checkWebhookConfiguration() {
  try {
    console.log('🔍 ===== VERIFICANDO CONFIGURAÇÃO DO WEBHOOK =====');
    console.log('🔍 API URL:', EVOLUTION_API_URL);
    console.log('🔍 Instância:', INSTANCE_NAME);
    console.log('🔍 Webhook URL:', WEBHOOK_URL);
    console.log('');

    // 1. Verificar se a instância existe
    console.log('📋 Verificando instâncias...');
    const instancesResponse = await api.get('/instance/fetchInstances');
    const instances = instancesResponse.data;
    
    const instance = instances.find(inst => inst.name === INSTANCE_NAME);
    if (!instance) {
      console.error('❌ Instância não encontrada:', INSTANCE_NAME);
      console.log('📋 Instâncias disponíveis:', instances.map(i => i.name));
      return;
    }

    console.log('✅ Instância encontrada:', instance.name);
    console.log('🔗 Status:', instance.connectionStatus);
    console.log('');

    // 2. Verificar configuração atual do webhook
    console.log('🔧 Verificando configuração do webhook...');
    try {
      const webhookResponse = await api.get(`/webhook/find/${INSTANCE_NAME}`);
      console.log('✅ Configuração atual do webhook:');
      console.log(JSON.stringify(webhookResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️ Não foi possível obter configuração do webhook:', error.response?.data || error.message);
    }

    console.log('');

    // 3. Verificar eventos configurados
    console.log('📡 Verificando eventos configurados...');
    try {
      const eventsResponse = await api.get(`/webhook/find/${INSTANCE_NAME}`);
      const config = eventsResponse.data;
      
      if (config && config.events) {
        console.log('📡 Eventos configurados:', config.events);
        
        // Verificar se MESSAGES_UPSERT está habilitado
        if (config.events.includes('MESSAGES_UPSERT')) {
          console.log('✅ MESSAGES_UPSERT está habilitado');
        } else {
          console.log('❌ MESSAGES_UPSERT NÃO está habilitado');
          console.log('🔧 Este é provavelmente o problema!');
        }
      } else {
        console.log('⚠️ Nenhuma configuração de eventos encontrada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar eventos:', error.response?.data || error.message);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error.response?.data || error.message);
  }
}

async function configureWebhook() {
  try {
    console.log('🔧 ===== CONFIGURANDO WEBHOOK =====');
    
    const webhookConfig = {
      url: WEBHOOK_URL,
      enabled: true,
      webhookByEvents: true,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',       // ⭐ EVENTO PRINCIPAL PARA MENSAGENS RECEBIDAS
        'MESSAGES_UPDATE',
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONTACTS_UPSERT',
        'CHATS_UPSERT',
        'PRESENCE_UPDATE',
        'APPLICATION_STARTUP'
      ]
    };

    console.log('🔧 Configuração que será aplicada:');
    console.log(JSON.stringify(webhookConfig, null, 2));
    console.log('');

    const response = await api.post(`/webhook/set/${INSTANCE_NAME}`, webhookConfig);
    
    console.log('✅ Webhook configurado com sucesso!');
    console.log('📡 Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.response?.data || error.message);
  }
}

async function testWebhookConnection() {
  try {
    console.log('🧪 ===== TESTANDO CONEXÃO DO WEBHOOK =====');
    
    // Teste básico de conectividade
    const testResponse = await axios.post(WEBHOOK_URL, {
      event: 'TEST_CONNECTION',
      instance: INSTANCE_NAME,
      data: {
        message: 'Teste de conectividade do webhook'
      }
    });

    console.log('✅ Webhook acessível!');
    console.log('📡 Resposta:', testResponse.data);
    
  } catch (error) {
    console.error('❌ Webhook não acessível:', error.message);
  }
}

async function fullDiagnostic() {
  console.log('🩺 ===== DIAGNÓSTICO COMPLETO DO WEBHOOK =====');
  console.log('');

  // 1. Verificar configuração atual
  await checkWebhookConfiguration();
  
  console.log('');
  console.log('===============================================');
  console.log('');

  // 2. Testar conectividade
  await testWebhookConnection();
  
  console.log('');
  console.log('===============================================');
  console.log('');

  // 3. Reconfigurar webhook (se necessário)
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('❓ Deseja reconfigurar o webhook? (s/N): ', async (answer) => {
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
      await configureWebhook();
      console.log('');
      console.log('🔄 Aguarde alguns segundos e teste novamente...');
    }
    
    rl.close();
    
    console.log('');
    console.log('🩺 ===== DIAGNÓSTICO CONCLUÍDO =====');
    console.log('');
    console.log('📋 RESUMO:');
    console.log('1. Verificamos se a instância existe e está conectada');
    console.log('2. Verificamos a configuração atual do webhook');
    console.log('3. Testamos a conectividade do webhook');
    console.log('4. Oferecemos opção de reconfiguração');
    console.log('');
    console.log('🎯 PRÓXIMO PASSO:');
    console.log('Se o webhook foi reconfigurado, aguarde alguns minutos');
    console.log('e teste enviando uma mensagem real para o WhatsApp.');
  });
}

// Executar diagnóstico
if (require.main === module) {
  fullDiagnostic().catch(console.error);
}

module.exports = {
  checkWebhookConfiguration,
  configureWebhook,
  testWebhookConnection
};
