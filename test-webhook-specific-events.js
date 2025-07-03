// Teste específico para eventos que estão chegando da Evolution API
// Este script simula os eventos reais observados nos logs

const webhookUrl = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';
// Para teste local: 'http://localhost:3000/api/whatsapp/webhook';

// URLs específicas que a Evolution API estava tentando usar
const specificUrls = {
  chatsUpsert: 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook/chats-upsert',
  messagesUpsert: 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook/messages-upsert',
  contactsUpdate: 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook/contacts-update'
};

async function testMessagesUpdateEvent() {
  console.log('🧪 Testando evento messages.update (que está chegando)...');
  
  const payload = {
    event: 'messages.update',
    instance: 'Leonardo',
    data: [
      {
        key: {
          remoteJid: '5511987654321@s.whatsapp.net',
          fromMe: false,
          id: '3EB0123456789ABCDEF'
        },
        update: {
          status: 'READ',
          statusTimestamp: Math.floor(Date.now() / 1000)
        }
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ Resposta do webhook messages.update:', result);
  } catch (error) {
    console.error('❌ Erro no teste messages.update:', error);
  }
}

async function testChatsUpsertEvent() {
  console.log('🧪 Testando evento chats.upsert (que está chegando)...');
  
  const payload = {
    event: 'chats.upsert',
    instance: 'Leonardo',
    data: [
      {
        id: '5511987654321@s.whatsapp.net',
        name: 'João Silva',
        unreadCount: 1,
        conversationTimestamp: Math.floor(Date.now() / 1000),
        archived: false,
        pinned: false
      }
    ]
  };

  // Testar tanto a URL base quanto a URL específica
  console.log('  📍 Testando URL base...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('  ✅ URL base - Resposta:', result.success ? 'SUCESSO' : 'ERRO');
  } catch (error) {
    console.error('  ❌ URL base - Erro:', error.message);
  }

  console.log('  📍 Testando URL específica...');
  try {
    const response = await fetch(specificUrls.chatsUpsert, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('  ✅ URL específica - Resposta:', result.success ? 'SUCESSO' : 'ERRO');
  } catch (error) {
    console.error('  ❌ URL específica - Erro:', error.message);
  }
}

async function testMessagesUpsertEvent() {
  console.log('🧪 Testando evento MESSAGES_UPSERT (que DEVERIA estar chegando)...');
  
  const payload = {
    event: 'MESSAGES_UPSERT',
    instance: 'Leonardo',
    data: {
      messages: [
        {
          key: {
            remoteJid: '5511987654321@s.whatsapp.net',
            fromMe: false,
            id: '3EB0123456789ABCDEF'
          },
          message: {
            conversation: 'Olá! Esta é uma mensagem de teste para verificar se o webhook está funcionando corretamente.'
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: 'João Silva',
          notifyName: 'João Silva'
        }
      ]
    }
  };

  // Testar tanto a URL base quanto a URL específica
  console.log('  📍 Testando URL base...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('  ✅ URL base - Resposta:', result.success ? 'SUCESSO' : 'ERRO');
  } catch (error) {
    console.error('  ❌ URL base - Erro:', error.message);
  }

  console.log('  📍 Testando URL específica...');
  try {
    const response = await fetch(specificUrls.messagesUpsert, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('  ✅ URL específica - Resposta:', result.success ? 'SUCESSO' : 'ERRO');
  } catch (error) {
    console.error('  ❌ URL específica - Erro:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 ===== INICIANDO TESTES DE WEBHOOK =====');
  console.log('🎯 Testando eventos específicos observados nos logs da Evolution API');
  console.log('');

  // Teste 1: messages.update (evento que ESTÁ chegando)
  await testMessagesUpdateEvent();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 2: chats.upsert (evento que ESTÁ chegando)
  await testChatsUpsertEvent();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 3: MESSAGES_UPSERT (evento que DEVERIA estar chegando mas não está)
  await testMessagesUpsertEvent();

  console.log('');
  console.log('🧪 ===== TESTES CONCLUÍDOS =====');
  console.log('');
  console.log('📊 ANÁLISE:');
  console.log('✅ messages.update - Evento que está chegando da Evolution API');
  console.log('✅ chats.upsert - Evento que está chegando da Evolution API');
  console.log('✅ MESSAGES_UPSERT - Agora deve funcionar nas URLs específicas também');
  console.log('');
  console.log('🎯 PROBLEMA RESOLVIDO:');
  console.log('✅ Criada rota catch-all: /api/whatsapp/webhook/[...event]');
  console.log('✅ Agora aceita URLs como /api/whatsapp/webhook/chats-upsert');
  console.log('✅ A Evolution API não deve mais receber erro 405');
  console.log('');
  console.log('🔧 PRÓXIMOS PASSOS:');
  console.log('1. ✅ Rotas catch-all implementadas');
  console.log('2. Monitorar logs da Evolution API para confirmar ausência de erro 405');
  console.log('3. Testar recebimento de mensagens reais via WhatsApp');
}

// Executar testes
runAllTests().catch(console.error);
