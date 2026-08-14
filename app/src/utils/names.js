import AsyncStorage from '@react-native-async-storage/async-storage';

const adjectives = ['Tigre', 'Rayo', 'Cobra', 'Lobo', 'Aguila', 'Toro', 'Leon', 'Zorro'];

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
