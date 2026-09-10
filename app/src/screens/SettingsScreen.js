import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import LcdDivider from '../components/LcdDivider';
import CalcKey from '../components/CalcKey';
import CalcSwitch from '../components/CalcSwitch';
import BrandHeader from '../components/BrandHeader';
import { nameFromUid } from '../utils/names';
import { t, LANGUAGES } from '../i18n';

export default function SettingsScreen({ navigation, settings, uid }) {
  const { playerName, soundEnabled, musicEnabled, language, saveName, toggleSound, toggleMusic, setLang } = settings;
  const T = t(language);
  const [draft, setDraft] = useState(playerName);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);
  const prevNameRef = useRef(playerName);

  useEffect(() => {
    if (playerName && playerName !== prevNameRef.current) {
      setDraft(playerName);
      prevNameRef.current = playerName;
    }
  }, [playerName]);

  const handleEdit = useCallback(() => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSave = useCallback(() => {
    saveName(draft);
    setEditing(false);
    setSaved(true);
    inputRef.current?.blur();
    setTimeout(() => setSaved(false), 1500);
  }, [draft, saveName]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const displayName = draft || nameFromUid(uid) || '???';

  return (
    <View style={s.container}>
      <BrandHeader sub="SETTINGS" compact
        left={<CalcKey icon="arrow-left" variant="fn" onPress={handleGoBack} />}
      />

      <TextInput
        ref={inputRef}
        style={s.hidden}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleSave}
        onBlur={() => setEditing(false)}
        maxLength={20}
        autoCapitalize="words"
        returnKeyType="done"
        editable={!!uid}
      />

      {/* LCD — read only display */}
      <LcdScreen style={s.lcd}>
        <Text style={s.lcdSub}>{T.name}</Text>
        <Text style={[s.lcdName, editing && s.lcdNameEditing]}>
          {displayName}{editing ? '_' : ''}
        </Text>
        <Text style={s.lcdStatus}>
          {soundEnabled ? 'SFX:ON ' : 'SFX:OFF'}{'  '}{musicEnabled ? 'MUS:ON ' : 'MUS:OFF'}{'  '}{language.toUpperCase()}
        </Text>
      </LcdScreen>

      {/* Keys — all interactive controls */}
      <View style={s.keys}>
        <LcdDivider label={T.player} />
        <View style={s.row}>
          <CalcKey
            icon={editing ? 'check' : 'pencil-outline'}
            label={editing ? (saved ? 'SAVED' : 'SAVE') : 'EDIT'}
            variant={editing ? 'action' : 'fn'}
            onPress={editing ? handleSave : handleEdit}
            disabled={!uid}
          />
        </View>

        <LcdDivider label={T.audio} />
        <CalcSwitch label={T.sounds} icon={soundEnabled ? 'volume-high' : 'volume-off'} value={soundEnabled} onToggle={toggleSound} />
        <CalcSwitch label={T.music} icon={musicEnabled ? 'music' : 'music-off'} value={musicEnabled} onToggle={toggleMusic} />

        <LcdDivider label={T.language} />
        <View style={s.row}>
          {LANGUAGES.map((lang) => (
            <CalcKey
              key={lang}
              label={lang.toUpperCase()}
              variant={language === lang ? 'action' : 'fn'}
              onPress={() => setLang(lang)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 52 },
  lcd: { width: '100%', marginBottom: 20 },
  keys: { gap: 12 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  lcdSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 1, marginBottom: 4 },
  lcdName: { fontFamily: fonts.mono, fontSize: 22, color: colors.lcdText, letterSpacing: 2 },
  lcdNameEditing: { opacity: 0.8 },
  lcdStatus: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
