import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { colors, shared, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function GameOverScreen({ uid, gameState, navigation, hasPlayedOnce, onNameSave }) {
  const winner = gameState?.winner;
  const players = gameState?.players || {};
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const [nameInput, setNameInput] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const isWinner = winner && players[uid]?.name === winner;
  const noWinner = !winner || winner === 'Nadie ganó';

  useEffect(() => {
    if (gameState?.status === 'LOBBY') {
      const current = navigation.getState()?.routes[navigation.getState()?.index]?.name;
      if (current !== 'Lobby') navigation.replace('Lobby');
    }
  }, [gameState?.status]);

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

  if (!gameState) return null;

  const sorted = Object.entries(players).sort(([, a], [, b]) => {
    if (a.name === winner) return -1;
    if (b.name === winner) return 1;
    return (b.eliminatedAt || 0) - (a.eliminatedAt || 0);
  });

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    onNameSave(trimmed);
    setNameSaved(true);
  };

  return (
    <View style={s.container}>
      <View style={[shared.calcBody, s.calcBody]}>
        <View style={shared.brandRow}>
          <Text style={shared.brandModel}>fx-BATTLE</Text>
          <Text style={shared.brandSub}>GAME OVER</Text>
        </View>

        {/* Resultado principal */}
        <LcdScreen style={s.lcdResult}>
          <Text style={s.lcdResultText}>
            {noWinner ? 'NADIE GANO' : isWinner ? 'GANASTE!' : 'ELIMINADO'}
          </Text>
          {!noWinner && !isWinner && (
            <Text style={s.lcdWinner}>GANO: {winner}</Text>
          )}
          <Icon
            name={noWinner ? 'skull' : isWinner ? 'trophy' : 'emoticon-dead-outline'}
            size={48}
            color={colors.lcdText}
            style={{ marginTop: 8 }}
          />
        </LcdScreen>

        {/* Tabla de posiciones */}
        <LcdScreen style={s.lcdTable}>
          <Text style={s.tableHeader}>-- CLASIFICACION --</Text>
          <ScrollView style={s.tableScroll} showsVerticalScrollIndicator={false}>
            {sorted.map(([id, p], i) => (
              <View key={id} style={s.tableRow}>
                <Text style={[s.tablePos, i === 0 && s.tableWinner]}>
                  {i === 0 ? '01' : `${String(i + 1).padStart(2, '0')}`}
                </Text>
                <Text style={[s.tableName, id === uid && s.tableMe, i === 0 && s.tableWinner]}>
                  {p.name}{id === uid ? ' <' : ''}
                </Text>
                <Icon name={i === 0 ? 'trophy' : 'skull-outline'} size={12} color={i === 0 ? colors.lcdText : colors.lcdTextDim} />
              </View>
            ))}
          </ScrollView>
        </LcdScreen>

        {hasPlayedOnce && (
          <View style={s.nameBox}>
            {nameSaved ? (
              <Text style={s.nameSaved}>NOMBRE GUARDADO ✓</Text>
            ) : (
              <View style={s.nameRow}>
                <TextInput
                  style={s.nameInput}
                  placeholder="TU NOMBRE"
                  placeholderTextColor={colors.lcdTextDim}
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={12}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Text style={s.nameSaveBtn} onPress={handleSaveName}>OK</Text>
              </View>
            )}
          </View>
        )}

        {countdown !== null && (
          <Text style={s.countdown}>NUEVA PARTIDA EN {countdown}s</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  calcBody: { alignItems: 'stretch' },
  lcdResult: { width: '100%', alignItems: 'center', paddingVertical: 16, marginBottom: 10 },
  lcdResultText: { fontFamily: fonts.mono, fontSize: 28, color: colors.lcdText, letterSpacing: 2, marginBottom: 4 },
  lcdWinner: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, letterSpacing: 1, marginBottom: 8 },
  lcdEmoji: { fontSize: 40 },
  lcdTable: { width: '100%', paddingVertical: 12, marginBottom: 12 },
  tableHeader: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 2, textAlign: 'center', marginBottom: 8 },
  tableScroll: { maxHeight: 160 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  tablePos: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdTextDim, width: 28 },
  tableName: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdText, flex: 1 },
  tableStatus: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  tableWinner: { color: colors.lcdText },
  tableMe: { color: colors.lcdText },
  countdown: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginTop: 4 },
  nameBox: { width: '100%', marginBottom: 8, marginTop: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontFamily: fonts.mono, fontSize: 13, color: colors.lcdText, backgroundColor: colors.lcdBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3, letterSpacing: 2 },
  nameSaveBtn: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.keyTextAlt, letterSpacing: 2, paddingHorizontal: 10, paddingVertical: 6 },
  nameSaved: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 2, textAlign: 'center' },
});
