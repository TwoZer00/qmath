import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, shared, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import CalcKey from '../components/CalcKey';

export default function HomeScreen({ navigation }) {
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
      <Animated.View style={[shared.calcBody, { opacity: bootOpacity, transform: [{ scale: bootScale }] }]}>
        <View style={shared.brandRow}>
          <Text style={shared.brandModel}>fx-BATTLE</Text>
          <Text style={shared.brandSub}>ROYALE EDITION</Text>
        </View>

        <Animated.View style={[s.lcdWrap, { opacity: lcdOpacity }]}>
          <LcdScreen>
            <Text style={s.lcdLabel}>LISTO PARA JUGAR</Text>
            <Text style={s.lcdSub}>{lcdReady ? 'PRESIONA JUGAR' : ''}</Text>
          </LcdScreen>
        </Animated.View>

        {/* Nombre grabado en el cuerpo */}
        <View style={s.engraved}>
          <Text style={s.engravedTitle}>MATH BATTLE ROYALE</Text>
          <Text style={s.engravedSub}>MULTIPLAYER EDITION</Text>
        </View>

        <CalcKey label="JUGAR" icon="play" variant="action" wide onPress={() => navigation.navigate('Lobby')} />
        <CalcKey label="STATS" icon="chart-bar" variant="fn" wide onPress={() => navigation.navigate('Stats')} style={{ marginTop: 8 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  lcdWrap: { width: '100%', marginBottom: 20 },
  lcdLabel: { fontFamily: fonts.mono, fontSize: 13, color: colors.lcdText, letterSpacing: 1, marginBottom: 4 },
  lcdSub: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  engraved: { width: '100%', alignItems: 'center', marginBottom: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  engravedTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textMuted, letterSpacing: 4, textTransform: 'uppercase' },
  engravedSub: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 3, marginTop: 2, opacity: 0.6 },
});
