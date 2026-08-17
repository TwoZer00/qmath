import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { LANGUAGES } from '../i18n';

const getDeviceLang = () => {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return LANGUAGES.includes(locale) ? locale : 'en';
};

const KEYS = { name: 'playerName', sound: 'soundEnabled', lang: 'language' };

export function useSettings() {
  const [playerName, setPlayerName] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [name, sound, lang] = await Promise.all([
        AsyncStorage.getItem(KEYS.name),
        AsyncStorage.getItem(KEYS.sound),
        AsyncStorage.getItem(KEYS.lang),
      ]);
      setPlayerName(name || '');
      setSoundEnabled(sound === null ? true : sound === 'true');
      setLanguage(lang || getDeviceLang());
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

  const setLang = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem(KEYS.lang, lang);
  };

  return { playerName, soundEnabled, language, loaded, saveName, toggleSound, setLang };
}
