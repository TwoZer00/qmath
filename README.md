# Math Battle Royale

Juego multijugador en tiempo real donde los jugadores compiten resolviendo operaciones matemáticas simples. El último en pie gana.

## Concepto

Todos los jugadores entran a una sala única global y se les presentan las mismas operaciones matemáticas al mismo tiempo. Quien responda mal, no responda a tiempo, o sea el más lento en responder correctamente es eliminado. El ciclo se repite hasta quedar un ganador.

## Documentación

- [Diseño del Juego](docs/game-design.md)
- [Especificación Técnica](docs/technical-spec.md)

## Stack

- React Native + Expo 57
- Node.js + WebSockets (ws) — servidor de juego
- Firebase Auth (anónima) + Firestore (stats/eventos)
- Deploy: Render (servidor) + Expo (app)

## Estructura

```
qmath/
├── app/        # React Native (Expo)
├── server/     # Node.js WebSocket server
├── docs/       # Documentación y web pública
└── scripts/    # Generadores de assets
```

## Inicio Rápido

```bash
# App
cd app && npm install && npx expo start

# Servidor (desarrollo)
cd server && npm install && npm run dev
```

## Variables de Entorno

Ver [Especificación Técnica](docs/technical-spec.md#variables-de-entorno) para la lista completa.
