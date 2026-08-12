const MIN_PLAYERS = parseInt(process.env.MIN_PLAYERS) || 2;
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS) || 20;
const MAX_VOTE_ROUNDS = parseInt(process.env.MAX_VOTE_ROUNDS) || 2;
const TIME_LIMIT = parseInt(process.env.TIME_LIMIT) || 5;
const LOBBY_WAIT = parseInt(process.env.LOBBY_WAIT) || 15;
const VOTE_WAIT = parseInt(process.env.VOTE_WAIT) || 10;
const RESTART_WAIT = parseInt(process.env.RESTART_WAIT) || 5;
const ROUND_WAIT = parseInt(process.env.ROUND_WAIT) || 3;

module.exports = { MIN_PLAYERS, MAX_PLAYERS, MAX_VOTE_ROUNDS, TIME_LIMIT, LOBBY_WAIT, VOTE_WAIT, RESTART_WAIT, ROUND_WAIT };
