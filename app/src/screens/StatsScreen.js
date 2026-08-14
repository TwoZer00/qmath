import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import LcdDivider from '../components/LcdDivider';
import CalcKey from '../components/CalcKey';
import BrandHeader from '../components/BrandHeader';
import { fetchStats } from '../services/stats';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const OP_LABELS = { '+': 'SUMA', '-': 'RESTA', '*': 'MULT', '/': 'DIV' };
const OP_ICONS  = { '+': 'plus', '-': 'minus', '*': 'close', '/': 'division' };

// Barra de progreso estilo LCD
function LcdBar({ value, max, color = colors.lcdText }) {
  const filled = Math.round((value / max) * 10);
  return (
    <Text style={bar.track}>
      {Array.from({ length: 10 }).map((_, i) => (
        <Text key={i} style={i < filled ? [bar.block, { color }] : bar.empty}>
          {i < filled ? '█' : '░'}
        </Text>
      ))}
    </Text>
  );
}

const bar = StyleSheet.create({
  track: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  block: { fontFamily: fonts.mono, fontSize: 11 },
  empty: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, opacity: 0.4 },
});

// Fila de dato con etiqueta y valor alineados
function ReadoutRow({ label, value, sub, icon }) {
  return (
    <View style={r.row}>
      <View style={r.left}>
        {icon && <Icon name={icon} size={11} color={colors.lcdTextDim} style={r.iconMr} />}
        <Text style={r.label}>{label}</Text>
      </View>
      <View style={r.right}>
        <Text style={r.value}>{value}</Text>
        {sub ? <Text style={r.sub}> {sub}</Text> : null}
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconMr: { marginRight: 5 },
  label: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  right: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdText, letterSpacing: 1 },
  sub: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 1 },
});

function useBlink() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}

export default function StatsScreen({ uid, navigation }) {
  const [stats, setStats] = useState(undefined);
  const [on, setOn] = useState(true);
  const blinkAnim = useBlink();
  const dimAnim = useRef(new Animated.Value(1)).current;

  const load = () => {
    setStats(undefined);
    fetchStats(uid).then(setStats).catch(() => setStats(null));
  };

  useEffect(() => {
    if (!uid) { setStats(null); return; }
    load();
  }, [uid]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleToggle = useCallback(() => {
    if (on) {
      setOn(false);
      setStats(null);
      Animated.timing(dimAnim, { toValue: 0.15, duration: 200, useNativeDriver: true }).start();
    } else {
      setOn(true);
      Animated.timing(dimAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      load();
    }
  }, [on, uid]);

  const loading = stats === undefined;
  const empty   = stats === null;

  const ph = (val, placeholder = '----') => (!on || loading) ? placeholder : val;
  const phNum = (n, pad = 4) => (!on || loading) ? '----' : String(n).padStart(pad, '0');

  const OPS = ['+', '-', '*', '/'];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <BrandHeader sub="PLAYER STATS" compact
          left={<CalcKey icon="arrow-left" variant="fn" onPress={handleGoBack} />}
        />

          <Animated.View style={{ opacity: dimAnim }}>
          <LcdScreen style={s.lcd}>
            {empty && on ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>SIN DATOS</Text>
                <Text style={s.emptySub}>JUEGA TU PRIMERA{' '}PARTIDA</Text>
              </View>
            ) : (
              <>
                <LcdDivider label="RESUMEN" />
                <Animated.View style={loading ? { opacity: blinkAnim } : null}>
                  <ReadoutRow icon="trophy"               label="VICTORIAS"  value={phNum(stats?.wins)} />
                  <ReadoutRow icon="counter"              label="RESPUESTAS" value={phNum(stats?.total)} />
                  <ReadoutRow icon="check-circle-outline" label="PRECISION" value={ph(`${stats?.accuracy}%`, '---%')} sub={(!on || loading) ? '' : `${stats.correct}/${stats.total}`} />
                  <ReadoutRow icon="timer-outline" label="T.PROM" value={(!on || loading) ? '--.-s' : stats?.avgResponseMs != null ? `${(stats.avgResponseMs / 1000).toFixed(2)}s` : '--'} />
                  <ReadoutRow icon="skull-outline"        label="TIMEOUTS"   value={phNum(stats?.timeouts)} />
                </Animated.View>

                <LcdDivider label="POR OPERACION" />
                <Animated.View style={loading ? { opacity: blinkAnim } : null}>
                  {OPS.map((op) => {
                    const data = stats?.byOp?.[op];
                    const pct = (!on || loading || !data) ? 0 : Math.round((data.correct / data.total) * 100);
                    const showPct = on && !loading && !!data;
                    return (
                      <View key={op} style={s.opRow}>
                        <View style={s.opLeft}>
                          <Icon name={OP_ICONS[op]} size={11} color={colors.lcdTextDim} style={r.iconMr} />
                          <Text style={s.opLabel}>{OP_LABELS[op]}</Text>
                        </View>
                        <View style={s.opRight}>
                          <LcdBar value={pct} max={100} color={pct >= 70 ? colors.lcdText : colors.lcdTextDim} />
                          <Text style={s.opPct}>{showPct ? `${String(pct).padStart(3, ' ')}%` : ' --%'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>

                <LcdDivider />
                <Text style={s.footer}>{(!on || loading) ? '...' : `ULTIMAS ${stats.total} RESPUESTAS`}</Text>
              </>
            )}
          </LcdScreen>
          </Animated.View>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>DISPLAY</Text>
            <View style={s.switchGroup}>
              <TouchableOpacity style={[s.switchKey, s.switchKeyLeft, on && s.switchKeyActive]} onPress={() => !on && handleToggle()}>
                <Text style={[s.switchKeyText, on && s.switchKeyTextActive]}>ON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.switchKey, s.switchKeyRight, !on && s.switchKeyActive]} onPress={() => on && handleToggle()}>
                <Text style={[s.switchKeyText, !on && s.switchKeyTextActive]}>OFF</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 52 },
  lcd: { marginBottom: 16, minHeight: 320 },
  emptyWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontFamily: fonts.mono, fontSize: 18, color: colors.lcdText, letterSpacing: 3 },
  emptySub: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1, textAlign: 'center' },
  opRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  opLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  opLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  opRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opPct: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdText, letterSpacing: 1, width: 36, textAlign: 'right' },
  footer: { fontFamily: fonts.mono, fontSize: 9, color: colors.lcdTextDim, letterSpacing: 1, textAlign: 'center', opacity: 0.6 },
  keyRow: { marginTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 },
  switchLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 2 },
  switchGroup: { flexDirection: 'row' },
  switchKey: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.keyBg, borderWidth: 1, borderColor: colors.border, borderBottomWidth: 3, borderBottomColor: colors.keyShadow },
  switchKeyLeft: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderRightWidth: 0 },
  switchKeyRight: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  switchKeyActive: { backgroundColor: colors.lcdBg, borderColor: colors.lcdBorder, borderBottomColor: colors.lcdBgDark },
  switchKeyText: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, letterSpacing: 1 },
  switchKeyTextActive: { color: colors.lcdText },
});