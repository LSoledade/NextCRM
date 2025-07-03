// Script para verificar e configurar webhook da Evolution API
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'SUA_URL_EVOLUTION_API';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'SUA_API_KEY';
const INSTANCE_NAME = 'Leonardo';
const WEBHOOK_URL = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function checkAndConfigureWebhook() {
  try {
    console.log('🔍 Verificando configuração atual do webhook...');
    
    // 1. Verificar se a instância existe
    console.log('📋 Buscando instâncias...');
    const instancesResponse = await api.get('/instance/fetchInstances');
    const instances = instancesResponse.data;
    
    const instance = instances.find(inst => inst.name === INSTANCE_NAME);
    if (!instance) {
      console.error(`❌ Instância ${INSTANCE_NAME} não encontrada!`);
      return;
    }
    
    console.log(`✅ Instância ${INSTANCE_NAME} encontrada`);
    console.log('📊 Status da instância:', instance.connectionStatus);
    
    // 2. Verificar webhook atual
    console.log('🔗 Verificando webhook atual...');
    try {
      const webhookResponse = await api.get(`/webhook/find/${INSTANCE_NAME}`);
      console.log('📋 Webhook atual:', JSON.stringify(webhookResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️ Nenhum webhook configurado ou erro ao buscar');
    }
    
    // 3. Configurar webhook
    console.log('🔧 Configurando webhook...');
    const webhookConfig = {
      url: WEBHOOK_URL,
      enabled: true,
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE', 
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONTACTS_UPSERT',
        'CHATS_UPSERT',
        'PRESENCE_UPDATE'
      ]
    };
    
    const setWebhookResponse = await api.post(`/webhook/set/${INSTANCE_NAME}`, webhookConfig);
    console.log('✅ Webhook configurado:', setWebhookResponse.data);
    
    // 4. Testar webhook
    console.log('🧪 Testando webhook...');
    const testResponse = await axios.post(WEBHOOK_URL, {
      event: 'TEST',
      instance: INSTANCE_NAME,
      data: { message: 'Teste de conectividade do webhook' }
    });
    
    console.log('✅ Teste do webhook bem-sucedido:', testResponse.status);
    
    console.log('🎉 Configuração do webhook concluída!');
    console.log('💡 Agora envie uma mensagem real para testar');
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.response?.data || error.message);
  }
}

checkAndConfigureWebhook();
