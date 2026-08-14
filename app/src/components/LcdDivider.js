import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, colors } from '../theme';

export default function LcdDivider({ label }) {
  return (
    <View style={s.wrap}>
      {label
        ? <Text style={s.label}>{'- '}{label}{' -'}</Text>
        : <Text style={s.line}>{'─'.repeat(24)}</Text>
      }
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 6 },
  label: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, letterSpacing: 2 },
  line: { fontFamily: fonts.mono, fontSize: 10, color: colors.lcdTextDim, opacity: 0.4, letterSpacing: 0 },
});
