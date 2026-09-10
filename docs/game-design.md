# Diseño del Juego

## Concepto General

Math Battle Royale es un juego multijugador en tiempo real. Todos los jugadores compiten en una sala única global resolviendo operaciones matemáticas bajo presión de tiempo. El último jugador en pie gana la partida.

---

## Jugadores

- Anónimos, sin registro requerido
- Nombre aleatorio asignado automáticamente al entrar (ej. `Tigre42`, `Rayo07`)
- El nombre puede personalizarse en Ajustes y se persiste localmente
- Si un nombre ya está tomado en la sala, se le añade un sufijo numérico

---

## Sala Única Global

- Existe una sola sala pública para todos los jugadores
- No hay salas privadas ni matchmaking
- Si una partida está en curso al entrar, el jugador espera en estado `waiting` hasta el siguiente ciclo
- Máximo **20 jugadores** simultáneos (configurable)

---

## Bots

- Si solo hay 1 humano en el lobby, el servidor llena la sala con bots automáticamente
- Los bots tienen nombres aleatorios (ej. `Tiger42`, `Wolf07`)
- Los bots responden con un delay aleatorio dentro del tiempo límite
- Tasa de error de bots: **25%** (configurable con `BOT_ERROR_RATE`)
- Si un humano se une durante una partida de puros bots, el lobby se resetea para que juegue de inmediato
- Los bots se eliminan al resetear el lobby

---

## Estados del Juego

```
LOBBY → VOTING → STARTING → PLAYING → ROUND_OVER → PLAYING → ... → GAME_OVER → LOBBY
                                    ↘ TIMEOUT ↗
```

### LOBBY
- Los jugadores se van uniendo
- Mínimo requerido: **5 jugadores** en producción, **2** en desarrollo (configurable)
- Al llegar al mínimo con solo 1 humano → se llenan bots y arranca directo
- Al llegar al mínimo con múltiples humanos → arranca contador de espera (**15s**)
- Un jugador puede forzar la votación enviando un voto `start` desde el lobby

### VOTING
- Todos los jugadores en lobby pueden votar: **Iniciar** o **Esperar**
- Tiempo límite: **10 segundos** por ronda de votación
- Si todos votan antes del límite, se resuelve inmediatamente
- Máximo **2 rondas** de votación (configurable)
- Si la mayoría vota iniciar → arranca la partida
- Si la mayoría vota esperar → nueva ronda de votación
- Al agotar las rondas → inicia automáticamente si hay suficientes jugadores

### STARTING
- Cuenta regresiva de **3 segundos** antes de comenzar
- Los jugadores en `waiting` pasan a `active`

### PLAYING
- Todos los jugadores activos ven la misma pregunta al mismo tiempo
- Tiempo límite: **5 segundos** por pregunta
- Si el jugador responde mal → eliminado (`wrong`)
- Si el jugador no responde a tiempo → eliminado (`timeout`)
- Si todos responden correctamente → el más lento es eliminado (`slow`), excepto en las primeras **3 rondas** (grace rounds)

### TIMEOUT
- Estado transitorio de **800ms** entre que expira el timer y se procesan las eliminaciones por tiempo
- Permite que lleguen respuestas tardías antes de eliminar

### ROUND_OVER
- Pausa de **3 segundos** entre preguntas
- Se muestran los jugadores eliminados en esa ronda
- Se revela la respuesta correcta
- Si queda 1 jugador → pasa a `GAME_OVER`; si quedan más → siguiente pregunta

### GAME_OVER
- Se muestra el ganador y el ranking final a todos (incluyendo eliminados y jugadores en espera)
- Cuenta regresiva de **5 segundos** antes de volver al LOBBY

---

## Operaciones Matemáticas

La dificultad escala con el número de ronda:

| Rondas | Operaciones | Rango |
|--------|-------------|-------|
| 1–2 | `+` `-` | 1–20 |
| 3–5 | `+` `-` | 1–50 |
| 6–9 | `+` `-` `×` | 1–50 (×: 2–12) |
| 10+ | `+` `-` `×` `÷` | 1–100 (×: 2–15, ÷: resultado entero) |

---

## Eliminación

Un jugador es eliminado si:
- Envía una respuesta incorrecta (`wrong`)
- No responde dentro del tiempo límite (`timeout`)
- Es el último en responder correctamente cuando todos aciertan (`slow`) — excepto en las primeras 3 rondas

Los jugadores eliminados pueden ver el juego en curso hasta que termine la partida.

---

## Pantallas

| Pantalla | Descripción |
|----------|-------------|
| **Home** | Pantalla principal con animación de boot estilo calculadora |
| **Lobby** | Sala de espera con práctica libre y sistema de votación |
| **Game** | Pantalla de juego activo con numpad y barra de progreso |
| **GameOver** | Resultado final con ranking de jugadores |
| **Stats** | Estadísticas personales por operación y sesión |
| **Settings** | Nombre de jugador, sonido e idioma (EN/ES) |

---

## Flujo de una Partida Típica

1. Jugador entra → ve el lobby, puede practicar con el numpad
2. Al llegar al mínimo de jugadores → arranca contador de espera (15s)
3. Contador expira → votación (máx 2 rondas de 10s)
4. Votación resuelta → cuenta regresiva de 3s (STARTING)
5. Partida inicia → preguntas en tiempo real, 5s por pregunta
6. Tras cada pregunta → pausa ROUND_OVER de 3s con eliminados y respuesta revelada
7. Jugadores se van eliminando hasta quedar 1
8. Se muestra ganador y ranking → regresa al LOBBY en 5s
