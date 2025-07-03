// Teste específico para simular o fluxo completo de uma mensagem recebida
// Este script testa exatamente o que acontece quando alguém envia uma mensagem real

const webhookUrl = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';

async function testRealMessageReceived() {
  console.log('📱 Simulando mensagem REAL recebida...');
  console.log('🎯 Cenário: Alguém envia "Oi, tudo bem?" para o WhatsApp');
  console.log('');

  // Payload exatamente como a Evolution API enviaria com webhookByEvents = true
  const payload = {
    event: 'MESSAGES_UPSERT',
    instance: 'Leonardo',
    data: {
      messages: [
        {
          key: {
            remoteJid: '5511951362804@s.whatsapp.net', // Número real dos logs
            fromMe: false,
            id: '3EB0' + Date.now().toString(16).toUpperCase() // ID único
          },
          message: {
            conversation: 'Oi, tudo bem? Preciso de informações sobre os cursos.'
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: 'Cliente Teste',
          notifyName: 'Cliente Teste'
        }
      ]
    },
    destination: webhookUrl,
    date_time: new Date().toISOString(),
    sender: '5511996356454@s.whatsapp.net',
    server_url: 'https://evolution-evolution-api.okkagk.easypanel.host',
    apikey: '9CB4B8CE1C30-4355-BDA5-5CF8DEB385EA'
  };

  try {
    console.log('🚀 Enviando evento MESSAGES_UPSERT...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
      console.log('📝 Resposta:', JSON.stringify(result, null, 2));
      console.log('');
      console.log('🎯 O que deve ter acontecido:');
      console.log('1. ✅ Webhook recebido no NextCRM');
      console.log('2. ✅ Mensagem salva no banco Supabase');
      console.log('3. ✅ Chat criado/atualizado no banco');
      console.log('4. ✅ Frontend deve mostrar a mensagem em tempo real');
      console.log('');
      console.log('🔍 VERIFIQUE AGORA:');
      console.log('- Acesse o WhatsApp no NextCRM');
      console.log('- Procure por uma conversa com "5511951362804"');
      console.log('- A mensagem "Oi, tudo bem? Preciso de informações sobre os cursos." deve aparecer');
      
      return true;
    } else {
      console.log('❌ Erro no webhook:', response.status, response.statusText);
      console.log('📝 Resposta:', JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return false;
  }
}

async function testMessageStatusUpdate() {
  console.log('📱 Simulando atualização de status (mensagem lida)...');
  
  const payload = {
    event: 'messages.update',
    instance: 'Leonardo',
    data: {
      messageId: 'test_message_' + Date.now(),
      keyId: '3EB0' + Date.now().toString(16).toUpperCase(),
      remoteJid: '5511951362804@s.whatsapp.net',
      fromMe: false,
      participant: '5511951362804@s.whatsapp.net',
      status: 'READ',
      pollUpdates: undefined,
      instanceId: '67bd3f5d-98b9-4876-8c10-32f9038d3c49'
    },
    destination: webhookUrl,
    date_time: new Date().toISOString(),
    sender: '5511996356454@s.whatsapp.net',
    server_url: 'https://evolution-evolution-api.okkagk.easypanel.host',
    apikey: '9CB4B8CE1C30-4355-BDA5-5CF8DEB385EA'
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
    console.log('✅ Status update processado:', result.success ? 'Sucesso' : 'Falhou');
    return result.success;
  } catch (error) {
    console.error('❌ Erro no status update:', error);
    return false;
  }
}

async function testChatUpdate() {
  console.log('📱 Simulando atualização do chat...');
  
  const payload = {
    event: 'chats.upsert',
    instance: 'Leonardo',
    data: [
      {
        remoteJid: '5511951362804@s.whatsapp.net',
        instanceId: '67bd3f5d-98b9-4876-8c10-32f9038d3c49',
        name: 'Cliente Teste',
        unreadMessages: 1
      }
    ],
    destination: webhookUrl,
    date_time: new Date().toISOString(),
    sender: '5511996356454@s.whatsapp.net',
    server_url: 'https://evolution-evolution-api.okkagk.easypanel.host',
    apikey: '9CB4B8CE1C30-4355-BDA5-5CF8DEB385EA'
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
    console.log('✅ Chat update processado:', result.success ? 'Sucesso' : 'Falhou');
    return result.success;
  } catch (error) {
    console.error('❌ Erro no chat update:', error);
    return false;
  }
}

async function runRealMessageTest() {
  console.log('🧪 ===== TESTE DE MENSAGEM REAL =====');
  console.log('🎯 Simulando o fluxo completo de uma mensagem recebida');
  console.log('📱 Cenário: Cliente envia mensagem -> Evolution API -> NextCRM');
  console.log('');

  let allSuccess = true;

  // Teste 1: Mensagem recebida (evento principal)
  console.log('🔄 PASSO 1: Mensagem recebida');
  const messageSuccess = await testRealMessageReceived();
  allSuccess = allSuccess && messageSuccess;
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 2: Atualização do chat
  console.log('🔄 PASSO 2: Chat atualizado');
  const chatSuccess = await testChatUpdate();
  allSuccess = allSuccess && chatSuccess;
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Teste 3: Status da mensagem
  console.log('🔄 PASSO 3: Status da mensagem');
  const statusSuccess = await testMessageStatusUpdate();
  allSuccess = allSuccess && statusSuccess;

  console.log('');
  console.log('🧪 ===== RESULTADO DO TESTE =====');
  
  if (allSuccess) {
    console.log('🎉 SUCESSO TOTAL! Todos os eventos foram processados!');
    console.log('');
    console.log('✅ SISTEMA FUNCIONANDO:');
    console.log('- Webhook configurado corretamente');
    console.log('- Backend processando eventos');
    console.log('- Mensagens sendo salvas no banco');
    console.log('- Frontend deve mostrar em tempo real');
    console.log('');
    console.log('🚀 PRÓXIMO PASSO:');
    console.log('Envie uma mensagem REAL para o WhatsApp e veja aparecer no NextCRM!');
  } else {
    console.log('❌ Alguns problemas detectados');
    console.log('🔧 Verifique os logs acima para detalhes');
  }

  console.log('');
  console.log('📋 DADOS DO TESTE:');
  console.log('- Número: 5511951362804');
  console.log('- Mensagem: "Oi, tudo bem? Preciso de informações sobre os cursos."');
  console.log('- Nome: Cliente Teste');
  console.log('');
  console.log('🔍 Para verificar se funcionou:');
  console.log('1. Acesse https://next-crm-five-livid.vercel.app/whatsapp');
  console.log('2. Procure pela conversa com 5511951362804');
  console.log('3. A mensagem de teste deve estar lá!');
}

// Executar teste
runRealMessageTest().catch(console.error);
