const { generateQuestion } = require('./questions');
const { MIN_PLAYERS, MAX_PLAYERS, MAX_VOTE_ROUNDS, TIME_LIMIT, LOBBY_WAIT, VOTE_WAIT, RESTART_WAIT, ROUND_WAIT } = require('./config');
const log = require('./logger');

// Single room state
const state = {
  status: 'LOBBY', // LOBBY | VOTING | PLAYING | ROUND_OVER | GAME_OVER
  players: {},
  question: null,
  voteRound: 0,
  votes: {},
  winner: null,
  eliminatedThisRound: [], // names eliminated in last round
  round: 0,
  timer: null,
};

let broadcast = () => {};
let onEvent = () => {};

const setBroadcast = (fn) => { broadcast = fn; };
const setOnEvent = (fn) => { onEvent = fn; };

// broadcast(msg) sends to all — fn receives (uid) => payload
const broadcastAll = () => {
  try {
    const base = snapshot(false);
    const revealed = snapshot(true);
    broadcast((uid) => ({
      type: 'STATE',
      payload: ((state.players[uid]?.answered ?? false) || state.status === 'ROUND_OVER') ? revealed : base,
    }));
  } catch (e) {
    log.error(`broadcastAll failed: ${e.message}`);
  }
};

const snapshot = (revealAnswer = false) => ({
  status: state.status,
  timeLimit: TIME_LIMIT,
  players: Object.fromEntries(
    Object.entries(state.players).map(([id, p]) => {
      const { joinedMidRound, ...pub } = p;
      return [id, pub];
    })
  ),
  question: state.question ? {
    expression: state.question.expression,
    startedAt: state.question.startedAt,
    ...(revealAnswer && { answer: state.question.answer, display: state.question.display }),
    revealAnswer,
  } : null,
  voteRound: state.voteRound,
  votes: state.votes,
  winner: state.winner,
  eliminatedThisRound: state.eliminatedThisRound,
  round: state.round,
  timerEndsAt,
});

let timerEndsAt = null;

const clearTimer = () => {
  if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  timerEndsAt = null;
};

const setTimer = (ms, fn) => {
  clearTimer();
  timerEndsAt = Date.now() + ms;
  state.timer = setTimeout(() => {
    try { fn(); } catch (e) { log.error(`Timer callback failed: ${e.message}`); }
  }, ms);
};

const lobbyPlayers = () =>
  Object.entries(state.players).filter(([, p]) => p.status === 'lobby');

const activePlayers = () =>
  Object.entries(state.players).filter(([, p]) => p.status === 'active');

// ── Lobby ────────────────────────────────────────────────────────────────────

const startLobbyTimer = () => {
  setTimer(LOBBY_WAIT * 1000, () => {
    if (lobbyPlayers().length < MIN_PLAYERS) return;
    openVote(1);
  });
};

const playerJoined = (uid, name) => {
  if (Object.keys(state.players).length >= MAX_PLAYERS) return;
  // Reconnect: player already exists, update status if game returned to lobby
  if (state.players[uid]) {
    if (state.status === 'LOBBY' && state.players[uid].status !== 'lobby') {
      state.players[uid].status = 'lobby';
      state.players[uid].answered = false;
      delete state.players[uid].eliminatedAt;
    }
    broadcastAll();
    return;
  }
  const takenNames = Object.entries(state.players).filter(([id]) => id !== uid).map(([, p]) => p.name);
  let uniqueName = name;
  let i = 2;
  while (takenNames.includes(uniqueName)) { uniqueName = `${name}${i++}`; }
  const inGame = ['PLAYING', 'ROUND_OVER', 'GAME_OVER', 'STARTING', 'TIMEOUT'].includes(state.status);
  // Players joining during ROUND_OVER wait until next full game, not next round
  const status = inGame ? 'waiting' : 'lobby';
  const joinedMidRound = state.status === 'ROUND_OVER';
  state.players[uid] = { name: uniqueName, status, joinedAt: Date.now(), answered: false, joinedMidRound };
  if (state.status === 'LOBBY' && lobbyPlayers().length >= MIN_PLAYERS && !state.timer) {
    log.game(`${lobbyPlayers().length} players in lobby, starting countdown (${LOBBY_WAIT}s)`);
    startLobbyTimer();
  }
  broadcastAll();
};

const playerLeft = (uid) => {
  if (!state.players[uid]) return;
  const name = state.players[uid]?.name ?? uid;
  const wasActive = state.players[uid].status === 'active';
  delete state.players[uid];
  delete state.votes[uid];
  log.game(`Player left: ${name} — lobby: ${lobbyPlayers().length}`);
  if (state.status === 'LOBBY' && lobbyPlayers().length < MIN_PLAYERS) clearTimer();
  if (Object.keys(state.players).length === 0) { resetLobby(); return; }
  broadcastAll();
  if (state.status === 'VOTING') {
    if (lobbyPlayers().length < MIN_PLAYERS) {
      // No hay suficientes jugadores para jugar
      clearTimer();
      state.status = 'LOBBY';
      state.voteRound = 0;
      state.votes = {};
      broadcastAll();
    } else {
      resolveVote(false);
    }
  } else if (state.status === 'STARTING') {
    const active = activePlayers();
    if (active.length < 2) {
      clearTimer();
      resetLobby();
    }
  } else if ((state.status === 'PLAYING' || state.status === 'TIMEOUT') && wasActive) {
    checkGameProgress();
  } else if (state.status === 'ROUND_OVER') {
    const active = activePlayers();
    // If 1 active player remains they win, regardless of waiting players
    // If 0 active players remain, reset to lobby (waiting players will join next game)
    if (active.length <= 1) {
      clearTimer();
      if (active.length === 1) endGame(active[0][0], active[0][1].name);
      else resetLobby();
    }
  }
};

// ── Voting ───────────────────────────────────────────────────────────────────

const openVote = (round, initialVotes = {}) => {
  state.status = 'VOTING';
  state.voteRound = round;
  state.votes = { ...initialVotes };
  log.game(`Vote round ${round}/${MAX_VOTE_ROUNDS} opened`);
  setTimer(VOTE_WAIT * 1000, () => resolveVote(true));
  broadcastAll();
};

const castVote = (uid, vote) => {
  if (state.status !== 'VOTING' && state.status !== 'LOBBY') return;
  if (!state.players[uid] || state.players[uid].status !== 'lobby') return;
  if (state.status === 'LOBBY') {
    if (vote === 'start') openVote(1, { [uid]: 'start' });
    return;
  }
  if (state.votes[uid]) return;
  state.votes[uid] = vote;
  const startCount = Object.values(state.votes).filter((v) => v === 'start').length;
  const waitCount = Object.values(state.votes).filter((v) => v === 'wait').length;
  log.game(`Vote: ${state.players[uid].name} → ${vote} (start: ${startCount}, wait: ${waitCount})`);
  broadcastAll();
  resolveVote(false);
};

const resolveVote = (forced) => {
  const lobby = lobbyPlayers();
  const voteValues = Object.values(state.votes);
  const allVoted = voteValues.length >= lobby.length;
  if (!forced && !allVoted) return;

  const startVotes = voteValues.filter((v) => v === 'start').length;
  const majority = startVotes > lobby.length / 2;
  const lastRound = state.voteRound >= MAX_VOTE_ROUNDS;
  log.game(`Resolving vote (forced: ${forced}) — start: ${startVotes}/${lobby.length}, majority: ${majority}, lastRound: ${lastRound}`);

  if (majority || (lastRound && lobby.length >= MIN_PLAYERS)) {
    startGame();
  } else if (lastRound) {
    // Not enough players even after max vote rounds, keep waiting
    state.status = 'LOBBY';
    state.voteRound = 0;
    state.votes = {};
    broadcastAll();
  } else {
    openVote(state.voteRound + 1);
  }
};

// ── Game ─────────────────────────────────────────────────────────────────────

const startGame = () => {
  clearTimer();
  state.status = 'STARTING';
  state.winner = null;
  state.votes = {};
  state.round = 0;
  state.sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  Object.entries(state.players).forEach(([, p]) => {
    if (p.status === 'lobby') { p.status = 'active'; p.answered = false; }
    else if (p.status === 'waiting') { p.status = 'active'; p.answered = false; delete p.joinedMidRound; }
  });
  log.game(`Game starting — active players: ${activePlayers().length}`);
  setTimer(3000, () => beginPlaying());
  broadcastAll();
};

const beginPlaying = () => {
  clearTimer();
  state.status = 'PLAYING';
  log.game(`Game started — active players: ${activePlayers().length}`);
  nextQuestion();
};

const nextQuestion = () => {
  clearTimer();
  state.status = 'PLAYING';
  state.round += 1;
  Object.entries(state.players).forEach(([, p]) => {
    if (p.status === 'waiting' && !p.joinedMidRound) { p.status = 'active'; p.answered = false; }
    else if (p.status === 'active') p.answered = false;
  });
  state.question = { ...generateQuestion(state.round), startedAt: Date.now() };
  log.game(`Round ${state.round} — Question: ${state.question.expression} = ${state.question.answer} — active: ${activePlayers().length}`);
  broadcastAll();
  setTimer(TIME_LIMIT * 1000, () => {
    state.status = 'TIMEOUT';
    broadcastAll();
    setTimeout(() => { eliminateUnanswered(); }, 800);
  });
};

const eliminateUnanswered = () => {
  const eliminatedUids = [];
  Object.entries(state.players).forEach(([uid, p]) => {
    if (p.status === 'active' && !p.answered) {
      p.status = 'eliminated';
      p.answered = true;
      p.eliminatedAt = Date.now();
      eliminatedUids.push(uid);
      onEvent({
        type: 'answer',
        uid,
        sessionId: state.sessionId,
        round: state.round,
        expression: state.question.expression,
        op: state.question.expression.match(/[+\-*/]/)?.[0] ?? '?',
        correct: false,
        timeout: true,
        responseTimeMs: null,
      });
    }
  });
  if (eliminatedUids.length) log.game(`Timeout — eliminated: ${eliminatedUids.length} players`);
  broadcastAll();
  checkGameProgress(eliminatedUids);
};

const submitAnswer = (uid, value) => {
  if (state.status !== 'PLAYING' && state.status !== 'TIMEOUT') return;
  const player = state.players[uid];
  if (!player || player.status !== 'active' || player.answered) return;

  player.answered = true;
  const correct = Math.abs(value) === Math.abs(state.question.answer);
  player.status = correct ? 'active' : 'eliminated';
  if (!correct) player.eliminatedAt = Date.now();
  log.game(`Answer: ${player.name} → ${value} (${correct ? 'correct' : 'wrong'})`);
  onEvent({
    type: 'answer',
    uid,
    sessionId: state.sessionId,
    round: state.round,
    expression: state.question.expression,
    op: state.question.expression.match(/[+\-*/]/)?.[0] ?? '?',
    correct,
    timeout: false,
    responseTimeMs: Date.now() - state.question.startedAt,
  });
  broadcastAll();
  checkGameProgress(!correct ? [uid] : []);
};

const checkGameProgress = (newlyEliminatedUids = []) => {
  if (state.status !== 'PLAYING' && state.status !== 'TIMEOUT') return;
  const active = activePlayers();
  if (active.length === 0) {
    endRound(null, true, newlyEliminatedUids);
    return;
  }
  if (active.length === 1) {
    endRound(active[0][0], false, newlyEliminatedUids);
    return;
  }
  if (active.every(([, p]) => p.answered)) endRound(null, false, newlyEliminatedUids);
};

const endRound = (winnerUid, noWinner = false, eliminatedUids = []) => {
  clearTimer();
  const eliminated = eliminatedUids
    .map((uid) => state.players[uid]?.name)
    .filter(Boolean);
  state.eliminatedThisRound = eliminated;
  state.status = 'ROUND_OVER';
  const winnerName = winnerUid ? state.players[winnerUid]?.name ?? null : null;
  log.game(`Round over — eliminated: ${eliminated.join(', ') || 'none'}, winner: ${winnerName ?? 'TBD'}`);
  broadcastAll();
  setTimer(ROUND_WAIT * 1000, () => {
    if (winnerUid) endGame(winnerUid, winnerName);
    else if (noWinner) endGame(null, null); // todos eliminados
    else nextQuestion();
  });
};

// ── Game Over ────────────────────────────────────────────────────────────────

const endGame = (winnerUid, winnerName) => {
  clearTimer();
  state.status = 'GAME_OVER';
  state.winner = winnerName ?? null;
  log.game(`Game over — winner: ${winnerName ?? 'nobody'}`);
  if (winnerUid) {
    onEvent({ type: 'game_over', uid: winnerUid, sessionId: state.sessionId, winner: true, totalRounds: state.round });
  } else {
    onEvent({ type: 'game_reset', sessionId: state.sessionId });
  }
  broadcastAll();
  setTimer(RESTART_WAIT * 1000, () => resetLobby());
};

const resetLobby = () => {
  clearTimer();
  state.status = 'LOBBY';
  state.question = null;
  state.voteRound = 0;
  state.votes = {};
  state.winner = null;
  state.eliminatedThisRound = [];
  state.round = 0;
  Object.entries(state.players).forEach(([, p]) => { p.status = 'lobby'; p.answered = false; delete p.eliminatedAt; delete p.joinedMidRound; });
  log.game(`Lobby reset — players: ${Object.keys(state.players).length}`);
  broadcastAll();
  if (lobbyPlayers().length >= MIN_PLAYERS) {
    log.game(`${lobbyPlayers().length} players already in lobby, starting countdown (${LOBBY_WAIT}s)`);
    startLobbyTimer();
  }
};

module.exports = { setBroadcast, setOnEvent, snapshot, snapshotWithAnswer: () => snapshot(true), playerJoined, playerLeft, castVote, submitAnswer };
