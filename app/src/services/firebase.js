import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useEmulator = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
const EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || 'localhost';

const firebaseConfig = useEmulator
  ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'qmath-78ccc' }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    };

let auth, db;
try {
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  db = getFirestore(app);
  if (useEmulator) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  }
} catch (e) {
  console.error('[firebase] init failed:', e);
  auth = null;
  db = null;
}
export { auth, db };
