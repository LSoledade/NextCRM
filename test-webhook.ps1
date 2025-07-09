# Script PowerShell para testar o webhook do Chatwoot
# Execute com: powershell -ExecutionPolicy Bypass -File test-webhook.ps1

$WEBHOOK_URL = "https://next-crm-five-livid.vercel.app/api/chatwoot/webhook"

# Payload de teste simulando um evento contact_created do Chatwoot
$PAYLOAD = @'
{
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
}
'@

Write-Host "Testando webhook do Chatwoot..." -ForegroundColor Green
Write-Host "Payload: $PAYLOAD" -ForegroundColor Cyan
Write-Host ""

# Teste sem HMAC
Write-Host "Testando sem HMAC..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $WEBHOOK_URL -Method POST -Body $PAYLOAD -ContentType "application/json" -Verbose
    Write-Host "Sucesso! Resposta:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
}
catch {
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Teste concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Para testar com HMAC, configure CHATWOOT_WEBHOOK_SECRET no seu .env" -ForegroundColor Blue
Write-Host "e adicione o header x-chatwoot-hmac-sha256 com a assinatura" -ForegroundColor Blue