import React, { useCallback, useEffect, useMemo, useRef, useState, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { connect, disconnect, listenState, listenDisconnect } from './src/services/game';
import { useSettings } from './src/hooks/useSettings';
import { useSound } from './src/hooks/useSound';
import { auth } from './src/services/firebase';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

class ErrorBoundary extends Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed)
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#e8eaf0', fontFamily: 'System', fontSize: 16, textAlign: 'center' }}>
            Something went wrong.{'\n'}Please restart the app.
          </Text>
        </View>
      );
    return this.props.children;
  }
}

const noop = () => {};
const SILENT_SOUND = {
  playMusic: noop, stopMusic: noop, isMusicPlaying: () => false,
  setMusicIntensity: noop, transitionToAmbient: noop, transitionToEliminated: noop,
  playStinger: noop, playKey: noop, playCorrect: noop, playError: noop,
  playEliminated: noop, playTick: noop, playRoundOver: noop,
  playVictory: noop, playJoin: noop, playVote: noop,
};

function SoundProvider({ children, soundEnabled, musicEnabled }) {
  let sound;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sound = useSound(soundEnabled, musicEnabled);
  } catch {
    sound = SILENT_SOUND;
  }
  return children(sound);
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BebasNeue_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, ShareTechMono_400Regular });
  const [fontTimeout, setFontTimeout] = useState(false);
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const attemptRef = useRef(0);
  const settings = useSettings();
  const [localUid, setLocalUid] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged((u) => { if (u) setLocalUid(u.uid); });
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const t = setTimeout(() => setFontTimeout(true), 5000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  const tryConnect = useRef(null);

  useEffect(() => {
    tryConnect.current = (delay = 3000) => {
      attemptRef.current += 1;
      const attempt = attemptRef.current;
      let unsubState = null;
      let unsubDisc = null;

      const wakingTimer = setTimeout(() => {
        if (attemptRef.current === attempt) setConnStatus('waking');
      }, 3000);

      connect()
        .then((u) => {
          clearTimeout(wakingTimer);
          setUser(u);
          setConnStatus('ready');
          unsubState = listenState((state) => {
            setGameState(state);
            if (state?.status === 'GAME_OVER') setHasPlayedOnce(true);
          });
          unsubDisc = listenDisconnect(() => {
            unsubState?.();
            unsubDisc?.();
            setConnStatus('connecting');
            setGameState(null);
            const next = Math.min(delay * 1.5, 30000);
            setTimeout(() => { if (attemptRef.current === attempt) tryConnect.current(next); }, 2000);
          });
        })
        .catch((e) => {
          clearTimeout(wakingTimer);
          if (e?.message === 'AUTH_ERROR') {
            setConnStatus('error');
            return;
          }
          const next = Math.min(delay * 1.5, 30000);
          setTimeout(() => { if (attemptRef.current === attempt) tryConnect.current(next); }, delay);
        });
    };
    tryConnect.current();
    return () => disconnect();
  }, []);

  const uid = user?.uid ?? localUid;

  if (!fontsLoaded && !fontError && !fontTimeout) return <View style={{ flex: 1, backgroundColor: '#0a0a0f' }} />;

  return (
    <ErrorBoundary>
      <SoundProvider soundEnabled={settings.soundEnabled} musicEnabled={settings.musicEnabled}>
        {(sound) => {
          const screenProps = { uid, gameState, connStatus, sound, hasPlayedOnce, settings };
          return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
              <NavigationContainer>
                <StatusBar style="light" backgroundColor="#0a0a0f" />
                <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a2e' }, gestureEnabled: false }}>
                  <Stack.Screen name="Home">{(props) => <HomeScreen {...props} settings={settings} uid={localUid} connStatus={connStatus} />}</Stack.Screen>
                  <Stack.Screen name="Lobby">{(props) => <LobbyScreen {...props} {...screenProps} />}</Stack.Screen>
                  <Stack.Screen name="Game">{(props) => <GameScreen {...props} {...screenProps} />}</Stack.Screen>
                  <Stack.Screen name="GameOver">{(props) => <GameOverScreen {...props} {...screenProps} />}</Stack.Screen>
                  <Stack.Screen name="Stats">{(props) => <StatsScreen {...props} uid={user?.uid} settings={settings} />}</Stack.Screen>
                  <Stack.Screen name="Settings">{(props) => <SettingsScreen {...props} settings={settings} uid={localUid} />}</Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </View>
          );
        }}
      </SoundProvider>
    </ErrorBoundary>
  );
}
