# Test expired items endpoint
Write-Host "Testing Expired Items Endpoint..." -ForegroundColor Cyan

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -Body (@{"username"="admin";"password"="admin123"} | ConvertTo-Json) `
    -ContentType "application/json"

$token = $loginResponse.data.token
Write-Host "✅ Logged in successfully`n" -ForegroundColor Green

# Test expired items endpoint
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/items/expired" `
        -Headers @{"Authorization"="Bearer $token"}
    
    Write-Host "✅ API call successful!`n" -ForegroundColor Green
    Write-Host "Expired Items Found: $($result.data.Count)`n" -ForegroundColor Cyan
    
    if ($result.data.Count -gt 0) {
        Write-Host "Items:" -ForegroundColor Yellow
        $result.data | Format-Table -Property id, ticketNumber, itemDescription, pawnerName, appraisedValue, loanAmount -AutoSize
    } else {
        Write-Host "No expired items found in the database.`n" -ForegroundColor Yellow
    }
    
    # Show full JSON response
    Write-Host "`nFull JSON Response:" -ForegroundColor Magenta
    $result | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
