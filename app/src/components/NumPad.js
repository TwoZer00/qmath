import React, { useRef, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import CalcKey from './CalcKey';

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['DEL', '0', 'OK'],
];

export default function NumPad({ onPress, onSubmit, disabled, playKey, focusKey }) {
  const activeTouchRef = useRef(false);
  const inputRef = useRef(null);
  const disabledRef = useRef(disabled);
  const internalRef = useRef('');
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const t = setTimeout(focus, 50);
    return () => clearTimeout(t);
  }, [disabled, focusKey]);

  const handleKey = (k) => {
    if (disabled || activeTouchRef.current) return;
    activeTouchRef.current = true;
    setTimeout(() => { activeTouchRef.current = false; }, 80);
    playKey?.();
    if (k === 'OK') onSubmit();
    else if (k === 'DEL') onPress('⌫');
    else onPress(k);
  };

  const handleChangeText = (text) => {
    if (disabledRef.current) return;
    const prev = internalRef.current;
    internalRef.current = text;
    if (text.length < prev.length) {
      playKey?.(); onPress('⌫');
    } else {
      const added = text.slice(prev.length);
      for (const ch of added) {
        if (/^[0-9]$/.test(ch)) { playKey?.(); onPress(ch); }
      }
    }
  };

  const handleSubmit = () => {
    if (!disabledRef.current) {
      onSubmit();
      setTimeout(focus, 50);
    }
  };

  return (
    <View style={s.grid}>
      <TextInput
        ref={inputRef}
        style={s.hidden}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        onBlur={() => setTimeout(focus, 50)}
        returnKeyType="done"
        autoFocus
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
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
