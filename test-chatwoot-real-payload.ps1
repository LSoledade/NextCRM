# Test script for Chatwoot webhook with real payload
$payload = @'
{
  "account": {
    "id": 1,
    "name": "Favale Físico Saúde"
  },
  "additional_attributes": {
    "city": "",
    "country": "",
    "description": "",
    "company_name": "",
    "country_code": "",
    "social_profiles": {
      "github": "",
      "twitter": "",
      "facebook": "",
      "linkedin": "",
      "instagram": ""
    }
  },
  "avatar": "http://https/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBDQT09IiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--98e18fa62168d6996ef2bd34742499890e35d372/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdCem9MWm05eWJXRjBTU0lJYW5CbkJqb0dSVlE2RTNKbGMybDZaVjkwYjE5bWFXeHNXd2RwQWZvdyIsImV4cCI6bnVsbCwicHVyIjoidmFyaWF0aW9uIn19--9775e5c17f1ef3a9fd19ae7fc01f9e6f004215fd/491885847_615930540869181_6594283192135292447_n.jpg",
  "custom_attributes": {},
  "email": null,
  "id": 2,
  "identifier": "5511951362804@s.whatsapp.net",
  "name": "Ano 🛼",
  "phone_number": "+5511951362804",
  "thumbnail": "http://https/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBDQT09IiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--98e18fa62168d6996ef2bd34742499890e35d372/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdCem9MWm05eWJXRjBTU0lJYW5CbkJqb0dSVlE2RTNKbGMybDZaVjkwYjE5bWFXeHNXd2RwQWZvdyIsImV4cCI6bnVsbCwicHVyIjoidmFyaWF0aW9uIn19--9775e5c17f1ef3a9fd19ae7fc01f9e6f004215fd/491885847_615930540869181_6594283192135292447_n.jpg",
  "blocked": false,
  "event": "contact_updated",
  "changed_attributes": [
    {
      "name": {
        "previous_value": "Ane 🛼",
        "current_value": "Ano 🛼"
      }
    },
    {
      "updated_at": {
        "previous_value": "2025-07-09T14:07:39.926Z",
        "current_value": "2025-07-09T14:12:24.859Z"
      }
    }
  ]
}
'@

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/chatwoot/webhook" -Method POST -Body $payload -ContentType "application/json"
    $statusMessage = if ($response.message) { $response.message } else { "OK" }
    Write-Host "✅ Success! Status: $statusMessage"
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}