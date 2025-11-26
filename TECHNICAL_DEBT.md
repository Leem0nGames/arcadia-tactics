# Deuda Técnica y Áreas de Mejora - Arcadia Tactics

**Fecha de Actualización:** 25 de Mayo, 2024
**Estado:** Post-Optimización Gráfica (v1.5)

Este documento detalla la deuda técnica actual acumulada y las áreas que requieren refactorización para garantizar la escalabilidad, mantenibilidad y calidad del juego a largo plazo.

---

## 🔴 Prioridad Alta (Crítica para Escalabilidad)

### 1. Refactorización del "God Store" (`gameStore.ts`)
* **Problema:** El archivo `gameStore.ts` tiene más de 600 líneas y maneja responsabilidades mezcladas: Lógica de UI, Máquina de Estados de Combate, Lógica de Inventario, Generación Procedural de Mapas y Cálculos de RPG.
* **Consecuencia:** Es difícil de leer, testear y cualquier cambio pequeño puede romper lógica no relacionada.
* **Solución Propuesta:** Utilizar el patrón "Slice" de Zustand. Dividir el store en:
    * `createBattleSlice`: Lógica de turnos, movimiento y ataque.
    * `createOverworldSlice`: Movimiento en mapa, generación y clima.
    * `createInventorySlice`: Gestión de items y equipamiento.
    * `createPlayerSlice`: Stats, creación de personaje y level up.

### 2. Sistema de Efectos y Habilidades (Hardcoded)
* **Problema:** La lógica de los hechizos y ataques está "quemada" (hardcoded) dentro de funciones gigantes como `performPlayerMagic` o `consumeItem` con múltiples `if/else`.
* **Consecuencia:** Añadir un nuevo hechizo requiere modificar el motor central del juego. No es extensible ni soportará habilidades complejas (ej: áreas de efecto, daños por turno).
* **Solución Propuesta:** Implementar un **Sistema de Efectos (Effect System)**.
    * Las habilidades deben ser objetos de datos que describan sus efectos (`{ type: 'DAMAGE', amount: '1d6', element: 'FIRE', area: 3 }`).
    * Crear un "Action Resolver" genérico que procese estos objetos.

### 3. Inteligencia Artificial (IA) Primitiva
* **Problema:** La función `performEnemyTurn` es extremadamente básica. Los enemigos solo se mueven hacia el jugador más cercano y atacan. No usan hechizos, no flanquean, no huyen y no priorizan objetivos débiles (Healers/Wizards).
* **Solución Propuesta:** Implementar **Behavior Trees** (Árboles de Comportamiento) o una **Máquina de Estados Finitos (FSM)** para cada tipo de enemigo.

---

## 🟡 Prioridad Media (Mantenibilidad y Robustez)

### 4. Sistema de Guardado Frágil
* **Problema:** `saveGame` hace un `JSON.stringify` de todo el estado. Si actualizamos el código y cambiamos la estructura de un objeto (ej: añadimos una propiedad nueva a `Entity`), cargar una partida guardada antigua romperá el juego (crash).
* **Solución Propuesta:**
    * Implementar versionado en el guardado (`version: 1.0`).
    * Crear funciones de migración que se ejecuten al cargar saves antiguos.
    * Guardar solo los datos esenciales, no el estado computado.

### 5. Gestión de Assets y "Magic Strings"
* **Problema:** `constants.ts` contiene lógica (`getSprite`) que debería estar en un servicio. Las rutas de las imágenes son cadenas de texto dispersas. Si una URL cambia, se rompe todo.
* **Solución Propuesta:** Centralizar el `AssetManager`. Precargar assets críticos al inicio del juego y mostrar una barra de carga real, manejando errores de 404 elegantemente.

### 6. Lógica de Negocio en Componentes
* **Problema:** Algunos componentes de UI (`BattleScene`, `CharacterCreation`) contienen lógica de cálculo de stats o validaciones que deberían estar en el Store o en funciones de utilidad.
* **Solución Propuesta:** Mover toda la lógica de cálculo a `services/dndRules.ts` o selectores de Zustand. Los componentes solo deben renderizar.

---

## 🟢 Prioridad Baja (Polish y UX)

### 7. Accesibilidad (a11y)
* **Problema:** El juego depende 100% del mouse. No es jugable con teclado ni accesible para lectores de pantalla.
* **Solución Propuesta:** Añadir navegación por teclado (WASD para mapa, Flechas para menús) y etiquetas ARIA.

### 8. Testing
* **Problema:** Cobertura de tests: 0%.
* **Solución Propuesta:** Añadir Vitest para testear las reglas de D&D (`dndRules.ts`) y la lógica crítica del Store (combate, inventario).

### 9. Hardcoded Map Sizes
* **Problema:** `MAP_WIDTH` y `MAP_HEIGHT` son constantes globales.
* **Solución Propuesta:** Hacer que el tamaño del mapa sea dinámico y parte de la configuración del nivel, permitiendo mapas de diferentes tamaños.
