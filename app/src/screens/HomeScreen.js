import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import BrandHeader from '../components/BrandHeader';
import CalcKey from '../components/CalcKey';
import { nameFromUid } from '../utils/names';
import { t } from '../i18n';

export default function HomeScreen({ navigation, settings, uid }) {
  const T = t(settings?.language);
  const bootOpacity = useRef(new Animated.Value(0)).current;
  const bootScale = useRef(new Animated.Value(0.96)).current;
  const lcdOpacity = useRef(new Animated.Value(0)).current;
  const [lcdReady, setLcdReady] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(lcdOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(lcdOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
      Animated.timing(lcdOpacity, { toValue: 1, duration: 40, useNativeDriver: true }),
      Animated.timing(lcdOpacity, { toValue: 0, duration: 40, useNativeDriver: true }),
      Animated.timing(lcdOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setLcdReady(true));

    Animated.parallel([
      Animated.timing(bootOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(bootScale, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={[s.calcBody, { opacity: bootOpacity, transform: [{ scale: bootScale }] }]}>
        <BrandHeader />

        <Animated.View style={[s.lcdWrap, { opacity: lcdOpacity }]}>
          <LcdScreen>
            <Text style={s.lcdTitle}>MATHPEX</Text>
            <Text style={s.lcdLabel}>{lcdReady ? T.readyToPlay : ''}</Text>
          </LcdScreen>
        </Animated.View>

        <View style={s.keys}>
          <CalcKey label={T.play} icon="play" variant="action" wide onPress={() => navigation.navigate('Lobby')} />
          <CalcKey label="STATS" icon="chart-bar" variant="fn" wide onPress={() => navigation.navigate('Stats')} style={{ marginTop: 8 }} />
          <CalcKey label="SETTINGS" icon="cog-outline" variant="fn" wide onPress={() => navigation.navigate('Settings')} style={{ marginTop: 8 }} />
          {uid
            ? <Text style={s.playerHint}>{T.playingAs} {settings?.playerName || nameFromUid(uid)}</Text>
            : <Text style={s.playerHint}>{T.connecting}</Text>
          }
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  calcBody: {
    width: '88%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 6,
    borderBottomColor: colors.keyShadow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    alignItems: 'stretch',
  },
  lcdWrap: { width: '100%', marginBottom: 12 },
  keys: { alignItems: 'center' },
  playerHint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted, marginTop: 14, letterSpacing: 0.5 },
  lcdTitle: { fontFamily: fonts.mono, fontSize: 22, color: colors.lcdText, letterSpacing: 3, marginBottom: 2 },
  lcdLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1, marginTop: 8 },
});
