// Teste local para verificar as rotas catch-all
const baseUrl = 'http://localhost:3001/api/whatsapp/webhook';

// URLs que estavam falhando com 405
const problematicUrls = [
  '/chats-upsert',
  '/chats-update', 
  '/messages-upsert',
  '/contacts-update'
];

async function testCatchAllRouteLocal(endpoint, payload) {
  const url = `${baseUrl}${endpoint}`;
  console.log(`🧪 Testando localmente: ${url}`);
  
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

async function testAllProblematicUrlsLocal() {
  console.log('🧪 ===== TESTANDO ROTAS CATCH-ALL LOCALMENTE =====');
  console.log('🎯 Testando URLs que estavam gerando erro 405');
  console.log('📍 Servidor: http://localhost:3001');
  console.log('');
  
  const results = [];
  
  for (const endpoint of problematicUrls) {
    const payload = {
      event: endpoint.replace('/', '').replace('-', '.'), // /chats-upsert -> chats.upsert
      instance: 'Leonardo',
      data: {
        test: true,
        message: `Teste local para rota ${endpoint}`,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    
    const result = await testCatchAllRouteLocal(endpoint, payload);
    results.push({ endpoint, ...result });
    
    // Aguardar entre requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('');
  console.log('🧪 ===== RESULTADOS LOCAIS =====');
  
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
    console.log('🎉 ROTAS CATCH-ALL FUNCIONANDO LOCALMENTE!');
    console.log('✅ Todas as rotas catch-all estão funcionando');
    console.log('');
    console.log('🚀 PRÓXIMO PASSO: Deploy no Vercel');
    console.log('💡 Faça commit e push das mudanças para que o Vercel faça o rebuild');
  } else {
    console.log('⚠️ Ainda há problemas na implementação local');
  }
}

// Testar também rota base para comparação
async function testBaseRoute() {
  console.log('🧪 Testando rota base para comparação...');
  
  const payload = {
    event: 'test.base',
    instance: 'Leonardo',
    data: { test: true }
  };
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ Rota base funcionando:', result.success ? 'SIM' : 'NÃO');
  } catch (error) {
    console.error('❌ Erro na rota base:', error.message);
  }
}

// Executar todos os testes
async function runAllLocalTests() {
  await testBaseRoute();
  console.log('');
  await testAllProblematicUrlsLocal();
}

runAllLocalTests().catch(console.error);
