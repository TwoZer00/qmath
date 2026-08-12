import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { leaveLobby, joinLobby, sendVote, MIN_PLAYERS, MAX_VOTE_ROUNDS } from '../services/game';
import Svg, { Circle } from 'react-native-svg';
import { colors, shared, fonts } from '../theme';
import NumPad from '../components/NumPad';
import LcdScreen from '../components/LcdScreen';
import CalcKey from '../components/CalcKey';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

function AnimatedPlayer({ children, id }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

const PRACTICE_TIME = 5;

function genQuestion(streak = 0) {
  let op, res;
  if (streak < 3) {
    op = Math.random() > 0.5 ? '+' : '-';
    const x = Math.floor(Math.random() * 20) + 1;
    const y = Math.floor(Math.random() * 20) + 1;
    const a = op === '-' && x < y ? y : x;
    const b = op === '-' && x < y ? x : y;
    res = op === '+' ? a + b : a - b;
    return { expression: `${a} ${op} ${b}`, answer: res, display: res };
  } else if (streak < 6) {
    op = Math.random() > 0.5 ? '+' : '-';
    const x = Math.floor(Math.random() * 50) + 1;
    const y = Math.floor(Math.random() * 50) + 1;
    const a = op === '-' && x < y ? y : x;
    const b = op === '-' && x < y ? x : y;
    res = op === '+' ? a + b : a - b;
    return { expression: `${a} ${op} ${b}`, answer: res, display: res };
  } else if (streak < 10) {
    const ops = ['+', '-', '*'];
    op = ops[Math.floor(Math.random() * ops.length)];
    let x = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
    let y = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
    if (op === '-' && x < y) { const tmp = x; x = y; y = tmp; }
    res = op === '+' ? x + y : op === '-' ? x - y : x * y;
    return { expression: `${x} ${op} ${y}`, answer: res, display: res };
  } else {
    const ops = ['+', '-', '*', '/'];
    op = ops[Math.floor(Math.random() * ops.length)];
    let x, y;
    if (op === '/') {
      y = Math.floor(Math.random() * 11) + 2;
      x = y * (Math.floor(Math.random() * 11) + 2);
    } else if (op === '*') {
      x = Math.floor(Math.random() * 15) + 2;
      y = Math.floor(Math.random() * 15) + 2;
    } else {
      x = Math.floor(Math.random() * 100) + 1;
      y = Math.floor(Math.random() * 100) + 1;
    }
    if (op === '-' && x < y) { const tmp = x; x = y; y = tmp; }
    res = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y;
    return { expression: `${x} ${op} ${y}`, answer: res, display: res };
  }
}

function PracticeGame({ playKey }) {
  const [question, setQuestion] = useState(genQuestion);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(PRACTICE_TIME);
  const [streak, setStreak] = useState(0);
  const answeredRef = useRef(false);
  const correctAnswerRef = useRef(question.answer);
  const timerRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef(null);

  const nextQuestion = useCallback((currentStreak = 0) => {
    const q = genQuestion(currentStreak);
    setQuestion(q);
    correctAnswerRef.current = q.answer;
    answeredRef.current = false;
    setAnswer('');
    setResult(null);
    setTimeLeft(PRACTICE_TIME);
    progressAnim.setValue(1);
    animRef.current?.stop();
    animRef.current = Animated.timing(progressAnim, { toValue: 0, duration: PRACTICE_TIME * 1000, useNativeDriver: false });
    animRef.current.start();
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => { nextQuestion(0); }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            answeredRef.current = true;
            if (mountedRef.current) {
              setResult('timeout');
              setStreak(0);
              setTimeout(() => { if (mountedRef.current) nextQuestion(0); }, 1200);
            }
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question]);

  const resolve = (value) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    animRef.current?.stop();
    const correct = value === correctAnswerRef.current;
    const newStreak = correct ? streak + 1 : 0;
    setResult(correct ? 'correct' : 'wrong');
    setStreak(newStreak);
    setTimeout(() => { if (mountedRef.current) nextQuestion(newStreak); }, 1000);
  };

  const handlePad = (d) => {
    if (answeredRef.current) return;
    let next;
    if (d === '⌫') next = answer.slice(0, -1);
    else if (answer.length >= 4) next = answer;
    else if (d === '0' && answer === '') { resolve(0); return; }
    else next = answer + d;
    setAnswer(next);
    const num = parseInt(next);
    if (!isNaN(num) && num === correctAnswerRef.current) resolve(num);
  };

  return (
    <View style={p.container}>
      {/* LCD de práctica */}
      <LcdScreen style={p.lcd}>
        <View style={p.lcdTop}>
          <Text style={p.lcdLabel}>PRACTICA</Text>
          {streak >= 2 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Icon name="fire" size={14} color={colors.lcdText} />
              <Text style={p.streak}>{streak}</Text>
            </View>
          )}
          <Text style={p.timer}>{timeLeft}s</Text>
        </View>
        <Animated.View style={[p.bar, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }]} />
        <Text style={p.question}>{question.expression}</Text>
        <Text style={[p.display, result === 'correct' && p.displayCorrect, result === 'wrong' && p.displayWrong]}>
          {result ? question.display : (answer || '_')}
        </Text>
      </LcdScreen>
      <NumPad playKey={playKey} onPress={handlePad} onSubmit={() => { if (answer !== '') resolve(parseInt(answer)); }} disabled={!!result} />
    </View>
  );
}

function CountdownRing({ countdown, total, size = 80 }) {
  const R = size / 2 - 8, CIRC = 2 * Math.PI * R;
  const cx = size / 2, cy = size / 2;
  const progress = total > 0 ? countdown / total : 0;
  return (
    <View style={[ring.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} stroke={colors.border} strokeWidth={6} fill="none" />
        <Circle cx={cx} cy={cy} r={R} stroke={countdown <= 3 ? colors.accent : colors.lcdBg}
          strokeWidth={6} fill="none" strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)} strokeLinecap="round"
          rotation="-90" origin={`${cx},${cy}`} />
      </Svg>
      <Text style={[ring.text, { fontSize: size * 0.3 }]}>{countdown}</Text>
    </View>
  );
}

export default function LobbyScreen({ uid, gameState, connStatus, sound, navigation }) {
  const [myVote, setMyVote] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const totalDuration = useRef(null);

  const { playKey, playJoin, playVote } = sound;
  const prevPlayerCount = useRef(0);
  const prevStatus = useRef(null);
  const lobbyPlayers = gameState ? Object.entries(gameState.players || {}).filter(([, p]) => p.status === 'lobby') : [];

  useEffect(() => {
    const count = lobbyPlayers.length;
    if (count > prevPlayerCount.current) playJoin();
    prevPlayerCount.current = count;
  }, [lobbyPlayers.length]);

  useEffect(() => {
    if (!gameState) return;
    const s = gameState.status;
    if ((s === 'VOTING') && prevStatus.current !== 'VOTING') playVote();
    prevStatus.current = s;
  }, [gameState?.status]);

  useEffect(() => {
    if (connStatus === 'ready' && (!gameState || gameState.status === 'LOBBY' || gameState.status === 'VOTING')) joinLobby();
  }, [connStatus]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index]?.name;
        if (currentRoute !== 'Game' && currentRoute !== 'Stats') leaveLobby();
      };
    }, [])
  );

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'VOTING' || gameState.status === 'LOBBY') setMyVote(null);
    if (gameState.status === 'PLAYING') navigation.replace('Game');
  }, [gameState?.status, gameState?.voteRound]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameState?.timerEndsAt) { setCountdown(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((gameState.timerEndsAt - Date.now()) / 1000));
      setCountdown(secs);
      if (secs === 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [gameState?.timerEndsAt]);

  useEffect(() => {
    if (gameState?.timerEndsAt && !totalDuration.current) {
      totalDuration.current = Math.ceil((gameState.timerEndsAt - Date.now()) / 1000);
    }
    if (!gameState?.timerEndsAt) totalDuration.current = null;
  }, [gameState?.timerEndsAt]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleVoteStart = useCallback(() => { if (myVote) return; setMyVote('start'); sendVote('start'); }, [myVote]);
  const handleVoteWait = useCallback(() => { if (myVote) return; setMyVote('wait'); sendVote('wait'); }, [myVote]);

  const ready = connStatus === 'ready';

  // Estado LCD según contexto
  const getLcdContent = () => {
    if (!ready) {
      const isWaking = connStatus === 'waking';
      const isError = connStatus === 'error';
      return {
        status: isError ? 'ERROR DE AUTH' : isWaking ? 'DESPERTANDO...' : 'CONECTANDO...',
        sub: isError ? 'REINICIA LA APP' : isWaking ? 'SERVIDOR INACTIVO' : 'BUSCANDO SERVIDOR',
        players: [],
      };
    }
    if (!gameState) return { status: 'CONECTANDO...', sub: '', players: [] };

    const { status, players = {}, votes = {} } = gameState;
    const lobbyPlayers = Object.entries(players).filter(([, p]) => p.status === 'lobby');
    const activePlayers = Object.entries(players).filter(([, p]) => p.status === 'active');
    const eliminatedPlayers = Object.entries(players).filter(([, p]) => p.status === 'eliminated');
    const waitingPlayers = Object.entries(players).filter(([, p]) => p.status === 'waiting');

    if (status === 'PLAYING' || players[uid]?.status === 'waiting') {
      return {
        status: 'PARTIDA EN CURSO',
        sub: `${activePlayers.length} JUGADORES ACTIVOS`,
        players: [
          ...activePlayers.map(([id, p]) => ({ id, name: p.name, tag: 'ACT' })),
          ...waitingPlayers.map(([id, p]) => ({ id, name: p.name, tag: 'ESP' })),
          ...eliminatedPlayers.map(([id, p]) => ({ id, name: p.name, tag: 'OUT' })),
        ],
      };
    }

    const startCount = Object.values(votes).filter((v) => v === 'start').length;
    const waitCount = Object.values(votes).filter((v) => v === 'wait').length;
    const voteInfo = status === 'VOTING' ? `  [${startCount}v ${waitCount}x]` : '';

    return {
      status: lobbyPlayers.length >= MIN_PLAYERS
        ? `LISTO${voteInfo}`
        : `ESPERANDO JUGADORES`,
      sub: `${lobbyPlayers.length}/${MIN_PLAYERS} CONECTADOS`,
      players: [
        ...lobbyPlayers.map(([id, p]) => ({ id, name: p.name, tag: id === uid ? ' <' : '' })),
        ...Array.from({ length: Math.max(0, MIN_PLAYERS - lobbyPlayers.length) }).map((_, i) => ({
          id: `empty-${i}`, name: '???', tag: '', empty: true,
        })),
      ],
    };
  };

  const lcd = getLcdContent();
  const { status, votes = {} } = gameState || {};
  const hasVoted = myVote || (status === 'VOTING' && !!votes[uid]);
  const showVote = ready && gameState && (status === 'VOTING' || (status === 'LOBBY' && lobbyPlayers.length >= MIN_PLAYERS));

  return (
    <View style={s.container}>
      {/* Zona superior — cuerpo de calculadora */}
      <View style={s.calcBody}>
        <View style={shared.brandRow}>
          <Text style={shared.brandModel}>fx-BATTLE</Text>
          <CalcKey icon="arrow-left" variant="fn" onPress={handleGoBack} style={s.backKey} />
        </View>

        <LcdScreen style={s.lcd}>
          <View style={s.lcdHeader}>
            <Text style={s.lcdStatus}>{lcd.status}</Text>
            {countdown !== null && ready && (
              <CountdownRing countdown={countdown} total={totalDuration.current || countdown} size={48} />
            )}
          </View>
          <Text style={s.lcdSub}>{lcd.sub}</Text>
          <View style={s.lcdDivider} />
          {lcd.players.map((pl) => (
            <AnimatedPlayer key={pl.id} id={pl.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 1 }}>
                <Icon
                  name={pl.tag === 'ACT' ? 'lightning-bolt' : pl.tag === 'OUT' ? 'skull' : pl.tag === 'ESP' ? 'timer-sand' : pl.id === uid ? 'chevron-right' : 'account'}
                  size={11}
                  color={pl.empty ? colors.lcdTextDim : pl.id === uid ? colors.lcdText : colors.lcdTextDim}
                />
                <Text style={[s.lcdPlayer, pl.empty && s.lcdPlayerEmpty, pl.id === uid && s.lcdPlayerSelf]}>
                  {pl.name}
                </Text>
              </View>
            </AnimatedPlayer>
          ))}
        </LcdScreen>
      </View>

      {/* Zona inferior — práctica */}
      <View style={s.practiceZone}>
        <PracticeGame playKey={playKey} />
      </View>

      {/* Toast de votación */}
      {showVote && (
        <View style={s.toast}>
          <Text style={s.voteTitle}>¿INICIAR CON {lobbyPlayers.length}?</Text>
          {!hasVoted ? (
            <View style={s.voteButtons}>
              <CalcKey icon="play" label="INICIAR" variant="action" onPress={handleVoteStart} />
              <CalcKey icon="hand-back-right" label="ESPERAR" variant="secondary" onPress={handleVoteWait} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={(myVote || votes[uid]) === 'start' ? 'play' : 'hand-back-right'} size={13} color={colors.lcdText} />
              <Text style={s.voted}>
                {(myVote || votes[uid]) === 'start' ? 'INICIAR' : 'ESPERAR'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { position: 'absolute', fontFamily: fonts.mono, color: colors.lcdText, letterSpacing: 1 },
});

const p = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  lcd: { width: '100%', marginBottom: 12 },
  lcdTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  lcdLabel: { fontFamily: fonts.bodyBold, color: colors.lcdTextDim, fontSize: 10, letterSpacing: 2 },
  streak: { fontFamily: fonts.bodyBold, color: colors.lcdText, fontSize: 13 },
  timer: { fontFamily: fonts.mono, color: colors.lcdText, fontSize: 14, letterSpacing: 1 },
  bar: { height: 2, backgroundColor: colors.lcdTextDim, borderRadius: 0, marginBottom: 10, width: '100%' },
  question: { fontFamily: fonts.mono, fontSize: 36, color: colors.lcdText, letterSpacing: 4, marginBottom: 4 },
  display: { fontFamily: fonts.mono, fontSize: 32, color: colors.lcdText, textAlign: 'right', letterSpacing: 4 },
  displayCorrect: { color: colors.lcdText },
  displayWrong: { opacity: 0.4 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 52 },
  calcBody: { paddingHorizontal: 16, marginBottom: 12 },
  backKey: { transform: [{ scale: 0.75 }], opacity: 0.8 },
  lcd: { width: '100%' },
  lcdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  lcdStatus: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdText, letterSpacing: 1, flex: 1 },
  lcdSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 1, marginBottom: 6 },
  lcdDivider: { height: 1, backgroundColor: colors.lcdTextDim, opacity: 0.3, marginBottom: 6 },
  lcdPlayer: { fontFamily: fonts.mono, fontSize: 12, color: colors.lcdText, letterSpacing: 1, paddingVertical: 1 },
  lcdPlayerEmpty: { color: colors.lcdTextDim, opacity: 0.5 },
  lcdPlayerSelf: { color: colors.lcdText },
  practiceZone: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  toast: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border, borderBottomWidth: 4, borderBottomColor: colors.keyShadow, padding: 16, alignItems: 'center', width: '80%', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  voteTitle: { fontFamily: fonts.bodyBold, color: colors.textPrimary, fontSize: 14, letterSpacing: 2, marginBottom: 12 },
  voteButtons: { flexDirection: 'row', gap: 10 },
  voted: { fontFamily: fonts.mono, color: colors.lcdText, backgroundColor: colors.lcdBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3, fontSize: 13, letterSpacing: 1 },
});
