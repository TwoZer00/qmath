import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { connect, disconnect, listenState, listenDisconnect } from './src/services/game';
import { savePlayerName } from './src/utils/names';
import { useSound } from './src/hooks/useSound';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';
import GameOverScreen from './src/screens/GameOverScreen';
import StatsScreen from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, ShareTechMono_400Regular });
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const attemptRef = useRef(0);
  const sound = useSound();

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

  if (!fontsLoaded) return null;

  const screenProps = { uid: user?.uid, gameState, connStatus, sound, hasPlayedOnce, onNameSave: savePlayerName };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#0a0a0f" />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a2e' }, gestureEnabled: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Lobby">
          {(props) => <LobbyScreen {...props} {...screenProps} />}
        </Stack.Screen>
        <Stack.Screen name="Game">
          {(props) => <GameScreen {...props} {...screenProps} />}
        </Stack.Screen>
        <Stack.Screen name="GameOver">
          {(props) => <GameOverScreen {...props} {...screenProps} />}
        </Stack.Screen>
        <Stack.Screen name="Stats">
          {(props) => <StatsScreen {...props} uid={user?.uid} />}
        </Stack.Screen>
      </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

