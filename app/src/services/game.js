import { signInAnonymously, getIdToken } from 'firebase/auth';
import { auth } from './firebase';
import { randomName, getSavedName } from '../utils/names';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.0.102:3000';

export const MIN_PLAYERS = parseInt(process.env.EXPO_PUBLIC_MIN_PLAYERS) || 2;
export const MAX_VOTE_ROUNDS = parseInt(process.env.EXPO_PUBLIC_MAX_VOTE_ROUNDS) || 2;

let ws = null;
let listeners = {}; // eventType -> [callback]
let intentionalClose = false;

const emit = (type, payload = {}) => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...payload }));
  else if (__DEV__) console.warn(`[game] emit dropped — ws not open (type: ${type})`);
};

const on = (type, cb) => {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(cb);
  return () => { listeners[type] = listeners[type].filter((f) => f !== cb); };
};

const dispatch = (type, payload) => listeners[type]?.forEach((cb) => cb(payload));

// ── Connection ────────────────────────────────────────────────────────────────

export const connect = async () => {
  // Clear all listeners from previous connection to avoid accumulation on reconnect
  listeners = {};
  const existing = auth.currentUser;
  let user;
  try {
    const result = existing ? { user: existing } : await signInAnonymously(auth);
    user = result.user;
  } catch (e) {
    throw new Error(e.code === 'auth/network-request-failed' ? 'CONNECTION_ERROR' : 'AUTH_ERROR');
  }
  let token;
  try {
    token = await getIdToken(user, true); // force refresh — tokens expire after 1h
  } catch (e) {
    // Anonymous account may have been deleted (Spark tier deletes after 30 days inactive)
    // Force re-auth by signing in anonymously again
    try {
      const result = await signInAnonymously(auth);
      token = await getIdToken(result.user, true);
    } catch {
      throw new Error('AUTH_ERROR');
    }
  }
  const saved = await getSavedName();
  const name = saved || randomName();

  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    intentionalClose = false;
    let authed = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('TIMEOUT'));
    }, 55000); // Render free tier cold start can take up to 50s

    ws.onopen = () => {
      emit('AUTH', { token, name });
      // Render free tier closes idle WS at 55s — keepalive every 25s
      const keepalive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
        else clearInterval(keepalive);
      }, 25000);
      ws.addEventListener('close', () => clearInterval(keepalive));
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'AUTH_OK') { clearTimeout(timeout); authed = true; resolve({ uid: msg.uid, name }); }
      if (msg.type === 'AUTH_ERROR') { clearTimeout(timeout); reject(new Error('AUTH_ERROR')); }
      dispatch(msg.type, msg.payload);
    };

    ws.onerror = () => { clearTimeout(timeout); if (!authed) reject(new Error('CONNECTION_ERROR')); };
    ws.onclose = () => {
      clearTimeout(timeout);
      if (authed && !intentionalClose) dispatch('DISCONNECTED');
      else if (!authed) reject(new Error('CONNECTION_ERROR'));
    };
  });
};

export const disconnect = () => { intentionalClose = true; ws?.close(); };

export const joinLobby = () => emit('JOIN');
export const leaveLobby = () => emit('LEAVE');

// ── Listeners (same API as before) ───────────────────────────────────────────

export const listenState = (cb) => on('STATE', cb);
export const listenDisconnect = (cb) => on('DISCONNECTED', cb);

// ── Actions ───────────────────────────────────────────────────────────────────

export const sendAnswer = (value) => emit('ANSWER', { value });
export const sendVote = (vote) => emit('VOTE', { vote });
