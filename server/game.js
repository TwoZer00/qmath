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
  players: Object.fromEntries(
    Object.entries(state.players).map(([id, p]) => [id, { ...p }])
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
  // Reconnect: player already exists, just broadcast current state
  if (state.players[uid]) { broadcastAll(); return; }
  const takenNames = Object.entries(state.players).filter(([id]) => id !== uid).map(([, p]) => p.name);
  let uniqueName = name;
  let i = 2;
  while (takenNames.includes(uniqueName)) { uniqueName = `${name}${i++}`; }
  const inGame = ['PLAYING', 'ROUND_OVER', 'GAME_OVER'].includes(state.status);
  const status = inGame ? 'waiting' : 'lobby';
  state.players[uid] = { name: uniqueName, status, joinedAt: Date.now(), answered: false };
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
  if (state.status === 'VOTING') resolveVote(false);
  else if (state.status === 'PLAYING' && wasActive) checkGameProgress();
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
  state.status = 'PLAYING';
  state.winner = null;
  state.votes = {};
  state.round = 0;
  state.sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  Object.entries(state.players).forEach(([, p]) => {
    if (p.status === 'lobby') {
      p.status = 'active';
      p.answered = false;
    } else if (p.status === 'waiting') {
      // Keep waiting players out of this game, they join next round
      p.answered = false;
    }
  });
  log.game(`Game started — active players: ${activePlayers().length}`);
  nextQuestion();
};

const nextQuestion = () => {
  clearTimer();
  state.status = 'PLAYING';
  state.round += 1;
  Object.entries(state.players).forEach(([, p]) => {
    if (p.status === 'waiting') { p.status = 'active'; p.answered = false; }
    else if (p.status === 'active') p.answered = false;
  });
  state.question = { ...generateQuestion(state.round), startedAt: Date.now() };
  log.game(`Round ${state.round} — Question: ${state.question.expression} = ${state.question.answer} — active: ${activePlayers().length}`);
  broadcastAll();
  setTimer(TIME_LIMIT * 1000, () => eliminateUnanswered());
};

const eliminateUnanswered = () => {
  const eliminated = [];
  Object.entries(state.players).forEach(([uid, p]) => {
    if (p.status === 'active' && !p.answered) {
      p.status = 'eliminated';
      p.answered = true;
      eliminated.push(uid);
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
  if (eliminated.length) log.game(`Timeout — eliminated: ${eliminated.length} players`);
  broadcastAll();
  checkGameProgress();
};

const submitAnswer = (uid, value) => {
  if (state.status !== 'PLAYING') return;
  const player = state.players[uid];
  if (!player || player.status !== 'active' || player.answered) return;

  player.answered = true;
  const correct = value === state.question.answer;
  player.status = correct ? 'active' : 'eliminated';
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
  checkGameProgress();
};

const checkGameProgress = () => {
  if (state.status !== 'PLAYING') return;
  const active = activePlayers();
  if (active.length <= 1) {
    endRound(active[0]?.[0] ?? null);
    return;
  }
  if (active.every(([, p]) => p.answered)) endRound(null);
};

const endRound = (winnerUid) => {
  clearTimer();
  const eliminated = Object.values(state.players)
    .filter((p) => p.status === 'eliminated' && p.answered)
    .map((p) => p.name);
  state.eliminatedThisRound = eliminated;
  state.status = 'ROUND_OVER';
  const winnerName = winnerUid ? state.players[winnerUid]?.name ?? null : null;
  log.game(`Round over — eliminated: ${eliminated.join(', ') || 'none'}, winner: ${winnerName ?? 'TBD'}`);
  broadcastAll();
  setTimer(ROUND_WAIT * 1000, () => {
    log.game(`Round wait done — winner: ${winnerName ?? 'none'}, calling ${winnerUid !== null ? 'endGame' : 'nextQuestion'}`);
    if (winnerUid !== null) endGame(winnerUid, winnerName);
    else nextQuestion();
  });
};

// ── Game Over ────────────────────────────────────────────────────────────────

const endGame = (winnerUid, winnerName) => {
  clearTimer();
  state.status = 'GAME_OVER';
  state.winner = winnerName;
  log.game(`Game over — winner: ${winnerName}`);
  onEvent({ type: 'game_over', uid: winnerUid, sessionId: state.sessionId, winner: true, totalRounds: state.round });
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
  Object.entries(state.players).forEach(([, p]) => { p.status = 'lobby'; p.answered = false; });
  log.game(`Lobby reset — players: ${Object.keys(state.players).length}`);
  broadcastAll();
};

module.exports = { setBroadcast, setOnEvent, snapshot, snapshotWithAnswer: () => snapshot(true), playerJoined, playerLeft, castVote, submitAnswer };
