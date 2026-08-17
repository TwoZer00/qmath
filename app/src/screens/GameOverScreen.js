import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import BrandHeader from '../components/BrandHeader';
import { leaveLobby } from '../services/game';
import { useCountdown } from '../hooks/useCountdown';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import CalcKey from '../components/CalcKey';
import { t } from '../i18n';

export default function GameOverScreen({ uid, gameState, navigation, settings }) {
  const T = t(settings?.language);
  const winner = gameState?.winner;
  const players = gameState?.players || {};
  const { countdown } = useCountdown(gameState?.timerEndsAt);

  const isWinner = winner && players[uid]?.name === winner;
  const noWinner = !winner;

  useEffect(() => {
    if (gameState?.status === 'LOBBY') {
      const current = navigation.getState()?.routes[navigation.getState()?.index]?.name;
      if (current !== 'Lobby') navigation.replace('Lobby');
    }
  }, [gameState?.status]);

  if (!gameState) return null;

  const sorted = Object.entries(players).sort(([, a], [, b]) => {
    if (noWinner) return 0;
    if (a.name === winner) return -1;
    if (b.name === winner) return 1;
    // active players (no eliminatedAt) rank above eliminated ones
    if (!a.eliminatedAt && b.eliminatedAt) return -1;
    if (a.eliminatedAt && !b.eliminatedAt) return 1;
    return (b.eliminatedAt || 0) - (a.eliminatedAt || 0);
  });

  return (
    <View style={s.container}>
      <BrandHeader sub={T.gameOver} compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={useCallback(() => { leaveLobby(); navigation.replace('Home'); }, [navigation])} />}
      />

        <LcdScreen style={s.lcd}>
          <View style={s.resultRow}>
            <Icon
              name={noWinner ? 'skull' : isWinner ? 'trophy' : 'emoticon-dead-outline'}
              size={32}
              color={colors.lcdText}
            />
            <View>
              <Text style={s.lcdResultText}>
                {noWinner ? T.nobodyWon : isWinner ? T.youWon : T.youLost}
              </Text>
              {!noWinner && !isWinner && (
                <Text style={s.lcdWinner}>{T.winner(winner)}</Text>
              )}
            </View>
          </View>
          <Text style={s.tableHeader}>{T.ranking}</Text>
          <ScrollView style={s.tableScroll} showsVerticalScrollIndicator={false}>
            {sorted.map(([id, p], i) => (
              <View key={id} style={s.tableRow}>
                <Text style={[s.tablePos, !noWinner && i === 0 && s.tableWinner]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[s.tableName, id === uid && s.tableMe, !noWinner && i === 0 && s.tableWinner]}>
                  {p.name}{id === uid ? ' <' : ''}
                </Text>
                <Icon name={noWinner ? 'skull-outline' : i === 0 ? 'trophy' : 'skull-outline'} size={12} color={(!noWinner && i === 0) ? colors.lcdText : colors.lcdTextDim} />
              </View>
            ))}
          </ScrollView>
        </LcdScreen>

        {countdown !== null && (
          <Text style={s.countdown}>{T.newGameIn(countdown)}</Text>
        )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 52 },
  lcd: { width: '100%', marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  lcdResultText: { fontFamily: fonts.mono, fontSize: 24, color: colors.lcdText, letterSpacing: 2 },
  lcdWinner: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, letterSpacing: 1 },
  tableHeader: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 2, textAlign: 'center', marginBottom: 8 },
  tableScroll: { maxHeight: 160 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  tablePos: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, width: 28 },
  tableName: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdText, flex: 1 },
  tableWinner: { color: colors.lcdText },
  tableMe: { color: colors.lcdText },
  countdown: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginTop: 12, textAlign: 'center' },
  homeKey: { marginTop: 16, alignSelf: 'center' },
});
