import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme';

export default function CalcSwitch({ label, icon, value, onToggle }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={s.row}>
      <View style={s.labelRow}>
        {icon && <Icon name={icon} size={16} color={colors.lcdTextDim} style={s.icon} />}
        <Text style={s.label}>{label}</Text>
      </View>
      <TouchableOpacity style={s.rocker} onPress={handlePress} activeOpacity={0.8}>
        <View style={[s.side, s.sideLeft, !value && s.sideActive]}>
          <Text style={[s.sideText, !value && s.sideTextActive]}>OFF</Text>
        </View>
        <View style={[s.side, s.sideRight, value && s.sideActive]}>
          <Text style={[s.sideText, value && s.sideTextActive]}>ON</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { marginRight: 2 },
  label: { fontFamily: fonts.mono, fontSize: 14, color: colors.lcdTextDim, letterSpacing: 1 },
  rocker: {
    flexDirection: 'row',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    borderBottomWidth: 4,
    borderBottomColor: colors.keyShadow,
  },
  side: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.keyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLeft: { borderRightWidth: 1, borderRightColor: colors.border },
  sideRight: {},
  sideActive: { backgroundColor: colors.keyOk },
  sideText: { fontFamily: fonts.mono, fontSize: 14, color: colors.textMuted, letterSpacing: 2 },
  sideTextActive: { color: '#fff' },
});
