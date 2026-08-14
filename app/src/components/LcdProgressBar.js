import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Easing } from 'react-native';
import { fonts, colors } from '../theme';

const FONT_SIZE = 11;
const LETTER_SPACING = 2;
const CHAR_WIDTH = FONT_SIZE * 0.6 + LETTER_SPACING; // aproximación mono

export default function LcdProgressBar({ timeLeft, total }) {
  const anim = useRef(new Animated.Value(timeLeft / total)).current;
  const [blocks, setBlocks] = useState(12);
  const [text, setText] = useState('');

  useEffect(() => {
    anim.stopAnimation();
    anim.setValue(timeLeft / total);
    if (timeLeft > 0) {
      Animated.timing(anim, {
        toValue: (timeLeft - 1) / total,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [timeLeft]);

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      const filled  = value * blocks;
      const full    = Math.floor(filled);
      const frac    = filled - full;
      const partial = frac > 0.66 ? '▓' : frac > 0.33 ? '▒' : frac > 0 ? '░' : '';
      setText('█'.repeat(full) + partial + '░'.repeat(blocks - full - (partial ? 1 : 0)));
    });
    return () => anim.removeListener(id);
  }, [blocks]);

  return (
    <Text
      style={s.bar}
      onLayout={(e) => setBlocks(Math.floor(e.nativeEvent.layout.width / CHAR_WIDTH))}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}

const s = StyleSheet.create({
  bar: { fontFamily: fonts.mono, fontSize: FONT_SIZE, letterSpacing: LETTER_SPACING, width: '100%', color: colors.lcdText },
});
