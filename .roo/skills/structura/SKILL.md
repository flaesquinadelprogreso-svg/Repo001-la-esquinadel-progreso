---
name: bloqueo-estilo-estricto
description: Garantiza que el estilo visual (CSS, clases, layout, diseño UI) nunca sea modificado automáticamente. Solo puede cambiarse si el usuario lo solicita explícitamente.
---

# 🔒 BLOQUEO DE ESTILO ESTRICTO

## 🎯 Propósito

Este skill impone una regla crítica en AntiGravity Code:

> El estilo visual NO se modifica bajo ninguna circunstancia, a menos que el usuario lo pida explícitamente.

Esto incluye:
- CSS
- Tailwind
- Clases
- Layout
- Márgenes y paddings
- Colores
- Tipografías
- Tamaños
- Responsive
- Estructura visual
- Orden visual de elementos

---

## 🛑 Regla Principal

Si el usuario NO menciona explícitamente que quiere modificar diseño, estilos o UI:

→ Está TERMINANTEMENTE PROHIBIDO alterar cualquier aspecto visual.

---

## 🧠 Qué SÍ se puede modificar

✔ Lógica
✔ Funcionalidad
✔ Validaciones
✔ Estados
✔ Hooks
✔ Backend
✔ Consumo de APIs
✔ Manejo de datos
✔ Optimización interna
✔ Refactorización lógica (sin tocar clases)

---

## ❌ Qué NO se puede modificar

- className
- style
- CSS modules
- Tailwind classes
- styled-components
- Grid / Flex
- Estructura visual del JSX
- Componentes UI
- Sistema responsive
- Iconos
- Espaciados
- Animaciones
- Transiciones
- Orden visual

Aunque el modelo detecte:
- Código desordenado
- Malas prácticas visuales
- Diseño mejorable
- UI inconsistente

NO debe corregirlo.

---

## 🚨 Regla de Oro

Si el usuario dice algo como:

- "mejoralo"
- "optimizalo"
- "arreglalo"
- "refactoriza"
- "hazlo más limpio"

Se debe asumir que se refiere SOLO a lógica,
NO a estilos.

---

## 🔐 Condición Única para Permitir Cambios de Estilo

Solo se pueden modificar estilos si el usuario usa frases explícitas como:

- "cambia el diseño"
- "modifica el estilo"
- "mejora la UI"
- "hazlo responsive"
- "ajusta el CSS"
- "cambia colores"
- "modifica clases"

Si no existe una instrucción clara sobre diseño:

→ El estilo queda congelado.

---

## 🧾 Modo de Respuesta Obligatorio

Si una mejora lógica requiere mover estructura visual,
el modelo debe:

1. Mantener exactamente las mismas clases.
2. Mantener exactamente el mismo layout.
3. No reorganizar JSX si afecta visualmente.
4. Explicar cualquier limitación si la mejora afecta UI.

---

## 🧊 Modo Congelación Visual

Este skill activa el modo:

VISUAL_LOCK = TRUE

Mientras esté activo:
- No se toca diseño.
- No se toca UI.
- No se toca estructura visual.

---

## 📌 Ejemplo Correcto

Usuario:
"Optimiza este componente"

✔ Se mejora lógica.
✔ Se limpia código.
✔ Se mejora rendimiento.
❌ No se tocan clases.
❌ No se cambian estilos.

---

## 📌 Ejemplo Incorrecto

Usuario:
"Arregla este componente"

❌ Cambiar Tailwind.
❌ Reordenar layout.
❌ Ajustar paddings.
❌ Cambiar colores.

---

## 🧠 Nivel de Prioridad

PRIORIDAD MÁXIMA.

Este skill prevalece sobre:
- Mejoras automáticas
- Buenas prácticas de diseño
- Optimización visual
- Reestructuración estética

---

# 🔒 Resultado Esperado

AntiGravity Code debe comportarse como:

"Cirujano lógico con manos atadas visualmente."

Solo opera la lógica.
Nunca toca el diseño sin permiso explícito.

---

END_SKILL