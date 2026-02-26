---
name: Sistema de Diseño y Patrones del Proyecto
description: Define los colores, fuentes, estilos, componentes UI, y convenciones de código (ej. moneda) utilizados en ProyectoPost para mantener consistencia en nuevos módulos.
---

# Sistema de Diseño y Patrones de Construcción (ProyectoPost)

Este documento centraliza los lineamientos de diseño y las convenciones de código que deben seguirse estrictamente al desarrollar o refactorizar módulos existentes dentro del sistema **ProyectoPost**. Su propósito es garantizar una experiencia de usuario altamente cohesiva y un código mantenible.

## 1. Paleta de Colores Oficial

El proyecto utiliza una paleta de colores limpia, profesional y moderna, fuertemente inspirada en interfaces SaaS de gestión financiera e inventario.

### Colores Base (Estructura y Textos)
- **Fondo Principal de la App (Background):** `#F3F4F6` (Gris muy claro azulado)
- **Fondo de Tarjetas/Paneles (Surface):** `#FFFFFF` (Blanco puro)
- **Texto Principal (Encabezados, Títulos):** `#1A1A2E` o `#111827` (Azul oscuro casi negro / Gris oscuro)
- **Texto Secundario (Descripciones, Labels):** `#6B7280` (Gris medio)
- **Texto Terciario (Mutado / Placeholders):** `#9CA3AF` (Gris claro)
- **Bordes y Divisores (Borders / Dividers):** `#E5E7EB` o `#E2E5EA`
- **Hover en filas de tablas:** `#F9FAFB` o `#F3F4F6`

### Colores de Acento y Marca
- **Azul Primario (Botones principales, Headers clave):** `#1E3A5F` (Azul corporativo) o `#1D4ED8` / `#3B82F6` (Para acciones interactivas)
- **Hover Azul Primario:** `#1E2D5A` (Sobre #1E3A5F)

### Colores Semánticos (Estados)
- **Éxito (Success / Ingresos):**
  - Texto/Icono: `#16A34A` o `#15803D`
  - Fondo (Badge suave): `#DCFCE7`
- **Error / Peligro / Salidas (Danger / Outflow):**
  - Texto/Icono: `#EF4444` o `#DC2626`
  - Fondo (Badge suave): `#FEE2E2` o `#FEF2F2`
- **Advertencia / Stock Bajo (Warning):**
  - Texto/Icono: `#D97706` o `#F59E0B`
  - Fondo (Badge suave): `#FEF3C7`
- **Información / Neutro (Info):**
  - Fondo (Badge suave): `#EBF0F7` o `#EFF6FF`
  - Texto: `#1E3A5F` o `#3B82F6`

---

## 2. Tipografía y Espaciado

- **Fuente:** Se asume una fuente sans-serif moderna nativa del sistema o `Inter` (importada implícitamente).
- **Tamaños Comunes:**
  - `24px` / `22px`: Títulos principales de páginas (h1). Font-weight: `600` o `700`.
  - `14px` / `15px`: Texto principal de cuerpo y celdas de tabla.
  - `13px`: Labels de formularios, subtítulos secundarios.
  - `12px` / `11px`: Notas, placeholder, encabezados de tabla (th) usualmente en `uppercase`.
- **Border Radius (Redondeo):**
  - Botones, Inputs, Selects: `4px` o `6px`.
  - Tarjetas y Contenedores Mayores: `8px` o `12px`.
- **Sombras (Box Shadow):**
  - Modales: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
  - Cards genéricas: `0 1px 3px rgba(0,0,0,0.1)`

---

## 3. Componentes UI (Reutilización Estricta)

Siempre que sea posible, se deben importar y usar los componentes base ubicados en `src/components/ui/` en lugar de crear etiquetas HTML nativas con estilos en línea repetidos.

### `Button` (`src/components/ui/Button.jsx`)
Botón estandarizado. Soporta icono (`<Icon />` de lucide-react).
**Variantes (`variant` prop):**
- `primary` (Por defecto): Fondo azul oscuro (`#1E3A5F`). Para la acción principal (ej. "Guardar", "Crear").
- `secondary`: Fondo blanco, texto gris, borde. Para cancelar, regresar.
- `danger`: Fondo rojo. Para eliminar.
- `success`: Fondo verde. Para acciones exitosas.
- `ghost`: Sin fondo, texto gris.
- `outline`: Borde azul.

### `Input` y `Select` (`src/components/ui/Input.jsx`, `src/components/ui/Select.jsx`)
Inputs estructurados con label superior (11px, bold, uppercase, gris), icono opcional y contenedor de errores. El borde nativo es `#E5E7EB`.
- *Uso obligatorio en formularios nuevos para mantener la alienación.*

### `Modal` (`src/components/ui/Modal.jsx`)
Maneja el oscuro de fondo (backdrop) de forma centrada (`z-index: 50`).
- Usar las props `isOpen`, `onClose`, y `title`.
- Soporta anchos máximos medidos mediante `size="sm"` (400px), `md` (600px - por defecto), `lg` (900px), `xl` (1100px).

### `Card` (`src/components/ui/Card.jsx`)
Para envolver contenedores blancos. Contiene props opcionales de métricas (ej. `label`, `value`, `icon`).

### `Badge` (`src/components/ui/Badge.jsx`)
Pastillas de colores para estados. Variantes: `success`, `danger`, `warning`, `info`, `neutral`, `primary`.

---

## 4. Patrones de Desarrollo y Lógica

### Formato de Moneda (Estricto)
**NUNCA** construya strings de moneda manualmente (ej. `'$ ' + valor`).
- **Importación Obligatoria:** `import { formatPesos, handleCurrencyChange } from '../utils/currency';`
- **Visualización (Lectura):** Use `{formatPesos(cantidad)}` (ej. Muestra `$1.200`).
- **Inputs Monetarios (Escritura):** Deben ser de tipo `text` y apoyarse en `handleCurrencyChange` o procesar expresiones regulares que eliminen letras `/\D/g`.
  - *Ejemplo de onChange para input monetario puro:*
    `<input type="text" value={valor ? parseInt(valor).toLocaleString('es-CO') : ''} onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))} />`
- **Componente `CurrencyInput`:** Está disponible en `src/components/ui/` para formularios estándar.

### Íconos
- Usamos la librería `lucide-react`.
- Tamaño estándar para botones/formularios: `size={16}` o `size={18}`.
- Tamaño para métricas grandes: `size={24}` o `size={32}`.
- *Ejemplo:* `<Plus size={16} style={{ marginRight: '6px' }} />`

### Convenciones de Fechas
- Fechas enviadas al backend: Generalmente formato ISO (`YYYY-MM-DD`).
- Fechas mostradas al usuario: `new Date(fecha).toLocaleDateString()` o de forma más amigable.

### Modales vs. Páginas
- **Formularios largos o de múltiples pasos** (ej. POS, Nueva Compra): Se maquetan como páginas completas (Rutas).
- **Acciones Rápidas, Creación en 1 paso o Confirmaciones:** Se realizan obligatoriamente en `Modales` (ej. Trasladar fondos, Agregar ubicaciones, Confirmar eliminación).

---

## 5. Arquitectura del Backend Orientada (Recordatorio)
Cuando desarrolles vistas que se conectan al API de este proyecto:
- **Prevención de Saldos Negativos:** El backend requiere un chequeo de fondos (`saldoActual >= monto_a_retirar`). En cajas y bancos, nunca debe quedar el saldo negativo.
- **Relaciones de Moneda:** Costes, subtotales, IVAs, y gastos siempre viajan como **números enteros**, no decimales flotantes a menos que la unidad de medida lo demande. Se formatean como precios localizados (`es-CO`) en el cliente.
- Las respuestas JSON para "obtener varios" siempre deben validar que regresan arrays en el Front-End (`Array.isArray(data) ? data : []`).

---

Al iniciar cualquier tarea en este proyecto, revisa este documento para asegurar que los nuevos botones, formularios, y lógicas encajen perfectamente con la identidad del software existente.
