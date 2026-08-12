require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');
const { setBroadcast, setOnEvent, snapshot, playerJoined, playerLeft, castVote, submitAnswer } = require('./game');
const log = require('./logger');

// ── Process-level error guards (critical for Render Free — no auto-restart on uncaught errors) ──
process.on('uncaughtException', (e) => log.error(`Uncaught exception: ${e.message}\n${e.stack}`));
process.on('unhandledRejection', (e) => log.error(`Unhandled rejection: ${e?.message ?? e}`));

const useEmulator = process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  admin.initializeApp({ projectId: 'qmath' });
  log.warn('Using Firebase emulators (Auth + Firestore)');
} else {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    log.error('FIREBASE_SERVICE_ACCOUNT is missing or invalid JSON — server cannot start');
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

let firestoreQueue = Promise.resolve();
let firestoreQueueSize = 0;
const FIRESTORE_QUEUE_LIMIT = 50;

setOnEvent((event) => {
  if (firestoreQueueSize >= FIRESTORE_QUEUE_LIMIT) {
    log.warn(`Firestore queue full (${FIRESTORE_QUEUE_LIMIT}), dropping event: ${event.type}`);
    return;
  }
  firestoreQueueSize++;
  firestoreQueue = firestoreQueue.then(async () => {
    try {
      await db.collection('events').add({ ...event, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      log.error(`Firestore write failed: ${e.message}`);
    } finally {
      firestoreQueueSize--;
    }
  });
});

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
const wss = new WebSocketServer({ server });
server.listen(PORT);
const clients = new Map();

const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));

// Ping all clients every 30s — drop dead connections (leftover from Render sleep)
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

setBroadcast((buildMsg) => {
  clients.forEach((ws, uid) => send(ws, buildMsg(uid)));
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let uid = null;
  let name = null;
  let msgCount = 0;
  let msgWindowStart = Date.now();
  const RATE_LIMIT = 20; // max messages per second
  log.info(`New connection (total: ${wss.clients.size})`);

  ws.on('message', async (raw) => {
    const now = Date.now();
    if (now - msgWindowStart > 1000) { msgCount = 0; msgWindowStart = now; }
    msgCount++;
    if (msgCount > RATE_LIMIT) { log.warn(`Rate limit exceeded by ${name ?? 'unknown'}`); return; }
    let msg;
    try { msg = JSON.parse(raw); } catch { log.warn('Invalid JSON received'); return; }
    if (msg.type === 'PING') return; // client keepalive

    if (!uid) {
      if (msg.type !== 'AUTH') { log.warn('First message was not AUTH, closing'); return ws.close(); }
      try {
        const decoded = await Promise.race([
          admin.auth().verifyIdToken(msg.token),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 10000)),
        ]);
        // If same uid reconnects, close the old connection first
        const existing = clients.get(decoded.uid);
        if (existing && existing !== ws) {
          existing.terminate();
          log.warn(`Replaced stale connection for ${msg.name} (${decoded.uid})`);
        }
        uid = decoded.uid;
        name = (typeof msg.name === 'string' && msg.name.trim()) ? msg.name.trim().slice(0, 20) : 'Jugador';
        clients.set(uid, ws);
        send(ws, { type: 'AUTH_OK', uid });
        log.info(`Player authenticated: ${name} (${uid})`);
      } catch (e) {
        log.error(`Auth failed: ${e.message}`);
        send(ws, { type: 'AUTH_ERROR' });
        ws.close();
      }
      return;
    }

    if (msg.type === 'JOIN') {
      playerJoined(uid, name);
      send(ws, { type: 'STATE', payload: snapshot(false) });
      log.info(`Player joined lobby: ${name} (${uid})`);
    }
    if (msg.type === 'LEAVE') {
      playerLeft(uid);
      log.info(`Player left lobby: ${name} (${uid})`);
    }
    if (msg.type === 'ANSWER') {
      const value = msg.value;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9999) {
        log.warn(`Invalid answer from ${name}: ${value}`);
        return;
      }
      log.info(`Answer from ${uid}: ${value}`);
      submitAnswer(uid, value);
    }
    if (msg.type === 'VOTE') {
      log.info(`Vote from ${uid}: ${msg.vote}`);
      castVote(uid, msg.vote);
    }
  });

  ws.on('close', () => {
    if (uid) {
      log.info(`Connection closed: ${name ?? uid} (total: ${wss.clients.size})`);
      if (clients.get(uid) === ws) {
        clients.delete(uid);
        playerLeft(uid);
      }
    }
  });

  ws.on('error', (e) => log.error(`WebSocket error for ${uid ?? 'unknown'}: ${e.message}`));
});

log.info(`WebSocket server running on port ${PORT}`);
