# Diseño del Juego

## Concepto General

Math Battle Royale es un juego multijugador en tiempo real. Todos los jugadores compiten en una sala única global resolviendo operaciones matemáticas simples bajo presión de tiempo. El último jugador en pie gana la partida.

---

## Jugadores

- Anónimos, sin registro requerido
- Nombre aleatorio asignado automáticamente al entrar (ej. `Tigre42`, `Rayo07`)
- Sin historial ni ranking persistente

---

## Sala Única Global

- Existe una sola sala pública para todos los jugadores
- No hay salas privadas ni matchmaking
- Si una partida está en curso al entrar, el jugador espera en el lobby hasta el siguiente ciclo

---

## Estados del Juego

```
LOBBY → VOTING → PLAYING → ROUND_OVER → PLAYING → ... → GAME_OVER → LOBBY
```

### LOBBY
- Los jugadores se van uniendo
- Mínimo requerido: **5 jugadores** (configurable)
- Al llegar al mínimo, arranca un contador de espera
- Un jugador en LOBBY puede forzar la votación enviando un voto `start`

#### Lógica de votación para iniciar
1. El contador de espera llega a cero con el mínimo de jugadores → se abre votación (estado `VOTING`)
2. Opciones: **Iniciar ahora** o **Esperar más jugadores**
3. Si la mayoría vota iniciar → arranca la partida
4. Si la mayoría vota esperar → se abre una nueva ronda de votación
5. Este proceso ocurre **máximo 2 veces** (configurable)
6. Al agotar las rondas de votación → **inicia automáticamente**

### VOTING
- Todos los jugadores en lobby pueden votar
- Tiempo límite por ronda de votación: **10 segundos**
- Si todos votan antes del límite, se resuelve inmediatamente

### PLAYING
- Todos los jugadores activos ven la misma pregunta al mismo tiempo
- Tiempo límite: **5 segundos** por pregunta
- Si el jugador responde mal → eliminado
- Si el jugador no responde a tiempo → eliminado
- Los jugadores que entran durante una partida quedan en estado `waiting`

### ROUND_OVER
- Pausa breve (**3 segundos**) entre preguntas
- Se muestran los jugadores eliminados en esa ronda
- Si queda 1 jugador → pasa a `GAME_OVER`; si quedan más → siguiente pregunta

### GAME_OVER
- Se muestra el ganador a todos (incluyendo eliminados y jugadores en espera)
- Cuenta regresiva antes de volver al LOBBY (**5 segundos**)

---

## Operaciones Matemáticas

- Suma y resta únicamente (versión inicial)
- Números simples, orientados a respuesta rápida

---

## Eliminación

Un jugador es eliminado si:
- Envía una respuesta incorrecta
- No responde dentro de los 5 segundos

Los jugadores eliminados pueden ver el juego en curso hasta que termine la partida.

---

## Flujo de una Partida Típica

1. Jugador entra → ve el lobby con jugadores conectados
2. Al llegar al mínimo de jugadores → arranca contador de espera
3. Contador expira → votación (máx 2 rondas)
4. Partida inicia → preguntas en tiempo real, 5 segundos por pregunta
5. Tras cada pregunta → pausa `ROUND_OVER` de 3 segundos
6. Jugadores se van eliminando hasta quedar 1
7. Se muestra ganador → regresa al LOBBY automáticamente
