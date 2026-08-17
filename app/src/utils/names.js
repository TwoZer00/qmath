import AsyncStorage from '@react-native-async-storage/async-storage';

const adjectives = ['Tiger', 'Bolt', 'Cobra', 'Wolf', 'Eagle', 'Bull', 'Lion', 'Fox'];

export const nameFromUid = (uid) => {
  if (!uid) return 'Jugador';
  const hash = uid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const adj = adjectives[hash % adjectives.length];
  const num = String(hash % 90 + 10);
  return `${adj}${num}`;
};

export const getSavedName = async () => {
  try { return await AsyncStorage.getItem('playerName'); } catch { return null; }
};
export const savePlayerName = async (name) => {
  if (!name?.trim()) return;
  try { await AsyncStorage.setItem('playerName', name.trim()); } catch {}
};
