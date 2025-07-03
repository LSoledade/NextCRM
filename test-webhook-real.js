// Script para testar webhook com mensagem real simulada
const fetch = require('node-fetch');

const webhookUrl = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

// Simular uma mensagem real recebida de um número real
const realMessagePayload = {
  event: 'MESSAGES_UPSERT',
  instance: 'Leonardo',
  data: {
    messages: [
      {
        key: {
          remoteJid: '5511951362804@s.whatsapp.net', // Número real da Ana Luiza
          fromMe: false,
          id: 'real_message_' + Date.now(),
          participant: undefined
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Ana Luiza Real',
        notifyName: 'Ana Luiza Real',
        message: {
          conversation: 'Esta é uma mensagem REAL simulada para testar o webhook!'
        }
      }
    ]
  }
};

async function testRealWebhook() {
  try {
    console.log('🧪 Testando webhook com mensagem real simulada...');
    console.log('📨 Payload enviado:', JSON.stringify(realMessagePayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realMessagePayload)
    });
    
    const result = await response.json();
    
    console.log('📤 Status da resposta:', response.status);
    console.log('📋 Resposta do webhook:', result);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
      console.log('💡 Agora verifique se a mensagem apareceu no banco de dados');
    } else {
      console.log('❌ Erro no webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error.message);
  }
}

testRealWebhook();
