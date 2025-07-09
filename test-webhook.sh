#!/bin/bash

# Script para testar o webhook do Chatwoot
# Execute com: bash test-webhook.sh

WEBHOOK_URL="http://localhost:3000/api/chatwoot/webhook"

# Payload de teste simulando um evento contact_created do Chatwoot
PAYLOAD='{
  "event": "contact_created",
  "data": {
    "id": 123,
    "name": "João Silva",
    "email": "joao.silva@exemplo.com",
    "phone_number": "+5511999887766",
    "identifier": "chatwoot_123",
    "custom_attributes": {
      "company": "Empresa Teste",
      "position": "Gerente"
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
}'

echo "🚀 Testando webhook do Chatwoot..."
echo "📦 Payload: $PAYLOAD"
echo ""

# Teste sem HMAC
echo "🔓 Testando sem HMAC..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "✅ Teste concluído!"
echo ""
echo "💡 Para testar com HMAC, configure CHATWOOT_WEBHOOK_SECRET no seu .env"
echo "   e adicione o header: -H 'x-chatwoot-hmac-sha256: <signature>'"