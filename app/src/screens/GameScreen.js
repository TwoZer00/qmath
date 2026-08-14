import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sendAnswer, leaveLobby } from '../services/game';
import { colors, shared, fonts } from '../theme';
import LcdProgressBar from '../components/LcdProgressBar';
import LcdScreen from '../components/LcdScreen';
import NumPad from '../components/NumPad';
import CalcKey from '../components/CalcKey';
import BrandHeader from '../components/BrandHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const DEFAULT_TIME_LIMIT = parseInt(process.env.EXPO_PUBLIC_TIME_LIMIT) || 5;

export default function GameScreen({ uid, gameState, connStatus, sound, navigation }) {
  const handleExit = useCallback(() => { leaveLobby(); navigation.replace('Home'); }, [navigation]);
  const TIME_LIMIT = gameState?.timeLimit ?? DEFAULT_TIME_LIMIT;
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);
  const eliminatedRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevEliminated = useRef(false);
  const prevStatus = useRef(null);
  const prevRoundOver = useRef(false);
  const prevTimeLeft = useRef(TIME_LIMIT);

  const question = gameState?.question;
  const players = gameState?.players ?? {};
  const me = players[uid];
  const eliminated = me?.status === 'eliminated';
  useEffect(() => { eliminatedRef.current = eliminated; }, [eliminated]);
  const isRoundOver = gameState?.status === 'ROUND_OVER';
  const isTimeout = gameState?.status === 'TIMEOUT';
  const answered = me?.answered && !eliminated && !isRoundOver && (gameState?.status === 'PLAYING' || isTimeout);
  const eliminatedThisRound = gameState?.eliminatedThisRound || [];
  const activePlayers = useMemo(
    () => Object.entries(players).filter(([, p]) => p.status === 'active'),
    [players]
  );
  const { playKey, playCorrect, playError, playEliminated, playTick, playRoundOver, playVictory } = sound;

  useEffect(() => {
    if (eliminated && !prevEliminated.current) {
      playError();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    prevEliminated.current = eliminated;
  }, [eliminated]);

  useEffect(() => {
    if (gameState?.status === 'GAME_OVER') { navigation.replace('GameOver'); return; }
    if (gameState?.status === 'LOBBY') { navigation.replace('Lobby'); return; }
    if (gameState?.status === 'TIMEOUT') {
      clearInterval(timerRef.current);
    }
    if (gameState?.status === 'ROUND_OVER') {
      clearInterval(timerRef.current);
    }
    prevStatus.current = gameState?.status;
  }, [gameState?.status]);

  useEffect(() => {
    if (!question?.startedAt) return;
    answeredRef.current = false;
    setAnswer('');
    setTimeLeft(TIME_LIMIT);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question?.startedAt]);

  useEffect(() => {
    if (isRoundOver && !prevRoundOver.current) {
      playRoundOver();
      if (eliminatedThisRound.length > 0) setTimeout(() => playEliminated(), 400);
    }
    prevRoundOver.current = isRoundOver;
  }, [isRoundOver, eliminatedThisRound]);

  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTimeLeft.current && !answered && !eliminated) playTick();
    prevTimeLeft.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => { if (answered) playCorrect(); }, [answered]);

  const myName = players[uid]?.name;
  useEffect(() => {
    if (gameState?.status === 'GAME_OVER' && gameState?.winner && gameState.winner === myName) playVictory();
  }, [gameState?.status, myName]);

  const questionRef = useRef(question);
  useEffect(() => { questionRef.current = question; }, [question]);

  const handleNumPress = useCallback((d) => {
    if (answeredRef.current || eliminatedRef.current) return;
    if (d === '⌫') { setAnswer((a) => a.slice(0, -1)); return; }
    setAnswer((a) => {
      if (a.length >= 4) return a;
      return a + d;
    });
  }, []);

  useEffect(() => {
    if (!answer) return;
    const num = parseInt(answer);
    if (!isNaN(num) && num === Math.abs(questionRef.current?.answer)) resolve(num);
  }, [answer]);

  const handleNumSubmit = useCallback(() => {
    if (answer !== '') resolve(parseInt(answer));
  }, [answer]);

  const resolve = (value) => {
    if (answeredRef.current || eliminatedRef.current || isNaN(value)) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    sendAnswer(value);
  };

  const round = gameState?.round ?? 1;
  const diffLabel = round <= 2 ? '+  −' : round <= 5 ? '+  −  ±' : round <= 9 ? '+  −  ×' : '+  −  ×  ÷';


  if (!question) {
    return (
      <View style={s.container}>
      <BrandHeader sub={`RONDA ${round}`} compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleExit} />}
      />
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <Text style={s.lcdSub}>SIGUIENTE RONDA...</Text>
          </LcdScreen>
        </View>
      </View>
    );
  }

  const disconnected = connStatus !== 'ready';

  return (
    <View style={s.container}>
      <Animated.View style={[StyleSheet.absoluteFill, s.flash, { opacity: flashAnim }]} pointerEvents="none" />
      {disconnected && (
        <View style={s.disconnectBanner}>
          <Text style={s.disconnectText}>⚠ Reconectando...</Text>
        </View>
      )}
      <BrandHeader sub={`RONDA ${round}`} compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleExit} />}
        right={<Text style={s.timer}>{timeLeft}s</Text>}
      />

      {isRoundOver ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            {eliminatedThisRound.length > 0 ? (
              <>
                <View style={s.iconRowMb8}>
                  <Icon name="skull" size={16} color={colors.lcdText} />
                  <Text style={s.lcdTitle}>ELIMINADOS</Text>
                </View>
                {eliminatedThisRound.map((name) => (
                  <Text key={name} style={s.lcdEliminated}>{name}</Text>
                ))}
              </>
            ) : (
              <View style={s.iconRow}>
                <Icon name="check-all" size={16} color={colors.lcdText} />
                <Text style={s.lcdTitle}>TODOS RESPONDIERON</Text>
              </View>
            )}
            <Text style={s.lcdSub}>{activePlayers.length} JUGADORES SIGUEN</Text>
            {question?.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
          </LcdScreen>
        </View>
      ) : eliminated ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <View style={s.iconRowMb4}>
              <Icon name="skull-outline" size={18} color={colors.lcdText} />
              <Text style={s.lcdEliminated}>ELIMINADO</Text>
            </View>
            {question.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
            <Text style={s.lcdSub}>MIRANDO PARTIDA...</Text>
            <Text style={s.lcdQuestion}>{question.expression} = ?</Text>
          </LcdScreen>
        </View>
      ) : answered ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <View style={s.iconRowMb4}>
              <Icon name="check-circle-outline" size={18} color={colors.lcdText} />
              <Text style={s.lcdCorrect}>OK</Text>
            </View>
            {question.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
            <Text style={s.lcdSub}>ESPERANDO...</Text>
          </LcdScreen>
        </View>
      ) : (
        <View style={s.gameBox}>
          <LcdScreen style={s.lcdMain}>
            <LcdProgressBar timeLeft={timeLeft} total={TIME_LIMIT} />
            <Text style={s.lcdExpr}>{question.expression}</Text>
            <Text style={s.lcdDisplay}>{answer || '_'}</Text>
          </LcdScreen>
          <NumPad
            playKey={playKey}
            onPress={handleNumPress}
            onSubmit={handleNumSubmit}
            focusKey={question?.startedAt}
          />
        </View>
      )}

      <View style={s.playerList}>
        {activePlayers.map(([id, p]) => (
          <Text key={id} style={[s.playerName, id === uid && s.playerSelf, p.answered && s.playerAnswered]}>
            {p.answered ? '✓ ' : ''}{p.name}
          </Text>
        ))}
      </View>
    </View>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 52 },
  disconnectBanner: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.accent, paddingVertical: 6, alignItems: 'center', zIndex: 200 },
  disconnectText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 12, letterSpacing: 1 },
  flash: { backgroundColor: colors.accent, zIndex: 99 },
  timer: { fontFamily: fonts.mono, color: colors.lcdText, backgroundColor: colors.lcdBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, fontSize: 14, letterSpacing: 1 },
  gameBox: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 16 },
  lcdMain: { width: '100%', marginBottom: 16, minHeight: 120, justifyContent: 'space-between' },
  lcdCenter: { width: '100%', alignItems: 'center' },
  lcdExpr: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdTextDim, letterSpacing: 2, marginBottom: 8 },
  lcdDisplay: { fontFamily: fonts.mono, fontSize: 56, color: colors.lcdText, letterSpacing: 4, textAlign: 'right' },
  lcdTitle: { fontFamily: fonts.mono, fontSize: 16, color: colors.lcdText, letterSpacing: 1, marginBottom: 8 },
  lcdEliminated: { fontFamily: fonts.mono, fontSize: 20, color: colors.lcdText, letterSpacing: 1, marginBottom: 4 },
  lcdCorrect: { fontFamily: fonts.mono, fontSize: 40, color: colors.lcdText, letterSpacing: 4, marginBottom: 8 },
  lcdAnswer: { fontFamily: fonts.mono, fontSize: 22, color: colors.lcdText, letterSpacing: 2, marginBottom: 8 },
  lcdQuestion: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdTextDim, letterSpacing: 2, marginTop: 12 },
  lcdSub: { fontFamily: fonts.mono, fontSize: 12, color: colors.lcdTextDim, letterSpacing: 1, marginTop: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconRowMb4: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  iconRowMb8: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  playerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingTop: 12 },
  playerName: shared.chip,
  playerSelf: { color: colors.keyTextAlt, borderColor: colors.keyTextAlt },
  playerAnswered: { color: colors.success, borderColor: colors.success },
});
