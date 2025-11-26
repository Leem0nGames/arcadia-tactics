# Informe Técnico de Desarrollo: Arcadia Tactics

**Versión:** 1.3 (Local Dev)  
**Fecha:** 25 de Mayo, 2024  
**Stack Tecnológico:** React 19, TypeScript, Zustand, Three.js (@react-three/fiber), Tailwind CSS.

---

## 1. Resumen Ejecutivo
Arcadia Tactics es un RPG táctico híbrido que combina exploración de mundo abierto en 2D (estilo *Battle for Wesnoth*) con combates tácticos en 3D (estilo Voxel/Minecraft), utilizando una adaptación simplificada de las reglas de D&D 5ª Edición.

El proyecto cuenta con un ciclo de juego funcional (Core Loop): Creación de personaje -> Exploración -> Combate -> Loot/XP -> Gestión de Inventario.

---

## 2. Sistemas Implementados

### 2.1. Arquitectura y Estado (Zustand)
- **Store Centralizado:** `gameStore.ts` maneja toda la lógica de negocio, incluyendo inventario, combate y navegación.
- **ECS (Entity Component System) Ligero:** Las entidades (Jugador, Enemigos) se definen mediante componentes de datos (`CombatStats`, `Position`, `Visual`).

### 2.2. Generación de Mundo (Overworld)
- **Algoritmo Procedural:** Utiliza Ruido Perlin (simulado) para generar elevación, humedad y temperatura.
- **Biomas Dinámicos:** Soporte para Bosques, Desiertos, Tundra, Taiga, Pantanos, etc.
- **Dual Dimension System:** Generación simultánea de dos mundos ("Normal" y "Upside Down/Shadow Realm") sincronizados geográficamente pero con biomas corruptos.
- **Visualización 2D:**
  - Renderizado Hexagonal SVG.
  - **Autotiling:** Implementación completa de transiciones de terreno estilo Wesnoth (bordes suaves entre tipos de terreno).
  - **Sistema de Clima:** Capas visuales para Lluvia, Nieve, Niebla y Ceniza.
  - **Portales:** Mecánica de viaje entre dimensiones.

### 2.3. Sistema de Combate (Battle Scene)
- **Renderizado 3D:** Uso de Three.js para visualizar el terreno de combate basado en la celda del Overworld (Voxels con texturas de Minecraft).
- **Unidades:** Renderizado tipo "Billboard" (Sprites 2D en entorno 3D) con barras de vida y animaciones de "respiración".
- **Lógica de Turnos:** Sistema de iniciativa basado en D&D (d20 + DEX).
- **Acciones:**
  - Movimiento (Grid-based).
  - Ataque Melee (Cálculo de AC vs Attack Roll).
  - Magia (Sistema de hechizos con slots de maná y efectos visuales básicos).
  - Uso de Objetos.
- **Persistencia Ambiental:** El clima del Overworld se transfiere a la batalla (iluminación, partículas, niebla).

### 2.4. Inventario y Equipamiento
- **Base de Datos:** Items definidos en `constants.ts` (Armas, Armaduras, Pociones).
- **Gestión:** Capacidad de equipar/desequipar items en slots específicos (Main Hand, Off Hand, Body).
- **Recálculo de Stats:** La CA (Clase de Armadura) y el Daño se actualizan dinámicamente según el equipo.
- **UI:** Interfaz de "Paper Doll" y lista de inventario funcional.

### 2.5. Audio
- **Sintetizador Web Audio API:** Sistema de sonido procedural sin assets externos (reduce tiempos de carga). Soporta SFX para UI, pasos, magia y combate.

---

## 3. Funcionalidades Incompletas (To-Do)

### 3.1. Progresión del Personaje
- **Level Up:** Aunque se gana XP, no existe lógica para subir de nivel, incrementar stats o aprender nuevos hechizos.
- **Persistencia:** No hay sistema de Guardado/Carga (Save System). Al recargar el navegador, se pierde el progreso.

### 3.2. Inteligencia Artificial (IA)
- **Estado Actual:** Muy básica. Los enemigos se mueven en línea recta hacia el jugador y atacan si están adyacentes.
- **Faltante:**
  - Pathfinding real (A* o Dijkstra) para navegar obstáculos en combate.
  - Uso de habilidades especiales o hechizos por parte de enemigos.
  - Comportamientos tácticos (huir, flanquear).

### 3.3. Contenido
- **Variedad de Enemigos:** Solo existen "Goblins" y "Shadow Stalkers" genéricos. Faltan modelos/sprites y stats para bosses o variaciones.
- **Misiones (Quests):** La estructura de datos existe, pero no hay lógica de triggers, NPCs o recompensas por misiones.
- **Loot Tables:** El loot es estático o inexistente tras la batalla (solo XP/Gold fijos).

### 3.4. Motor de Combate 3D
- **Colisiones y Altura:** El mapa 3D se genera con alturas, pero la lógica de movimiento no tiene en cuenta "saltos" o bloqueos por diferencia de altura excesiva.
- **Línea de Visión (LoS):** Se puede atacar a través de paredes o voxels altos.

---

## 4. Deuda Técnica y Riesgos

1.  **Dependencia de Assets Externos:**
    - El proyecto hace *hotlinking* directo a repositorios de GitHub (Wesnoth/Minecraft textures).
    - **Riesgo:** Si esos repositorios cambian de estructura o bloquean el tráfico, el juego perderá todas sus texturas.
    - **Solución:** Descargar assets y servirlos localmente desde la carpeta `public`.

2.  **Optimización de Renderizado:**
    - `BattleScene.tsx` instancia materiales y geometrías por cada voxel en algunos casos. Debería implementarse *InstancedMesh* para mejorar el rendimiento en mapas grandes.

3.  **Lógica de Movimiento:**
    - El cálculo de rango de movimiento es una distancia Manhattan simple. No tiene en cuenta costes de terreno (moverse por agua/montaña debería costar más).

---

## 5. Hoja de Ruta Sugerida (Roadmap)

1.  **Prioridad Alta:** Implementar sistema de **Level Up** para cerrar el ciclo de recompensa.
2.  **Prioridad Alta:** Descargar assets críticos para evitar rotura visual (Texturas).
3.  **Prioridad Media:** Mejorar la IA enemiga con algoritmo A*.
4.  **Prioridad Media:** Implementar persistencia básica (`localStorage`).
5.  **Prioridad Baja:** Añadir NPCs y sistema de diálogo simple en el Overworld.
