# Teste simples do webhook localmente
# Execute com: powershell -ExecutionPolicy Bypass -File test-simple-webhook.ps1

$LOCAL_URL = "http://localhost:3000/api/chatwoot/webhook"
$PROD_URL = "https://next-crm-five-livid.vercel.app/api/chatwoot/webhook"

# Payload simples
$PAYLOAD = @'
{
  "event": "contact_created",
  "data": {
    "id": 123,
    "name": "Teste",
    "email": "teste@exemplo.com",
    "phone_number": "+5511999887766"
  }
}
'@

Write-Host "Testando webhook..." -ForegroundColor Green
Write-Host "Payload: $PAYLOAD" -ForegroundColor Cyan
Write-Host ""

# Teste local primeiro
Write-Host "1. Testando localmente (localhost:3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $LOCAL_URL -Method POST -Body $PAYLOAD -ContentType "application/json" -ErrorAction Stop
    Write-Host "Local: Sucesso!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
}
catch {
    Write-Host "Local: Erro - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Local Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""

# Teste produção
Write-Host "2. Testando em producao (Vercel)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $PROD_URL -Method POST -Body $PAYLOAD -ContentType "application/json" -ErrorAction Stop
    Write-Host "Producao: Sucesso!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
}
catch {
    Write-Host "Producao: Erro - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Producao Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Teste concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Se o teste local funcionar mas o de producao falhar," -ForegroundColor Blue
Write-Host "verifique as variaveis de ambiente no Vercel:" -ForegroundColor Blue
Write-Host "- NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Blue
Write-Host "- SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Blue
Write-Host "- DEFAULT_USER_ID_FOR_LEADS" -ForegroundColor Blue