
Write-Host "Starting all servers..."

# CLEAN UP: Kill any existing node processes to prevent port conflicts
Write-Host "Cleaning up existing processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Node.js server
$nodeProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm start" -WorkingDirectory ".\server" -PassThru

# Start Python server
# Using 'python' as it's the standard command on Windows. If you use 'python3', change this.
$pythonProcess = Start-Process -FilePath "python" -ArgumentList "api_server.py" -WorkingDirectory ".\python_analysis" -PassThru

# Start React client
$reactProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm start" -WorkingDirectory ".\client" -PassThru

Write-Host "All servers started!"
Write-Host "Node.js server (PID: $($nodeProcess.Id))"
Write-Host "Python server (PID: $($pythonProcess.Id))"
Write-Host "React client (PID: $($reactProcess.Id))"
Write-Host ""
Write-Host "Press Enter to stop all servers..."
Read-Host

Write-Host "Stopping all servers..."
taskkill /F /T /PID $nodeProcess.Id
taskkill /F /T /PID $pythonProcess.Id
taskkill /F /T /PID $reactProcess.Id

