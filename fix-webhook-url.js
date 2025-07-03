// Script para corrigir a configuração do webhook após ativar "webhook by events"
// A Evolution API está tentando usar URLs específicas, mas precisamos da URL genérica

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-evolution-api.okkagk.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '9CB4B8CE1C30-4355-BDA5-5CF8DEB385EA';
const INSTANCE_NAME = 'Leonardo';
const WEBHOOK_URL = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

async function getCurrentWebhookConfig() {
  console.log('🔍 Verificando configuração atual do webhook...');
  
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/webhook/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const config = await response.json();
      console.log('✅ Configuração atual:', JSON.stringify(config, null, 2));
      return config;
    } else {
      console.log('❌ Erro ao buscar configuração:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return null;
  }
}

async function fixWebhookConfig() {
  console.log('🔧 Corrigindo configuração do webhook...');
  
  const webhookConfig = {
    url: WEBHOOK_URL,
    webhookByEvents: true,  // Manter ativado para receber eventos específicos
    webhookBase64: false,
    events: [
      'APPLICATION_STARTUP',
      'QRCODE_UPDATED',
      'MESSAGES_SET',
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'SEND_MESSAGE',
      'CONTACTS_SET',
      'CONTACTS_UPSERT',
      'CONTACTS_UPDATE',
      'PRESENCE_UPDATE',
      'CHATS_SET',
      'CHATS_UPSERT',
      'CHATS_UPDATE',
      'CHATS_DELETE',
      'GROUPS_UPSERT',
      'GROUP_UPDATE',
      'GROUP_PARTICIPANTS_UPDATE',
      'CONNECTION_UPDATE'
    ]
  };

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook configurado com sucesso!');
      console.log('📝 Nova configuração:', JSON.stringify(result, null, 2));
      return true;
    } else {
      console.log('❌ Erro ao configurar webhook:', response.status, response.statusText);
      console.log('📝 Resposta:', JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 ===== CORRIGINDO CONFIGURAÇÃO DO WEBHOOK =====');
  console.log('');
  console.log('🎯 PROBLEMA IDENTIFICADO:');
  console.log('A Evolution API está tentando enviar para URLs específicas como:');
  console.log('- /api/whatsapp/webhook/messages-upsert');
  console.log('- /api/whatsapp/webhook/contacts-update');
  console.log('- /api/whatsapp/webhook/chats-update');
  console.log('');
  console.log('💡 SOLUÇÃO:');
  console.log('Configurar o webhook para usar a URL genérica:');
  console.log('- /api/whatsapp/webhook (que já existe e funciona)');
  console.log('');

  // Verificar configuração atual
  await getCurrentWebhookConfig();
  console.log('');

  // Corrigir configuração
  const success = await fixWebhookConfig();
  
  console.log('');
  console.log('🧪 ===== RESULTADO =====');
  
  if (success) {
    console.log('✅ Configuração corrigida com sucesso!');
    console.log('');
    console.log('📋 O que foi feito:');
    console.log('✅ webhookByEvents: true (mantido ativado)');
    console.log('✅ URL: https://next-crm-five-livid.vercel.app/api/whatsapp/webhook');
    console.log('✅ Eventos: Todos os eventos importantes habilitados');
    console.log('');
    console.log('🧪 PRÓXIMO PASSO:');
    console.log('Envie uma mensagem real para o WhatsApp e ela deve aparecer no NextCRM!');
  } else {
    console.log('❌ Falha ao corrigir configuração');
    console.log('');
    console.log('🔧 AÇÃO MANUAL NECESSÁRIA:');
    console.log('No painel da Evolution API, configure:');
    console.log('- URL: https://next-crm-five-livid.vercel.app/api/whatsapp/webhook');
    console.log('- Webhook by Events: ✅ Ativado');
    console.log('- Eventos: Todos marcados (especialmente MESSAGES_UPSERT)');
  }
}

// Executar correção
main().catch(console.error);
