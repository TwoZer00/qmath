# Especificación Técnica

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React Native + Expo 57 |
| Lenguaje | JavaScript |
| Backend / Realtime | Node.js + WebSockets (ws 8) |
| Autenticación | Firebase Auth (anónima) |
| Base de datos | Firebase Firestore (stats y eventos) |
| Deploy | Render (servidor) + Expo (app) |

---

## Estructura del Proyecto

```
qmath/
├── app/                        # React Native (Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.js       # Pantalla principal, animación boot
│   │   │   ├── LobbyScreen.js      # Sala de espera + práctica + votación
│   │   │   ├── GameScreen.js       # Juego activo
│   │   │   ├── GameOverScreen.js   # Resultado y ranking
│   │   │   ├── StatsScreen.js      # Estadísticas personales
│   │   │   └── SettingsScreen.js   # Nombre, sonido, idioma
│   │   ├── components/
│   │   │   ├── BrandHeader.js      # Header con logo y subtítulo
│   │   │   ├── CalcKey.js          # Tecla estilo calculadora
│   │   │   ├── LcdScreen.js        # Contenedor estilo pantalla LCD
│   │   │   ├── LcdProgressBar.js   # Barra de progreso LCD
│   │   │   ├── LcdDivider.js       # Separador LCD con etiqueta
│   │   │   └── NumPad.js           # Teclado numérico
│   │   ├── hooks/
│   │   │   ├── useCountdown.js     # Countdown sincronizado con timerEndsAt
│   │   │   ├── useSettings.js      # Nombre, sonido e idioma (AsyncStorage)
│   │   │   └── useSound.js         # Motor de audio con música adaptativa
│   │   ├── services/
│   │   │   ├── firebase.js         # Init Firebase Auth + Firestore
│   │   │   ├── game.js             # Cliente WebSocket (connect/auth/actions)
│   │   │   └── stats.js            # Lectura de stats desde Firestore
│   │   ├── utils/
│   │   │   ├── names.js            # Generador de nombres desde UID
│   │   │   └── questions.js        # Generador de preguntas (práctica local)
│   │   ├── i18n.js                 # Traducciones EN/ES
│   │   └── theme.js                # Colores y fuentes
│   ├── App.js                      # Root: navegación, conexión WS, estado global
│   ├── app.json                    # Config Expo
│   ├── eas.json                    # Config EAS Build
│   └── .env / .env.production
├── server/                     # Node.js WebSocket server
│   ├── index.js                # HTTP + WS, auth, rate limiting, Firestore writes
│   ├── game.js                 # Lógica completa del juego (estado en memoria)
│   ├── questions.js            # Generador de preguntas (escala por ronda)
│   ├── config.js               # Constantes desde env
│   └── logger.js               # Logger con timestamp y niveles
├── docs/                       # Documentación y web pública (GitHub Pages)
├── scripts/
│   ├── gen_music.py            # Generador de assets de música
│   └── gen_web_assets.py       # Generador de assets web
├── render.yaml                 # Deploy en Render
└── firebase.json               # Config Firebase (Firestore rules deploy)
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
| `ANSWER { value }` | Respuesta numérica (entero 0–9999) |
| `PING` | Keepalive del cliente (cada 25s) |

### Servidor → Cliente

| Mensaje | Descripción |
|---------|-------------|
| `AUTH_OK { uid }` | Autenticación exitosa |
| `AUTH_ERROR` | Token inválido |
| `STATE { payload }` | Estado completo del juego (broadcast personalizado por UID) |

### Estructura del STATE

```json
{
  "status": "LOBBY | VOTING | STARTING | PLAYING | TIMEOUT | ROUND_OVER | GAME_OVER",
  "timeLimit": 5,
  "minPlayers": 5,
  "maxVoteRounds": 2,
  "players": {
    "<uid>": {
      "name": "Tigre42",
      "status": "lobby | waiting | active | eliminated",
      "joinedAt": 1700000000000,
      "answered": false,
      "isBot": false,
      "eliminatedAt": null,
      "eliminatedReason": "wrong | timeout | slow | null",
      "responseTimeMs": null
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
  "winnerIsBot": false,
  "round": 3,
  "timerEndsAt": 1700000015000
}
```

> `answer` y `display` solo se incluyen en el STATE cuando `revealAnswer: true` (jugador ya respondió o estado es ROUND_OVER).

---

## Flujo de Conexión

1. App arranca → `signInAnonymously` con Firebase Auth → obtiene token JWT
2. Abre WebSocket → envía `AUTH { token, name }`
3. Servidor verifica token con Firebase Admin SDK (timeout 10s)
4. Si mismo UID reconecta, la conexión anterior se termina
5. Servidor responde `AUTH_OK { uid }` y envía STATE actual
6. Usuario pulsa "Jugar" → cliente envía `JOIN`

### Reconexión automática

- Al desconectarse, el cliente reintenta con backoff exponencial (máx 30s)
- Keepalive cada 25s para evitar cierre por inactividad en Render Free (55s)
- Ping/pong del servidor cada 8s para detectar conexiones muertas

---

## Lógica del Servidor

- Todo el estado del juego vive en memoria (objeto `state` singleton)
- El servidor es la única fuente de verdad — sin race conditions
- Los timers corren en el servidor; `timerEndsAt` se incluye en cada STATE para countdowns sincronizados en clientes
- Rate limiting: máx 20 mensajes/segundo por cliente
- Protección contra crashes: `uncaughtException` y `unhandledRejection` logueados sin reinicio

### Eliminación por lentitud

A partir de la ronda `GRACE_ROUNDS + 1` (default: ronda 4), si todos los jugadores activos responden correctamente, el más lento es eliminado con razón `slow`.

---

## Persistencia (Firestore)

### Colección `events`

Cada respuesta y fin de partida se escribe como evento:

```json
// Tipo: answer
{
  "type": "answer",
  "uid": "<uid>",
  "sessionId": "1700000000000_abc12",
  "round": 3,
  "expression": "12 + 7",
  "op": "+",
  "correct": true,
  "timeout": false,
  "responseTimeMs": 1234,
  "timestamp": "<serverTimestamp>"
}

// Tipo: game_over
{
  "type": "game_over",
  "uid": "<uid>",
  "sessionId": "1700000000000_abc12",
  "winner": true,
  "totalRounds": 8,
  "timestamp": "<serverTimestamp>"
}
```

Los eventos se acumulan en memoria y se escriben en batch al finalizar la partida (máx 500 por batch).

### Colección `stats`

Documento `global` con contador de jugadores únicos totales:
```json
{ "totalPlayers": 1234 }
```

Se incrementa atómicamente al finalizar cada partida. Expuesto en `GET /stats`.

---

## Variables de Entorno

### app/.env (desarrollo)
```
EXPO_PUBLIC_USE_EMULATOR=true
EXPO_PUBLIC_WS_URL=ws://<ip-local>:3000
EXPO_PUBLIC_MIN_PLAYERS=2
EXPO_PUBLIC_MAX_VOTE_ROUNDS=2
EXPO_PUBLIC_TIME_LIMIT=5
```

### app/.env.production
```
EXPO_PUBLIC_USE_EMULATOR=false
EXPO_PUBLIC_WS_URL=wss://qmath-server.onrender.com
EXPO_PUBLIC_MIN_PLAYERS=5
EXPO_PUBLIC_MAX_VOTE_ROUNDS=2
EXPO_PUBLIC_TIME_LIMIT=5
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
FIRESTORE_EMULATOR_HOST=<ip-emulador>:8080
MIN_PLAYERS=2
MAX_PLAYERS=20
TIME_LIMIT=5
LOBBY_WAIT=15
VOTE_WAIT=10
ROUND_WAIT=3
RESTART_WAIT=5
MAX_VOTE_ROUNDS=2
BOT_ERROR_RATE=0.25
GRACE_ROUNDS=3
```

### server (producción — Render dashboard)
```
USE_EMULATOR=false
FIREBASE_SERVICE_ACCOUNT=<json completo de service account>
MIN_PLAYERS=5
```

---

## Audio

El hook `useSound` implementa un sistema de música adaptativa con 4 capas:

- `sfx_music_low` / `sfx_music_mid` / `sfx_music_high` — capas de intensidad
- `sfx_music_stinger` — stinger de victoria/eliminación
- La intensidad se calcula en tiempo real según jugadores activos y tiempo restante
- Modos: `ambient` (baja intensidad), `playing` (intensidad dinámica), `eliminated` (silencio gradual)

---

## Deploy

### Servidor (Render)
- Servicio Web en `render.yaml`
- Free tier: se duerme tras 15min de inactividad → cold start de hasta 50s
- El cliente muestra estado `waking` si la conexión tarda más de 3s

### App (Expo / EAS)
- Build con EAS (`eas.json`)
- Distribución: Expo Go (desarrollo) + builds nativos (producción)
