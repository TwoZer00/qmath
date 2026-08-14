import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import LcdDivider from '../components/LcdDivider';
import CalcKey from '../components/CalcKey';
import BrandHeader from '../components/BrandHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { nameFromUid } from '../utils/names';

export default function SettingsScreen({ navigation, settings, uid }) {
  const { playerName, soundEnabled, saveName, toggleSound } = settings;
  const [draft, setDraft] = useState(playerName);
  const prevNameRef = useRef(playerName);
  useEffect(() => {
    if (playerName && playerName !== prevNameRef.current) {
      setDraft(playerName);
      prevNameRef.current = playerName;
    }
  }, [playerName]);
  const derivedName = uid ? nameFromUid(uid) : '';
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  const handleSaveName = () => {
    saveName(draft);
    setSaved(true);
    inputRef.current?.blur();
    setTimeout(() => setSaved(false), 1500);
  };

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={s.container}>
      <BrandHeader sub="SETTINGS" compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleGoBack} />}
      />

        <LcdScreen style={s.lcd}>
          <LcdDivider label="JUGADOR" />
          <Text style={s.lcdLabel}>NOMBRE</Text>
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={[s.input, !uid && s.inputDisabled]}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleSaveName}
              maxLength={20}
              autoCapitalize="words"
              returnKeyType="done"
              selectionColor={colors.lcdText}
              placeholder={derivedName}
              placeholderTextColor={colors.lcdTextDim}
              editable={!!uid}
            />
            <TouchableOpacity onPress={handleSaveName} style={s.saveBtn} disabled={!uid}>
              <Icon
                name={saved ? 'check' : 'content-save-outline'}
                size={16}
                color={saved ? colors.success : colors.lcdTextDim}
              />
            </TouchableOpacity>
          </View>

          <LcdDivider label="AUDIO" />
          <TouchableOpacity style={s.toggleRow} onPress={toggleSound} activeOpacity={0.7}>
            <View style={s.toggleLeft}>
              <Icon name={soundEnabled ? 'volume-high' : 'volume-off'} size={13} color={colors.lcdTextDim} />
              <Text style={s.lcdLabel}> SONIDOS</Text>
            </View>
            <Text style={[s.toggleValue, soundEnabled ? s.toggleOn : s.toggleOff]}>
              {soundEnabled ? 'ON ' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </LcdScreen>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 52 },
  lcd: { marginBottom: 20 },
  lcdLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  input: { flex: 1, fontFamily: fonts.mono, fontSize: 18, color: colors.lcdText, letterSpacing: 1, padding: 0, borderBottomWidth: 1, borderBottomColor: colors.lcdBorder },
  inputDisabled: { opacity: 0.4 },
  saveBtn: { paddingLeft: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleValue: { fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2 },
  toggleOn: { color: colors.lcdText },
  toggleOff: { color: colors.lcdTextDim },
});
