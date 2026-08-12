import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, shared, fonts } from '../theme';
import LcdScreen from '../components/LcdScreen';
import CalcKey from '../components/CalcKey';
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
        {icon && <Icon name={icon} size={11} color={colors.lcdTextDim} style={{ marginRight: 5 }} />}
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
  label: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  right: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdText, letterSpacing: 1 },
  sub: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 1 },
});

// Separador estilo LCD
function LcdDivider({ label }) {
  return (
    <View style={d.wrap}>
      {label
        ? <Text style={d.label}>{'- '}{label}{' -'}</Text>
        : <Text style={d.line}>{'─'.repeat(24)}</Text>
      }
    </View>
  );
}

const d = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 6 },
  label: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 2 },
  line: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, opacity: 0.4, letterSpacing: 0 },
});

export default function StatsScreen({ uid, navigation }) {
  const [stats, setStats] = useState(undefined);

  useEffect(() => {
    if (!uid) { setStats(null); return; }
    fetchStats(uid).then(setStats).catch(() => setStats(null));
  }, [uid]);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[shared.calcBody, s.calcBody]}>
          <View style={shared.brandRow}>
            <Text style={shared.brandModel}>fx-BATTLE</Text>
            <Text style={shared.brandSub}>PLAYER STATS</Text>
          </View>

          <LcdScreen style={s.lcd}>
          {stats === undefined && (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors.lcdText} size="small" />
              <Text style={s.loadingText}>CARGANDO...</Text>
            </View>
          )}

          {stats === null && (
            <View style={s.emptyWrap}>
              <Icon name="calculator-variant-outline" size={32} color={colors.lcdTextDim} />
              <Text style={s.emptyText}>SIN DATOS</Text>
              <Text style={s.emptySub}>JUEGA TU PRIMERA{'\n'}PARTIDA PARA VER{'\n'}TUS ESTADISTICAS</Text>
            </View>
          )}

          {stats && (
            <>
              {/* Bloque 1 — resumen */}
              <LcdDivider label="RESUMEN" />
              <ReadoutRow icon="trophy"              label="VICTORIAS"   value={String(stats.wins).padStart(4, '0')} />
              <ReadoutRow icon="counter"             label="RESPUESTAS"  value={String(stats.total).padStart(4, '0')} />
              <ReadoutRow icon="check-circle-outline" label="PRECISION"  value={`${stats.accuracy}%`} sub={`${stats.correct}/${stats.total}`} />
              <ReadoutRow icon="timer-outline"       label="T.PROM"      value={stats.avgResponseMs != null ? `${(stats.avgResponseMs / 1000).toFixed(2)}s` : '--'} />
              <ReadoutRow icon="skull-outline"       label="TIMEOUTS"    value={String(stats.timeouts).padStart(4, '0')} />

              {/* Bloque 2 — por operación */}
              <LcdDivider label="POR OPERACION" />
              {Object.entries(stats.byOp).map(([op, data]) => {
                const pct = Math.round((data.correct / data.total) * 100);
                return (
                  <View key={op} style={s.opRow}>
                    <View style={s.opLeft}>
                      <Icon name={OP_ICONS[op] ?? 'help'} size={11} color={colors.lcdTextDim} style={{ marginRight: 5 }} />
                      <Text style={s.opLabel}>{OP_LABELS[op] ?? op}</Text>
                    </View>
                    <View style={s.opRight}>
                      <LcdBar value={pct} max={100} color={pct >= 70 ? colors.lcdText : colors.lcdTextDim} />
                      <Text style={s.opPct}>{String(pct).padStart(3, ' ')}%</Text>
                    </View>
                  </View>
                );
              })}

              {/* Bloque 3 — punto débil */}
              {stats.weakestOp && (
                <>
                  <LcdDivider label="PUNTO DEBIL" />
                  <View style={s.weakWrap}>
                    <Text style={s.weakOp}>{OP_LABELS[stats.weakestOp.op] ?? stats.weakestOp.op}</Text>
                    <View style={s.weakDetail}>
                      <Icon name="alert-circle-outline" size={11} color={colors.lcdTextDim} />
                      <Text style={s.weakSub}> {Math.round(stats.weakestOp.rate * 100)}% ACIERTO  ({stats.weakestOp.total} intentos)</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Footer */}
              <LcdDivider />
              <Text style={s.footer}>ULTIMAS {stats.total} RESPUESTAS</Text>
            </>
          )}
          </LcdScreen>

          <View style={s.keyRow}>
            <CalcKey icon="arrow-left" variant="fn" onPress={() => navigation.goBack()} />
            {stats && (
              <CalcKey icon="refresh" variant="fn" onPress={() => { setStats(undefined); fetchStats(uid).then(setStats).catch(() => setStats(null)); }} />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  calcBody: { alignItems: 'stretch', width: '100%' },
  lcd: { width: '100%', marginBottom: 16 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loadingText: { fontFamily: fonts.mono, fontSize: 12, color: colors.lcdTextDim, letterSpacing: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontFamily: fonts.mono, fontSize: 18, color: colors.lcdText, letterSpacing: 3, marginTop: 4 },
  emptySub: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1, textAlign: 'center', lineHeight: 18 },
  opRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  opLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  opLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdTextDim, letterSpacing: 1 },
  opRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opPct: { fontFamily: fonts.mono, fontSize: 11, color: colors.lcdText, letterSpacing: 1, width: 36, textAlign: 'right' },
  weakWrap: { alignItems: 'center', paddingVertical: 8 },
  weakOp: { fontFamily: fonts.mono, fontSize: 36, color: colors.lcdText, letterSpacing: 6 },
  weakDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  weakSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 1 },
  footer: { fontFamily: fonts.mono, fontSize: 9, color: colors.lcdTextDim, letterSpacing: 1, textAlign: 'center', opacity: 0.6 },
  keyRow: { flexDirection: 'row', gap: 8 },
});
