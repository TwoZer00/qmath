import React, { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sendAnswer, leaveLobby } from '../services/game';
import { colors, fonts } from '../theme';
import LcdProgressBar from '../components/LcdProgressBar';
import LcdScreen from '../components/LcdScreen';
import NumPad from '../components/NumPad';
import CalcKey from '../components/CalcKey';
import BrandHeader from '../components/BrandHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { t } from '../i18n';
import { useCountdown } from '../hooks/useCountdown';

const DEFAULT_TIME_LIMIT = parseInt(process.env.EXPO_PUBLIC_TIME_LIMIT) || 5;

const DotsRow = memo(function DotsRow({ players, uid }) {
  return (
    <View style={s.dotsRow}>
      {Object.entries(players)
        .filter(([, p]) => p.status === 'active' || p.status === 'eliminated')
        .map(([id, p]) => (
          <Icon
            key={id}
            name={p.status === 'eliminated' ? 'skull' : p.answered ? 'lightning-bolt' : 'circle'}
            size={12}
            color={
              p.status === 'eliminated' ? colors.lcdTextDim
              : p.answered ? colors.lcdText
              : id === uid ? colors.lcdText
              : colors.lcdTextDim
            }
          />
        ))}
    </View>
  );
});

export default function GameScreen({ uid, gameState, connStatus, sound, navigation, settings }) {
  const T = t(settings?.language);
  const TIME_LIMIT = gameState?.timeLimit ?? DEFAULT_TIME_LIMIT;
  const answerRef = useRef('');
  const timerRef = useRef(null);
  const [, forceUpdate] = React.useState(0);
  const gameOverNavRef = useRef(null);
  const answeredRef = useRef(false);
  const eliminatedRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevEliminated = useRef(false);
  const prevRoundOver = useRef(false);
  const prevTimeLeft  = useRef(TIME_LIMIT);
  const prevAnswered  = useRef(false);


  const { countdown } = useCountdown(gameState?.timerEndsAt);
  const timeLeft = countdown ?? TIME_LIMIT;

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
  const { playKey, playCorrect, playError, playEliminated, playTick, playRoundOver, playVictory, setMusicIntensity, playMusic, stopMusic, playStinger, isMusicPlaying, transitionToAmbient, transitionToEliminated } = sound;

  const handleExit = useCallback(() => { stopMusic(); leaveLobby(); navigation.replace('Home'); }, [navigation, stopMusic]);

  // personal elimination — hard drop
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
      transitionToEliminated();
    }
    prevEliminated.current = eliminated;
  }, [eliminated]);

  // game status changes — music keeps playing through GameOver/Lobby, stops only on Home
  useEffect(() => {
    if (gameState?.status === 'GAME_OVER') {
      const delay = eliminatedRef.current ? 2500 : 0;
      gameOverNavRef.current = setTimeout(() => { navigation.replace('GameOver'); }, delay);
      return () => clearTimeout(gameOverNavRef.current);
    }
    if (gameState?.status === 'LOBBY') {
      if (gameOverNavRef.current) { clearTimeout(gameOverNavRef.current); gameOverNavRef.current = null; }
      navigation.replace('Lobby'); return;
    }
  }, [gameState?.status]);

  // new round — restart music only if stopped
  useEffect(() => {
    if (!question?.startedAt) return;
    answeredRef.current = false;
    prevAnswered.current = false;
    answerRef.current = '';
    forceUpdate((n) => n + 1);
    if (!isMusicPlaying()) playMusic();
  }, [question?.startedAt]);

  // round over SFX only — no music transition here
  useEffect(() => {
    if (isRoundOver && !prevRoundOver.current) {
      playRoundOver();
      if (eliminatedThisRound.length > 0) {
        setTimeout(() => playEliminated(), 400);
        setTimeout(() => playStinger(), 200);
      }
    }
    prevRoundOver.current = isRoundOver;
  }, [isRoundOver, eliminatedThisRound]);

  // intensity — only fires in PLAYING mode (blocked by modeRef inside setMusicIntensity)
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTimeLeft.current && !answered && !eliminated) playTick();
    const totalPlayers = Object.keys(players).length || 1;
    const playerRatio  = activePlayers.length / totalPlayers;
    const timerRatio   = TIME_LIMIT > 0 ? timeLeft / TIME_LIMIT : 0;
    setMusicIntensity((playerRatio * 0.5) + (timerRatio * 0.5));
    prevTimeLeft.current = timeLeft;
  }, [timeLeft, activePlayers.length]);

  // answered correctly — gentle transition
  useEffect(() => {
    if (answered && !prevAnswered.current) {
      playCorrect();
      transitionToAmbient();
    }
    prevAnswered.current = answered;
  }, [answered]);

  // game over winner
  const myName = players[uid]?.name;
  useEffect(() => {
    if (gameState?.status === 'GAME_OVER' && gameState?.winner && gameState.winner === myName) {
      transitionToAmbient();
      setTimeout(() => playVictory(), 300);
    }
  }, [gameState?.status, myName]);

  const questionRef = useRef(question);
  useEffect(() => { questionRef.current = question; }, [question]);

  const padRef = useRef(null);

  const handleNumPress = useCallback((d) => padRef.current?.handlePress(d), []);
  const handleNumSubmit = useCallback(() => padRef.current?.handleSubmit(), []);

  // kept in a ref so NumPad callbacks never change identity
  useEffect(() => {
    padRef.current = {
      handlePress(d) {
        if (answeredRef.current || eliminatedRef.current) return;
        if (d === '⌫') { answerRef.current = answerRef.current.slice(0, -1); forceUpdate((n) => n + 1); return; }
        if (answerRef.current.length >= 4) return;
        const next = answerRef.current + d;
        answerRef.current = next;
        forceUpdate((n) => n + 1);
        const num = parseInt(next);
        if (!isNaN(num) && num === Math.abs(questionRef.current?.answer)) {
          answeredRef.current = true;
          sendAnswer(num);
        }
      },
      handleSubmit() {
        if (answeredRef.current || eliminatedRef.current) return;
        const num = parseInt(answerRef.current);
        if (!isNaN(num)) { answeredRef.current = true; sendAnswer(num); }
      },
    };
  }, []);

  const answer = answerRef.current;
  const round = gameState?.round ?? 1;

  if (!question) {
    return (
      <View style={s.container}>
      <BrandHeader sub={T.round(round)} compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleExit} />}
      />
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <Text style={s.lcdSub}>{T.nextRound}</Text>
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
          <Text style={s.disconnectText}>{T.reconnecting}</Text>
        </View>
      )}
      <BrandHeader sub={T.round(round)} compact
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
                  <Text style={s.lcdTitle}>{T.eliminated.toUpperCase()}S</Text>
                </View>
                {eliminatedThisRound.map((name) => (
                  <Text key={name} style={s.lcdEliminated}>{name}</Text>
                ))}
              </>
            ) : (
              <View style={s.iconRow}>
                <Icon name="check-all" size={16} color={colors.lcdText} />
                <Text style={s.lcdTitle}>{T.allAnswered}</Text>
              </View>
            )}
            <Text style={s.lcdSub}>{T.playersLeft(activePlayers.length)}</Text>
            {question?.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
          </LcdScreen>
        </View>
      ) : eliminated ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <View style={s.iconRowMb4}>
              <Icon name={me?.eliminatedReason === 'slow' ? 'timer-off' : 'skull-outline'} size={18} color={colors.lcdText} />
              <Text style={s.lcdEliminated}>
                {me?.eliminatedReason === 'slow' ? T.eliminatedSlow : me?.eliminatedReason === 'timeout' ? T.eliminatedTimeout : T.eliminated}
              </Text>
            </View>
            {me?.eliminatedReason === 'slow' && <Text style={s.lcdSub}>{T.eliminatedSlowSub}</Text>}
            {question.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
            <Text style={s.lcdSub}>{T.watching}</Text>
            <Text style={s.lcdQuestion}>{question.expression} = ?</Text>
          </LcdScreen>
        </View>
      ) : answered ? (
        <View style={s.centerBox}>
          <LcdScreen style={s.lcdCenter}>
            <View style={s.iconRowMb4}>
              <Icon name="check-circle-outline" size={18} color={colors.lcdText} />
              <Text style={s.lcdCorrect}>{T.ok}</Text>
            </View>
            {question.revealAnswer && <Text style={s.lcdAnswer}>{question.expression} = {question.display}</Text>}
            <Text style={s.lcdSub}>{T.waiting}</Text>
          </LcdScreen>
        </View>
      ) : (
        <View style={s.gameBox}>
          <LcdScreen style={s.lcdMain}>
            <LcdProgressBar timeLeft={timeLeft} total={TIME_LIMIT} />
            <Text style={s.lcdExpr}>{question.expression}</Text>
            <Text style={s.lcdDisplay}>{answer || '_'}</Text>
            <DotsRow players={players} uid={uid} />
          </LcdScreen>
          <NumPad
            playKey={playKey}
            onPress={handleNumPress}
            onSubmit={handleNumSubmit}
            focusKey={question?.startedAt}
          />
        </View>
      )}


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
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
});
