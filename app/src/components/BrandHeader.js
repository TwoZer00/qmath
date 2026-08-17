import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { shared, fonts, colors } from '../theme';

export default function BrandHeader({ sub, left, right, compact }) {
  return (
    <View style={shared.brandRow}>
      <View style={s.leftSlot}>
        {left}
      </View>
      <View style={s.center}>
        {!compact && <Text style={shared.brandModel}>fx-MATHPEX</Text>}
        {sub && <Text style={compact ? s.compactTitle : shared.brandSub}>{sub}</Text>}
      </View>
      <View style={s.rightSlot}>
        {right}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  compactTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.textSecondary, letterSpacing: 2 },
  leftSlot: { width: 44, alignItems: 'flex-start' },
  rightSlot: { width: 44, alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
});
