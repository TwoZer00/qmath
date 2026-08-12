import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import CalcKey from './CalcKey';

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['DEL', '0', 'OK'],
];

export default function NumPad({ onPress, onSubmit, disabled, playKey }) {
  const activeTouchRef = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleKey = (k) => {
    if (disabled || activeTouchRef.current) return;
    activeTouchRef.current = true;
    setTimeout(() => { activeTouchRef.current = false; }, 80);
    playKey?.();
    if (k === 'OK') onSubmit();
    else if (k === 'DEL') onPress('⌫');
    else onPress(k);
  };

  const handleKeyboardInput = (text) => {
    if (disabled) return;
    const last = text.slice(-1);
    if (/[0-9]/.test(last)) { playKey?.(); onPress(last); }
  };

  const handleKeyPress = ({ nativeEvent: { key } }) => {
    if (disabled) return;
    if (key === 'Backspace') { playKey?.(); onPress('⌫'); }
    else if (key === 'Enter') onSubmit();
  };

  return (
    <View style={s.grid}>
      <TextInput
        ref={inputRef}
        style={s.hidden}
        value=""
        onChangeText={handleKeyboardInput}
        onKeyPress={handleKeyPress}
        keyboardType="numeric"
        caretHidden
        showSoftInputOnFocus={false}
      />
      {ROWS.map((row, i) => (
        <View key={i} style={s.row}>
          {row.map((k) => (
            <CalcKey
              key={k}
              label={k === 'DEL' || k === 'OK' ? undefined : k}
              icon={k === 'DEL' ? 'backspace-outline' : k === 'OK' ? 'check' : undefined}
              variant={k === 'OK' ? 'action' : k === 'DEL' ? 'fn' : 'num'}
              onPress={() => handleKey(k)}
              disabled={disabled}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { gap: 8, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  hidden: { position: 'absolute', width: 0, height: 0, opacity: 0 },
});
