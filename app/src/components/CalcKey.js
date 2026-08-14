import React, { useRef } from 'react';
import { Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme';

// variant: 'num' | 'fn' | 'action' | 'secondary'
export default function CalcKey({ label, icon, variant = 'num', onPress, disabled, wide, tall, size, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressedRef = useRef(false);

  const handlePress = () => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 40, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 50, useNativeDriver: true }),
    ]).start();
    onPress?.();
    setTimeout(() => { pressedRef.current = false; }, 80);
  };

  const keyStyle = [
    s.key,
    variant === 'num'       && s.num,
    variant === 'fn'        && s.fn,
    variant === 'action'    && s.action,
    variant === 'secondary' && s.secondary,
    wide && s.wide,
    tall && s.tall,
    size === 'sm' && s.sm,
    disabled && s.disabled,
  ];

  const textStyle = [
    s.label,
    variant === 'action'    && s.labelAction,
    variant === 'secondary' && s.labelSecondary,
    variant === 'fn'        && s.labelFn,
    size === 'sm'           && s.labelSm,
  ];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity style={keyStyle} onPress={handlePress} disabled={disabled} activeOpacity={1}>
        {icon && label
          ? <><Icon name={icon} size={size === 'sm' ? 13 : 16} color={variant === 'action' || variant === 'secondary' ? '#fff' : colors.keyText} /><Text style={[textStyle, { marginLeft: 6 }]}>{label}</Text></>
          : icon
          ? <Icon name={icon} size={size === 'sm' ? 16 : 22} color={variant === 'action' || variant === 'secondary' ? '#fff' : colors.keyText} />
          : <Text style={textStyle}>{label}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const BASE_W = 80;
const BASE_H = 64;

const s = StyleSheet.create({
  key: {
    width: BASE_W,
    height: BASE_H,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  wide: { width: BASE_W * 2 + 8 },
  tall: { height: BASE_H * 1.3 },
  sm:   { width: 36, height: 32, borderRadius: 4, borderBottomWidth: 3 },
  disabled: { opacity: 0.3 },

  // Categorías
  num:       { backgroundColor: colors.keyBg,    borderColor: colors.keyBgAlt, borderWidth: 1, borderBottomColor: colors.keyShadow },
  fn:        { backgroundColor: colors.keyBgAlt, borderColor: colors.border,   borderWidth: 1, borderBottomColor: colors.surface },
  action:    { backgroundColor: colors.keyOk,    borderColor: '#e74c3c',        borderWidth: 1, borderBottomColor: colors.keyOkShadow },
  secondary: { backgroundColor: '#2c3e6b',       borderColor: '#3d5490',        borderWidth: 1, borderBottomColor: '#1a2540' },

  // Texto
  label:          { fontFamily: fonts.mono, fontSize: 24, color: colors.keyText },
  labelSm:        { fontSize: 11 },
  labelAction:    { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
  labelSecondary: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#a0c4ff', letterSpacing: 1, textTransform: 'uppercase' },
  labelFn:        { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
});
