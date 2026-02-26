# Script de backup de ProyectoPost para Windows (Programador de Tareas)
# Puedes programarlo con el "Programador de Tareas" apuntando a powershell.exe -File D:\Documents\ProyectoPost\backup.ps1

$sourcePath = ".\dev.db"
$backupDir = ".\backups"

# Crea la carpeta si no existe
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$destinationFile = "$backupDir\backup_$dateStamp.db"

Write-Host "Realizando backup de SQLite..."
Copy-Item -Path $sourcePath -Destination $destinationFile -Force

Write-Host "Backup completado en $destinationFile"

# Mantenimiento: borrar backups más antiguos de 30 días
Get-ChildItem -Path $backupDir | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
