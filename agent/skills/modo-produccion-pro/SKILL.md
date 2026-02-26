---
name: modo-produccion-pro
description: Realiza una auditoría técnica y contable profunda para el sistema POS, asegurando consistencia en base de datos, lógica financiera y compatibilidad móvil sin degradar la experiencia de escritorio.
---

# Auditoría de Producción POS (Modo Producción Pro)

## Cuándo usar este skill
- Cuando se necesite validar un módulo antes de una demostración o despliegue real.
- Cuando se realicen cambios críticos en la lógica de caja, inventario o cálculos de impuestos (IVA).
- Cuando se realicen ajustes de diseño responsivo para dispositivos móviles.
- Cuando se requiera verificar la integridad de los datos en la base de datos tras una operación compleja.

## Inputs necesarios
- **Módulo o funcionalidad específica** a auditar (ej. Ventas POS, Cierre de Caja).
- **Entorno de base de datos** (SQLite/PostgreSQL).
- **Estado de aprobación** actual del diseño en escritorio.

## Workflow
1) **Diagnóstico:** Identificar riesgos críticos en consola, endpoints y lógica de negocio.
2) **Validación Contable:** Verificar que el flujo de dinero, stock e impuestos sea exacto.
3) **Verificación Responsive:** Validar visualización móvil bajo el principio de "Escritorio Intacto".
4) **Capa Técnica:** Evaluar preparación para multi-tenancy y seguridad en backend.
5) **Veredicto:** Emitir reporte final según el formato estandarizado.

## Instrucciones

### 1. Integridad Contable (Baja Libertad - Pasos Exactos)
- **Caja:** Comprobar que ninguna acción permita saldos negativos sin registro explícito.
- **Stock:** Verificar que el descuento de inventario ocurra solo al confirmar la transacción final.
- **IVA:** Validar cálculos (19%, 5%, 0%) asegurando que no se altere el total si el precio ya incluye IVA.

### 2. Coexistencia Mobile (Baja Libertad - Regla Absoluta)
- Está estrictamente prohibido modificar layouts, grids o espaciados de la versión escritorio.
- Usar únicamente clases de utilidad de Tailwind con prefijos responsive (`sm:`, `md:`, etc.).
- Verificar que los modales y tablas no rompan el flujo visual en pantallas pequeñas.

### 3. Seguridad y SaaS (Media Libertad)
- Toda lógica financiera debe ser validada en el backend.
- Las consultas de Prisma deben estar preparadas para recibir un `tenantId`.

## Output (formato exacto)

El reporte debe seguir estrictamente esta estructura Markdown:

1. **Diagnóstico (priorizado)**
   - 🔴 **Crítico:** [Descripción]
   - 🟠 **Medio:** [Descripción]
   - 🟢 **Bajo:** [Descripción]
2. **Cambios aplicados:** [Lista de acciones realizadas]
3. **Validación contable**
   - Caja: [Estado]
   - IVA: [Estado]
   - Inventario: [Estado]
4. **Validación móvil**
   - Escritorio intacto: [Sí/No]
   - Layout móvil: [Detalle]
5. **Resultado Final:** [“OK para demo” o “OK para producción real”]

## Manejo de Errores
- Si el reporte final no cumple con el formato exacto, el agente debe corregirlo antes de enviarlo.
- Ante cualquier ambigüedad en los datos contables, se debe preguntar al usuario antes de proceder con el cambio automático.
