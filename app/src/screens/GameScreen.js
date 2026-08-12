import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sendAnswer, leaveLobby } from '../services/game';
import { colors, shared, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import NumPad from '../components/NumPad';
import CalcKey from '../components/CalcKey';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const TIME_LIMIT = parseInt(process.env.EXPO_PUBLIC_TIME_LIMIT) || 5;

export default function GameScreen({ uid, gameState, connStatus, sound, navigation }) {
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const progressAnimRef = useRef(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevEliminated = useRef(false);
  const prevStatus = useRef(null);
  const prevRoundOver = useRef(false);
  const prevTimeLeft = useRef(TIME_LIMIT);

  const question = gameState?.question;
  const players = gameState?.players || {};
  const me = players[uid];
  const eliminated = me?.status === 'eliminated';
  const isRoundOver = gameState?.status === 'ROUND_OVER';
  const answered = me?.answered && !isRoundOver && gameState?.status === 'PLAYING';
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
    if (gameState?.status === 'ROUND_OVER') { clearInterval(timerRef.current); progressAnimRef.current?.stop(); }
    prevStatus.current = gameState?.status;
  }, [gameState?.status]);

  useEffect(() => {
    if (!question?.startedAt) return;
    answeredRef.current = false;
    setAnswer('');
    setTimeLeft(TIME_LIMIT);
    progressAnimRef.current?.stop();
    progressAnim.setValue(1);
    progressAnimRef.current = Animated.timing(progressAnim, { toValue: 0, duration: TIME_LIMIT * 1000, useNativeDriver: false });
    progressAnimRef.current.start();
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
  }, [isRoundOver]);

  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTimeLeft.current && !answered && !eliminated) playTick();
    prevTimeLeft.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => { if (answered) playCorrect(); }, [answered]);

  useEffect(() => {
    if (gameState?.status === 'GAME_OVER' && gameState?.winner === players[uid]?.name) playVictory();
  }, [gameState?.status]);

  const resolve = (value) => {
    if (answeredRef.current || eliminated || isNaN(value)) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    progressAnimRef.current?.stop();
    sendAnswer(value);
  };

  const round = gameState?.round ?? 1;
  const diffLabel = round <= 2 ? '+  −' : round <= 5 ? '+  −  ±' : round <= 9 ? '+  −  ×' : '+  −  ×  ÷';

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.4, 0.7, 1],
    outputRange: [colors.accent, colors.warning, colors.success, colors.success],
  });

  if (!question) return null;

  const disconnected = connStatus !== 'ready';

  return (
    <View style={s.container}>
      <Animated.View style={[StyleSheet.absoluteFill, s.flash, { opacity: flashAnim }]} pointerEvents="none" />
      {disconnected && (
        <View style={s.disconnectBanner}>
          <Text style={s.disconnectText}>⚠ Reconectando...</Text>
        </View>
      )}
      <View style={s.exitBtn}>
        <CalcKey icon="arrow-left" variant="fn" onPress={() => { leaveLobby(); navigation.replace('Home'); }} />
      </View>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.playersLeft}><Icon name="account-group" size={14} color={colors.textSecondary} /> {activePlayers.length}</Text>
        <Text style={s.round}>R{round}  <Text style={s.diff}>{diffLabel}</Text></Text>
        <Text style={s.timer}>{timeLeft}s</Text>
      </View>
      <Animated.View style={[shared.progressBar, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }), backgroundColor: progressColor, marginBottom: 16 }]} />

      {isRoundOver ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            {eliminatedThisRound.length > 0 ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="skull" size={16} color={colors.lcdText} />
                  <Text style={s.lcdTitle}>ELIMINADOS</Text>
                </View>
                {eliminatedThisRound.map((name) => (
                  <Text key={name} style={s.lcdEliminated}>{name}</Text>
                ))}
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
            <Text style={s.lcdExpr}>{question.expression}</Text>
            <Text style={s.lcdDisplay}>{answer || '_'}</Text>
          </LcdScreen>
          <NumPad
            playKey={playKey}
            onPress={(d) => {
              if (answeredRef.current || eliminated) return;
              let next;
              if (d === '⌫') next = answer.slice(0, -1);
              else if (answer.length >= 4) next = answer;
              else if (d === '0' && answer === '') { resolve(0); return; }
              else next = answer + d;
              setAnswer(next);
            }}
            onSubmit={() => { if (answer !== '') resolve(parseInt(answer)); }}
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
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 50 },
  disconnectBanner: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.accent, paddingVertical: 6, alignItems: 'center', zIndex: 200 },
  disconnectText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 12, letterSpacing: 1 },
  exitBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  flash: { backgroundColor: colors.accent, zIndex: 99 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  playersLeft: { fontFamily: fonts.bodyBold, color: colors.textSecondary, fontSize: 13, letterSpacing: 2 },
  round: { fontFamily: fonts.bodyBold, color: colors.textMuted, fontSize: 13, letterSpacing: 2 },
  diff: { fontFamily: fonts.mono, color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  timer: { fontFamily: fonts.mono, color: colors.lcdText, backgroundColor: colors.lcdBg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 3, fontSize: 22, letterSpacing: 2 },
  gameBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  lcdMain: { width: '100%', marginBottom: 20, minHeight: 120, justifyContent: 'space-between' },
  lcdCenter: { width: '100%', alignItems: 'center' },
  lcdExpr: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdTextDim, letterSpacing: 2, marginBottom: 8 },
  lcdDisplay: { fontFamily: fonts.mono, fontSize: 56, color: colors.lcdText, letterSpacing: 4, textAlign: 'right' },
  lcdTitle: { fontFamily: fonts.mono, fontSize: 16, color: colors.lcdText, letterSpacing: 1, marginBottom: 8 },
  lcdEliminated: { fontFamily: fonts.mono, fontSize: 20, color: colors.lcdText, letterSpacing: 1, marginBottom: 4 },
  lcdCorrect: { fontFamily: fonts.mono, fontSize: 40, color: colors.lcdText, letterSpacing: 4, marginBottom: 8 },
  lcdAnswer: { fontFamily: fonts.mono, fontSize: 22, color: colors.lcdText, letterSpacing: 2, marginBottom: 8 },
  lcdQuestion: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdTextDim, letterSpacing: 2, marginTop: 12 },
  lcdSub: { fontFamily: fonts.mono, fontSize: 12, color: colors.lcdTextDim, letterSpacing: 1, marginTop: 8 },
  padWrap: { alignItems: 'center', paddingBottom: 8 },
  playerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingTop: 8 },
  playerName: shared.chip,
  playerSelf: { color: colors.keyTextAlt, borderColor: colors.keyTextAlt },
  playerAnswered: { color: colors.success, borderColor: colors.success },
});
