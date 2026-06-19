Write-Host "====================================================" -ForegroundColor Green
Write-Host "    RUSSAW: THE TACTICAL COLLECTIVE (LOCAL RUNNER)   " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Start Express API Server in a new window
Write-Host "[+] Booting Operational API Gateway (Port 5000)..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k title RUSSAW-API && npm run dev" -WorkingDirectory "d:\projects\russaw\api"

# Start Next.js Frontend Server in a new window
Write-Host "[+] Booting Next.js Tactical UI (Port 3000)..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k title RUSSAW-WEB && npm run dev" -WorkingDirectory "d:\projects\russaw\web"

Write-Host "----------------------------------------------------" -ForegroundColor Green
Write-Host "RUSSAW services launched in separate terminals!" -ForegroundColor Green
Write-Host "  - UI Access URL:   http://localhost:3000" -ForegroundColor Green
Write-Host "  - API Gateway:     http://localhost:5000/api" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
