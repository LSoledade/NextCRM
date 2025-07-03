// Teste para verificar se as rotas catch-all estão funcionando
// Este script testa especificamente as URLs que estavam gerando erro 405

const baseUrl = 'https://next-crm-five-livid.vercel.app/api/whatsapp/webhook';
// Para teste local: 'http://localhost:3000/api/whatsapp/webhook';

// URLs que estavam falhando com 405
const problematicUrls = [
  '/chats-upsert',
  '/chats-update', 
  '/messages-upsert',
  '/contacts-update'
];

async function testCatchAllRoute(endpoint, payload) {
  const url = `${baseUrl}${endpoint}`;
  console.log(`🧪 Testando: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCESSO ${endpoint}:`, {
        status: response.status,
        success: result.success,
        event: result.event,
        path: result.path
      });
    } else {
      console.log(`❌ ERRO ${endpoint}:`, {
        status: response.status,
        error: result.error
      });
    }
    
    return { success: response.ok, status: response.status };
  } catch (error) {
    console.error(`💥 EXCEÇÃO ${endpoint}:`, error.message);
    return { success: false, status: 'exception' };
  }
}

async function testAllProblematicUrls() {
  console.log('🧪 ===== TESTANDO ROTAS CATCH-ALL =====');
  console.log('🎯 Testando URLs que estavam gerando erro 405');
  console.log('');
  
  const results = [];
  
  for (const endpoint of problematicUrls) {
    const payload = {
      event: endpoint.replace('/', '').replace('-', '.'), // /chats-upsert -> chats.upsert
      instance: 'Leonardo',
      data: {
        test: true,
        message: `Teste para rota ${endpoint}`,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    
    const result = await testCatchAllRoute(endpoint, payload);
    results.push({ endpoint, ...result });
    
    // Aguardar entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('🧪 ===== RESULTADOS =====');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Sucessos: ${successful.length}/${results.length}`);
  console.log(`❌ Falhas: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ URLs que funcionaram:');
    successful.forEach(r => console.log(`  - ${r.endpoint} (${r.status})`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ URLs que falharam:');
    failed.forEach(r => console.log(`  - ${r.endpoint} (${r.status})`));
  }
  
  console.log('');
  
  if (failed.length === 0) {
    console.log('🎉 PROBLEMA RESOLVIDO!');
    console.log('✅ Todas as rotas catch-all estão funcionando');
    console.log('✅ A Evolution API não deve mais receber erro 405');
  } else {
    console.log('⚠️ Ainda há problemas a resolver');
  }
}

// Função adicional para testar GET (deve retornar 405)
async function testGetMethod() {
  console.log('');
  console.log('🧪 Testando método GET (deve retornar 405)...');
  
  try {
    const response = await fetch(`${baseUrl}/chats-upsert`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (response.status === 405) {
      console.log('✅ GET corretamente rejeitado com 405:', result.message);
    } else {
      console.log('❌ GET não rejeitado como esperado:', response.status);
    }
  } catch (error) {
    console.error('💥 Erro no teste GET:', error.message);
  }
}

// Executar todos os testes
async function runAllTests() {
  await testAllProblematicUrls();
  await testGetMethod();
  
  console.log('');
  console.log('🔧 PRÓXIMOS PASSOS:');
  console.log('1. Se todos os testes passaram, a Evolution API deve parar de gerar erro 405');
  console.log('2. Monitore os logs da Evolution API para confirmar');
  console.log('3. Teste enviar uma mensagem real via WhatsApp');
}

runAllTests().catch(console.error);
