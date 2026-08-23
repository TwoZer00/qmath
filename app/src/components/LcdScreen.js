import React, { memo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

const SCANLINE_SPACING = 6;

const Scanlines = memo(function Scanlines({ count }) {
  return (
    <View style={s.scanlines} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.line, { top: i * SCANLINE_SPACING }]} />
      ))}
    </View>
  );
});

export default function LcdScreen({ children, style }) {
  const [lineCount, setLineCount] = useState(0);

  return (
    <View
      style={[s.lcd, style]}
      onLayout={(e) => setLineCount(Math.floor(e.nativeEvent.layout.height / SCANLINE_SPACING))}
    >
      {children}
      {lineCount > 0 && <Scanlines count={lineCount} />}
    </View>
  );
}

const s = StyleSheet.create({
  lcd: {
    backgroundColor: colors.lcdBg,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.lcdBorder,
    borderBottomWidth: 4,
    borderBottomColor: colors.lcdBgDark,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
