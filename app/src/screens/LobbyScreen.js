import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { leaveLobby, joinLobby, sendVote, MIN_PLAYERS, MAX_VOTE_ROUNDS } from '../services/game';
import { colors, fonts } from '../theme';
import NumPad from '../components/NumPad';
import LcdScreen from '../components/LcdScreen';
import CalcKey from '../components/CalcKey';
import BrandHeader from '../components/BrandHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { genQuestion } from '../utils/questions';
import { useCountdown } from '../hooks/useCountdown';
import LcdProgressBar from '../components/LcdProgressBar';
import LcdDivider from '../components/LcdDivider';

const PRACTICE_TIME = 5;

function PracticeGame({ playKey, padRef }) {
  const [question, setQuestion] = useState(genQuestion);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(PRACTICE_TIME);
  const [streak, setStreak] = useState(0);
  const answeredRef = useRef(false);
  const correctAnswerRef = useRef(question.answer);
  const timerRef = useRef(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  const nextQuestion = useCallback((currentStreak = 0) => {
    const q = genQuestion(currentStreak);
    setQuestion(q);
    correctAnswerRef.current = q.answer;
    answeredRef.current = false;
    setAnswer('');
    setResult(null);
    setTimeLeft(PRACTICE_TIME);
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

  const answerRef = useRef('');
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  useEffect(() => {
    if (padRef) padRef.current = { handlePad, submitCurrent: () => { const n = parseInt(answerRef.current); if (!isNaN(n)) resolve(n); } };
  });

  const resolve = (value) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    const correct = Math.abs(value) === Math.abs(correctAnswerRef.current);
    const newStreak = correct ? streak + 1 : 0;
    setResult(correct ? 'correct' : 'wrong');
    setStreak(newStreak);
    if (correct) {
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
    }
    setTimeout(() => { if (mountedRef.current) nextQuestion(newStreak); }, 1000);
  };

  const handlePad = (d) => {
    if (answeredRef.current) return;
    if (d === '⌫') { setAnswer((a) => a.slice(0, -1)); return; }
    setAnswer((a) => {
      if (a.length >= 4) return a;
      return a + d;
    });
  };

  useEffect(() => {
    if (!answer) return;
    const num = parseInt(answer);
    if (!isNaN(num) && num === Math.abs(correctAnswerRef.current)) resolve(num);
  }, [answer]);

  return (
    <View style={p.container}>
      <LcdProgressBar timeLeft={timeLeft} total={PRACTICE_TIME} />
      <View style={p.row}>
        <Text style={p.question}>{question.expression}</Text>
        {streak > 1 && <Text style={p.streak}>x{streak}</Text>}
      </View>
      <Animated.Text style={[p.display, { opacity: result === 'correct' ? blinkAnim : 1 }, (result === 'wrong' || result === 'timeout') && p.wrong]}>
        {result === 'wrong' || result === 'timeout' ? `${question.display}` : (answer || '_')}
      </Animated.Text>
    </View>
  );
}

const p = StyleSheet.create({
  container: { width: '100%', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, marginBottom: 4 },
  question: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdText, letterSpacing: 4 },
  streak: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, letterSpacing: 2 },
  display: { fontFamily: fonts.mono, fontSize: 24, color: colors.lcdText, textAlign: 'right', letterSpacing: 4 },
  correct: { color: colors.lcdText },
  wrong: { color: colors.lcdTextDim, opacity: 0.5 },
});

export default function LobbyScreen({ uid, gameState, connStatus, sound, navigation }) {
  const [myVote, setMyVote] = useState(null);
  const { countdown } = useCountdown(gameState?.timerEndsAt);

  const { playKey, playJoin, playVote } = sound;
  const prevPlayerCount = useRef(null);
  const prevStatus = useRef(null);
  const lobbyPlayers = gameState ? Object.entries(gameState.players || {}).filter(([, p]) => p.status === 'lobby') : [];

  const joinedRef = useRef(false);

  useEffect(() => {
    if (!gameState) return;
    const count = lobbyPlayers.length;
    const iAmInLobby = lobbyPlayers.some(([id]) => id === uid);
    if (!joinedRef.current) {
      if (iAmInLobby) joinedRef.current = true;
      prevPlayerCount.current = count;
      return;
    }
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
    if (connStatus === 'ready' && (!gameState || ['LOBBY', 'VOTING'].includes(gameState.status))) joinLobby();
  }, [connStatus, gameState?.status]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index]?.name;
        if (currentRoute !== 'Game' && currentRoute !== 'Stats' && currentRoute !== 'GameOver') leaveLobby();
      };
    }, [navigation])
  );

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'VOTING' || gameState.status === 'LOBBY') setMyVote(null);
    if (gameState.status === 'PLAYING') navigation.replace('Game');
    if (gameState.status === 'GAME_OVER') navigation.replace('GameOver');
  }, [gameState?.status, gameState?.voteRound]);

  const practicePadRef = useRef(null);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleVoteStart = useCallback(() => { if (myVote) return; setMyVote('start'); sendVote('start'); }, [myVote]);
  const handleVoteWait = useCallback(() => { if (myVote) return; setMyVote('wait'); sendVote('wait'); }, [myVote]);
  const handlePadPress = useCallback((d) => practicePadRef.current?.handlePad(d), []);
  const handlePadSubmit = useCallback(() => practicePadRef.current?.submitCurrent(), []);

  const ready = connStatus === 'ready';

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
    const lobbyPs = Object.entries(players).filter(([, p]) => p.status === 'lobby');
    const activePs = Object.entries(players).filter(([, p]) => p.status === 'active');
    const eliminatedPs = Object.entries(players).filter(([, p]) => p.status === 'eliminated');
    const waitingPs = Object.entries(players).filter(([, p]) => p.status === 'waiting');

    if (status === 'PLAYING' || players[uid]?.status === 'waiting') {
      return {
        status: 'PARTIDA EN CURSO',
        sub: `${activePs.length} JUGADORES ACTIVOS`,
        players: [
          ...activePs.map(([id, p]) => ({ id, name: p.name, tag: 'ACT' })),
          ...waitingPs.map(([id, p]) => ({ id, name: p.name, tag: 'ESP' })),
          ...eliminatedPs.map(([id, p]) => ({ id, name: p.name, tag: 'OUT' })),
        ],
      };
    }

    const startCount = Object.values(votes).filter((v) => v === 'start').length;
    const waitCount = Object.values(votes).filter((v) => v === 'wait').length;
    const voteInfo = status === 'VOTING' ? `  [${startCount}v ${waitCount}x]` : '';

    return {
      status: lobbyPs.length >= MIN_PLAYERS ? `LISTO${voteInfo}` : `ESPERANDO JUGADORES`,
      sub: `${lobbyPs.length}/${MIN_PLAYERS} CONECTADOS`,
      players: [
        ...lobbyPs.map(([id, p]) => ({ id, name: p.name, tag: id === uid ? ' <' : '' })),
        ...Array.from({ length: Math.max(0, MIN_PLAYERS - lobbyPs.length) }).map((_, i) => ({
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
      <BrandHeader sub="SALA DE ESPERA" compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleGoBack} style={s.backKey} />}
      />
      <Text style={s.lobbyHint}>PRACTICA MIENTRAS ESPERAS</Text>

        <LcdScreen style={s.lcd}>
          <View style={s.lcdHeader}>
            <Text style={s.lcdStatus}>{lcd.status}</Text>
            {countdown !== null && ready && <Text style={s.lcdCountdown}>{countdown}</Text>}
          </View>
          {lcd.players.length > 0 && (
            <View style={s.dotsRow}>
              {lcd.players.map((pl) => (
                <Icon
                  key={pl.id}
                  name={pl.tag === 'ACT' ? 'lightning-bolt' : pl.tag === 'OUT' ? 'skull' : pl.tag === 'ESP' ? 'timer-sand' : pl.empty ? 'circle-outline' : 'circle'}
                  size={12}
                  color={pl.empty ? colors.lcdTextDim : pl.id === uid ? colors.lcdText : colors.lcdTextDim}
                />
              ))}
            </View>
          )}
          <LcdDivider />
          <PracticeGame playKey={playKey} padRef={practicePadRef} />
        </LcdScreen>
      <View style={s.numPadWrap}>
        <NumPad
          playKey={playKey}
          onPress={handlePadPress}
          onSubmit={handlePadSubmit}
        />
      </View>

      {status === 'STARTING' && (
        <Animated.View style={s.startingOverlay}>
          <Text style={s.startingLabel}>COMIENZA EN</Text>
          <Text style={s.startingCountdown}>{countdown ?? 3}</Text>
          <Text style={s.startingSub}>PREPÁRATE</Text>
        </Animated.View>
      )}

      {showVote && (
        <View style={s.toast}>
          <Text style={s.voteTitle}>¿INICIAR CON {lobbyPlayers.length}?</Text>
          <Text style={s.voteSub}>SI NO VOTAS EL JUEGO INICIA SOLO</Text>
          {!hasVoted ? (
            <View style={s.voteButtons}>
              <CalcKey icon="play" label="INICIAR" variant="action" onPress={handleVoteStart} />
              <CalcKey icon="hand-back-right" label="ESPERAR" variant="secondary" onPress={handleVoteWait} />
            </View>
          ) : (
            <View style={s.votedRow}>
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


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 52 },
  backKey: { transform: [{ scale: 0.75 }], opacity: 0.8 },
  lobbyHint: { fontFamily: fonts.mono, fontSize: 9, color: colors.textMuted, letterSpacing: 1, marginBottom: 10 },
  lcd: { width: '100%' },
  lcdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lcdStatus: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdText, letterSpacing: 1, flex: 1 },
  lcdCountdown: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdText, letterSpacing: 1 },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  numPadWrap: { marginTop: 16 },

  toast: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border, borderBottomWidth: 4, borderBottomColor: colors.keyShadow, padding: 16, alignItems: 'center', width: '80%', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  voteTitle: { fontFamily: fonts.bodyBold, color: colors.textPrimary, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  voteSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  voteButtons: { flexDirection: 'row', gap: 10 },
  votedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voted: { fontFamily: fonts.mono, color: colors.lcdText, backgroundColor: colors.lcdBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3, fontSize: 13, letterSpacing: 1 },
  startingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,15,0.95)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startingLabel: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, letterSpacing: 3 },
  startingCountdown: { fontFamily: fonts.title, fontSize: 120, color: colors.accent, lineHeight: 120 },
  startingSub: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textMuted, letterSpacing: 4 },
});
