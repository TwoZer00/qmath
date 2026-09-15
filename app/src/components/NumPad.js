import React, { useRef, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import CalcKey from './CalcKey';

// Hardware keyboard input is only useful on iPad/macOS — on iPhone it just
// triggers the system numpad which conflicts with our custom CalcKey pad.
const SUPPORTS_HW_KEYBOARD = Platform.OS !== 'ios' || Platform.isPad;

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['DEL', '0', 'OK'],
];

export default function NumPad({ onPress, onSubmit, disabled, playKey, focusKey }) {
  const inputRef = useRef(null);
  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const t = setTimeout(focus, 50);
    return () => clearTimeout(t);
  }, [disabled, focusKey]);

  // reset TextInput internal value on new question so it never drifts
  useEffect(() => {
    if (inputRef.current) inputRef.current.clear();
  }, [focusKey]);

  const handleKey = (k) => {
    if (disabled) return;
    playKey?.();
    if (k === 'OK') onSubmit();
    else if (k === 'DEL') onPress('⌫');
    else onPress(k);
  };

  const handleChangeText = (text) => {
    if (disabledRef.current) return;
    // only forward the last character typed — ignore TextInput internal accumulation
    const ch = text.slice(-1);
    if (/^[0-9]$/.test(ch)) { playKey?.(); onPress(ch); }
    // always clear so TextInput never builds up its own state
    inputRef.current?.clear();
  };

  const handleSubmit = () => {
    if (!disabledRef.current) { onSubmit(); setTimeout(focus, 50); }
  };

  return (
    <View style={s.grid}>
      {SUPPORTS_HW_KEYBOARD && (
        <TextInput
          ref={inputRef}
          style={s.hidden}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onBlur={() => setTimeout(focus, 50)}
          returnKeyType="done"
          inputMode="numeric"
          autoFocus
          caretHidden
          showSoftInputOnFocus={false}
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
        />
      )}
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
