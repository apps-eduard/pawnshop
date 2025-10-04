# PowerShell API test script
Write-Host "🔍 Testing API endpoint resolution..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "📝 Step 1: Testing login endpoint..." -ForegroundColor Yellow
    $loginData = @{
        username = "cashier1"
        password = "password123"
    } | ConvertTo-Json
    
    $headers = @{
        'Content-Type' = 'application/json'
    }
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -Headers $headers
    
    if ($loginResponse.success -and $loginResponse.token) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        $token = $loginResponse.token
        
        Write-Host "📝 Step 2: Testing transactions endpoint..." -ForegroundColor Yellow
        $authHeaders = @{
            'Authorization' = "Bearer $token"
            'Content-Type' = 'application/json'
        }
        
        $transactionsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/transactions" -Method GET -Headers $authHeaders
        
        if ($transactionsResponse.success) {
            Write-Host "✅ Transactions endpoint working!" -ForegroundColor Green
            Write-Host "📊 Response summary:" -ForegroundColor Cyan
            Write-Host "   • Success: $($transactionsResponse.success)"
            Write-Host "   • Data count: $($transactionsResponse.data.Count)"
            
            if ($transactionsResponse.data.Count -gt 0) {
                $firstTransaction = $transactionsResponse.data[0]
                Write-Host "   • Sample transaction:"
                Write-Host "     - ID: $($firstTransaction.id)"
                Write-Host "     - Number: $($firstTransaction.transactionNumber)"
                Write-Host "     - Pawner: $($firstTransaction.pawnerName)"
                Write-Host "     - Amount: $($firstTransaction.principalAmount)"
                Write-Host "     - Interest Rate: $($firstTransaction.interestRate)%"
                Write-Host "     - Status: $($firstTransaction.status)"
            }
            
            Write-Host ""
            Write-Host "🎉 SUCCESS: 500 error fixed! Recent Transactions API is working." -ForegroundColor Green
        }
        else {
            Write-Host "❌ Transactions endpoint failed" -ForegroundColor Red
            Write-Host "Response: $($transactionsResponse | ConvertTo-Json -Depth 3)"
        }
    }
    else {
        Write-Host "❌ Login failed" -ForegroundColor Red
        Write-Host "Response: $($loginResponse | ConvertTo-Json)"
    }
}
catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode)"
    }
}