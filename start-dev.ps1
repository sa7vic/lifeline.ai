$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd `"$backendDir`"; .\venv\Scripts\Activate.ps1; python app.py"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd `"$frontendDir`"; npm run dev"
