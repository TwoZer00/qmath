import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { name: 'playerName', sound: 'soundEnabled' };

export function useSettings() {
  const [playerName, setPlayerName] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [name, sound] = await Promise.all([
        AsyncStorage.getItem(KEYS.name),
        AsyncStorage.getItem(KEYS.sound),
      ]);
      setPlayerName(name || '');
      setSoundEnabled(sound === null ? true : sound === 'true');
      setLoaded(true);
    })();
  }, []);

  const saveName = async (name) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    setPlayerName(trimmed);
    await AsyncStorage.setItem(KEYS.name, trimmed);
  };

  const toggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await AsyncStorage.setItem(KEYS.sound, String(next));
  };

  return { playerName, soundEnabled, loaded, saveName, toggleSound };
}
