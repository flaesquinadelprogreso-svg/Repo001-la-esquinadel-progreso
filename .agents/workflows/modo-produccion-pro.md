---
name: modo-produccion-pro
description: Auditoría completa para app POS en entorno productivo. Valida consistencia contable, funcionamiento real, versión móvil SIN afectar escritorio, y checklist técnico antes de publicar.
---

# 🛡️ MODO PRODUCCIÓN PRO (POS + CONTABLE + MOBILE SAFE)

## 🎯 CUÁNDO USAR
- Antes de mostrar al cliente.
- Antes de subir a servidor.
- Después de cambios en caja, ventas, inventario o IVA.
- Cuando se hagan ajustes responsive.
- Antes de grabar demo.

## 📥 INPUTS NECESARIOS
- **Módulo a revisar.**
- **Objetivo:** “Lista para demo” o “Lista para producción real”.
- **Motor DB actual** (SQLite o PostgreSQL).
- **Confirmar si escritorio ya está aprobado.**

## ✅ CHECKLIST OBLIGATORIO (ORDEN FIJO)

### A) FUNCIONAMIENTO REAL
1. No errores en consola.
2. No endpoints rotos.
3. No doble ejecución de acciones.
4. Validaciones en backend.
5. Persistencia real en base de datos.
6. No estados inconsistentes después de refresh.

### B) VALIDACIÓN CONTABLE (CRÍTICO)
1. **Caja:** Nunca negativa sin movimiento registrado. El cierre coincide con ventas reales.
2. **IVA:** Permite 19 / 5 / 0. No altera total si el precio ya incluye IVA. Calculado sobre base correcta.
3. **Inventario:** Descuenta solo al confirmar venta. No permite stock negativo.
4. **Consistencia:** No hay descuadre entre Ventas, Caja e Inventario.

### C) RESPONSIVE (MOBILE SAFE) - REGLA ABSOLUTA
> [!IMPORTANT]
> La versión escritorio **NO** puede cambiar visualmente.
- Ajustes solo con clases responsive (`sm:`, `md:`, `lg:`).
- No modificar layout base, grid o flex principal validado.
- No alterar espaciados o tamaños desktop aprobados.
- Validaciones mobile: No scroll horizontal, botones clickeables, modales visibles completos, sidebar no tapa contenido.

### D) CONSISTENCIA SaaS FUTURA
- No lógica crítica dentro de rutas Express (preparado para Capa Service).
- Prisma preparado para `tenantId`.

### E) SEGURIDAD BÁSICA
- No cálculos financieros solo en frontend. Validaciones obligatorias en backend.

## 🔄 WORKFLOW
1. **Diagnóstico** priorizado (máximo 10 puntos).
2. **Riesgo** contable detectado.
3. **Plan de corrección** (máximo 8 acciones).
4. **Aplicar** cambios mínimos necesarios.
5. **Validar** checklist completo.
6. **Veredicto final.**

## 📤 OUTPUT OBLIGATORIO
Responder SIEMPRE en este formato:
1. **Diagnóstico (priorizado)**: 🔴 Crítico, 🟠 Medio, 🟢 Bajo.
2. **Cambios aplicados**: Lista de cambios.
3. **Validación contable**: Resultado para Caja, IVA, Inventario, Reportes.
4. **Validación móvil**: Escritorio intacto (Sí/No), Layout, Botones, Tablas, Modales.
5. **Resultado Final**: “OK para demo” o “OK para producción real”.
