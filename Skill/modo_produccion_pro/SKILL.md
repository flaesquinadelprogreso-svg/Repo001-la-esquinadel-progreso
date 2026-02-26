# Skill: Auditoría de Producción POS (Modo Producción Pro)

Esta skill permite al agente actuar como un auditor técnico y contable experto, asegurando que el sistema sea robusto, consistente y compatible con dispositivos móviles sin degradar la experiencia de escritorio.

## Instrucciones de Uso

Cuando se active esta skill o el workflow `/modo-produccion-pro`, el agente debe aplicar rigor máximo en la revisión de los siguientes pilares:

### 1. Integridad Contable
- **Validación Cruzada:** Cada venta debe tener un movimiento de caja y un ajuste de inventario correspondiente.
- **Chequeo de Saldos:** Impedir que cualquier operación deje una cuenta en negativo sin una validación previa en el servidor.
- **Precisión del IVA:** Verificar que los cálculos de IVA no generen discrepancias de céntimos y se apliquen correctamente según si el precio es bruto o neto.

### 2. Estabilidad de Infraestructura
- **Backend vs Frontend:** Nunca confiar en cálculos realizados exclusivamente en el cliente. La lógica de dinero y stock debe residir en el servidor.
- **Persistencia:** Verificar que los cambios se reflejen en la base de datos (SQLite/PostgreSQL) y sobrevivan a un reinicio del servidor o refresh de la página.

### 3. Coexistencia Responsive (Escritorio Primero)
- **Mantener Desktop:** Queda estrictamente prohibido alterar el layout de escritorio para corregir problemas en móvil. Se deben usar modificadores de Tailwind (`sm:`, etc.) o CSS Media Queries específicos.
- **Usabilidad Móvil:** Los elementos interactivos deben ser lo suficientemente grandes para interfaces táctiles y los modales deben ajustarse al viewport.

### 4. Preparación para SaaS (Multi-tenancy)
- Las consultas a la base de datos deben estar preparadas para filtrar por un futuro `tenantId`.
- Evitar el acoplamiento excesivo entre las rutas de Express y la lógica de negocio (favorecer el uso de servicios).

## Formato de Reporte de Auditoría

Toda intervención realizada bajo esta skill debe concluir con el formato de salida definido en el workflow `modo-produccion-pro.md`.
