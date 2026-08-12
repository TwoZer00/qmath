# Especificación Técnica

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React Native + Expo |
| Lenguaje | JavaScript |
| Backend / Realtime | Node.js + WebSockets (ws) |
| Autenticación | Firebase Authentication (anónima) |
| Deploy | Render (servidor) + Expo (app) |

---

## Estructura del Proyecto

```
qmath/
├── app/                  # React Native (Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.js
│   │   │   ├── LobbyScreen.js
│   │   │   ├── GameScreen.js
│   │   │   └── GameOverScreen.js
│   │   ├── services/
│   │   │   ├── firebase.js   # Solo Auth anónima
│   │   │   └── game.js       # Cliente WebSocket
│   │   └── utils/
│   ├── App.js
│   └── .env
├── server/               # Node.js WebSocket server
│   ├── index.js          # Entrada, auth, WebSocket
│   ├── game.js           # Lógica completa del juego
│   ├── questions.js      # Generador de preguntas
│   ├── config.js         # Constantes desde env
│   ├── logger.js         # Logger con timestamp
│   └── .env
├── docs/
├── render.yaml           # Deploy en Render
└── package.json          # Scripts monorepo
```

---

## Protocolo WebSocket

### Cliente → Servidor

| Mensaje | Descripción |
|---------|-------------|
| `AUTH { token, name }` | Primer mensaje obligatorio, verifica token Firebase |
| `JOIN` | Jugador entra al lobby |
| `LEAVE` | Jugador sale del lobby |
| `VOTE { vote }` | Voto: `'start'` o `'wait'` |
| `ANSWER { value }` | Respuesta numérica a la pregunta |

### Servidor → Cliente

| Mensaje | Descripción |
|---------|-------------|
| `AUTH_OK { uid }` | Autenticación exitosa |
| `AUTH_ERROR` | Token inválido |
| `STATE { payload }` | Estado completo del juego (broadcast) |

### Estructura del STATE

```json
{
  "status": "LOBBY | VOTING | PLAYING | ROUND_OVER | GAME_OVER",
  "players": {
    "<uid>": {
      "name": "Tigre42",
      "status": "lobby | waiting | active | eliminated",
      "joinedAt": 1700000000000,
      "answered": false
    }
  },
  "question": {
    "expression": "12 + 7",
    "startedAt": 1700000000000,
    "answer": 19,
    "display": 19,
    "revealAnswer": false
  },
  "eliminatedThisRound": ["Tigre42"],
  "voteRound": 0,
  "votes": { "<uid>": "start | wait" },
  "winner": null,
  "timerEndsAt": 1700000015000
}
```

---

## Flujo de Conexión

1. App arranca → `signInAnonymously` con Firebase Auth → obtiene token
2. Abre WebSocket → envía `AUTH { token, name }`
3. Servidor verifica token → responde `AUTH_OK`
4. Usuario pulsa "Jugar" → cliente envía `JOIN`
5. Servidor agrega jugador al estado y hace broadcast

---

## Lógica del Servidor

- Todo el estado del juego vive en memoria en el servidor
- El servidor es la única fuente de verdad — sin race conditions
- Los timers (lobby, votación, pregunta, reinicio) corren en el servidor
- `timerEndsAt` se incluye en cada STATE para que los clientes muestren countdowns sincronizados

---

## Variables de Entorno

### app/.env (desarrollo)
```
EXPO_PUBLIC_USE_EMULATOR=true
EXPO_PUBLIC_WS_URL=ws://<ip-local>:3000
EXPO_PUBLIC_MIN_PLAYERS=2
EXPO_PUBLIC_MAX_VOTE_ROUNDS=2
```

### app/.env.production
```
EXPO_PUBLIC_USE_EMULATOR=false
EXPO_PUBLIC_WS_URL=wss://qmath-server.onrender.com
EXPO_PUBLIC_MIN_PLAYERS=5
EXPO_PUBLIC_MAX_VOTE_ROUNDS=2
EXPO_PUBLIC_FIREBASE_API_KEY=<api_key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project_id>
```

> Ambos archivos están en `.gitignore`.

### server/.env (desarrollo)
```
PORT=3000
USE_EMULATOR=true
FIREBASE_AUTH_EMULATOR_HOST=<ip-emulador>:9099
MIN_PLAYERS=2
TIME_LIMIT=5
LOBBY_WAIT=15
VOTE_WAIT=10
ROUND_WAIT=3
RESTART_WAIT=5
```

### Producción
- `EXPO_PUBLIC_WS_URL=wss://qmath-server.onrender.com`
- `USE_EMULATOR=false`
- `FIREBASE_SERVICE_ACCOUNT=<json>` (configurado en Render dashboard)
