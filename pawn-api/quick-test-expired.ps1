# Quick test for expired items endpoint

Write-Host "`nTesting Expired Items Endpoint...`n" -ForegroundColor Cyan

# Login and get token
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful`n" -ForegroundColor Green
    
    # Test expired items
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/items/expired" -Headers $headers
    
    Write-Host "✅ API Response Received`n" -ForegroundColor Green
    Write-Host "Success: $($result.success)" -ForegroundColor Yellow
    Write-Host "Message: $($result.message)" -ForegroundColor Yellow
    Write-Host "Items Count: $($result.data.Count)`n" -ForegroundColor Cyan
    
    if ($result.data.Count -gt 0) {
        Write-Host "Expired Items:" -ForegroundColor Green
        $result.data | Format-Table -Property id, ticketNumber, itemDescription, pawnerName, appraisedValue -AutoSize
    } else {
        Write-Host "No expired items returned." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
