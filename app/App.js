import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
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

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BebasNeue_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, ShareTechMono_400Regular });
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const attemptRef = useRef(0);
  const settings = useSettings();
  const sound = useSound(settings.soundEnabled, settings.musicEnabled);
  const [localUid, setLocalUid] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => { if (u) setLocalUid(u.uid); });
    return unsub;
  }, []);

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
            return; // no retry — auth error is not transient
          }
          const next = Math.min(delay * 1.5, 30000);
          setTimeout(() => { if (attemptRef.current === attempt) tryConnect.current(next); }, delay);
        });
    };
    tryConnect.current();
    return () => disconnect();
  }, []);

  const uid = user?.uid ?? localUid;
  const screenProps = useMemo(
    () => ({ uid, gameState, connStatus, sound, hasPlayedOnce, settings }),
    [uid, gameState, connStatus, sound, hasPlayedOnce, settings]
  );

  const HomeScreenComp   = useCallback((props) => <HomeScreen {...props} settings={settings} uid={localUid} connStatus={connStatus} />, [settings, localUid, connStatus]);
  const LobbyScreenComp  = useCallback((props) => <LobbyScreen {...props} {...screenProps} />, [screenProps]);
  const GameScreenComp   = useCallback((props) => <GameScreen {...props} {...screenProps} />, [screenProps]);
  const GameOverComp     = useCallback((props) => <GameOverScreen {...props} {...screenProps} />, [screenProps]);
  const StatsScreenComp  = useCallback((props) => <StatsScreen {...props} uid={user?.uid} settings={settings} />, [user?.uid, settings]);
  const SettingsComp     = useCallback((props) => <SettingsScreen {...props} settings={settings} uid={localUid} />, [settings, localUid]);

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#0a0a0f' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#0a0a0f" />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a2e' }, gestureEnabled: false }}>
        <Stack.Screen name="Home">{HomeScreenComp}</Stack.Screen>
        <Stack.Screen name="Lobby">{LobbyScreenComp}</Stack.Screen>
        <Stack.Screen name="Game">{GameScreenComp}</Stack.Screen>
        <Stack.Screen name="GameOver">{GameOverComp}</Stack.Screen>
        <Stack.Screen name="Stats">{StatsScreenComp}</Stack.Screen>
        <Stack.Screen name="Settings">{SettingsComp}</Stack.Screen>
      </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

