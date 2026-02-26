#!/bin/bash
# Script de backup de ProyectoPost para Linux / macOS (Crontab)
# Configura el crontab ejecutando: crontab -e
# Y agregando esta línea (se ejecuta a las 2 AM): 0 2 * * * /ruta/absoluta/al/proyecto/backup.sh

# Cambia al directorio donde estás guardando la base de datos
DB_FILE="./dev.db"
BACKUP_DIR="./backups"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Generar sufijo con la fecha actual (ej. 2026-02-25)
DATE=$(date +%F)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.db"

echo "Realizando copia de seguridad de la base de datos..."
cp "$DB_FILE" "$BACKUP_FILE"

# Opcional: Para mantener solo los últimos 30 días y no saturar disco:
find "$BACKUP_DIR" -type f -name "backup_*.db" -mtime +30 -exec rm {} \;

echo "Backup completado: $BACKUP_FILE"
