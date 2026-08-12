import AsyncStorage from '@react-native-async-storage/async-storage';

const adjectives = ['Tigre', 'Rayo', 'Cobra', 'Lobo', 'Aguila', 'Toro', 'Leon', 'Zorro'];
const numbers = () => Math.floor(Math.random() * 90) + 10;

export const randomName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]}${numbers()}`;

export const getSavedName = async () => {
  try { return await AsyncStorage.getItem('playerName'); } catch { return null; }
};
export const savePlayerName = async (name) => {
  if (!name?.trim()) return;
  try { await AsyncStorage.setItem('playerName', name.trim()); } catch {}
};
