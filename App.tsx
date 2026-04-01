// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ActivityIndicator, View } from 'react-native';
import { palette } from './src/tokens';
import { syncAllUserData } from './src/services/syncService';

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    syncAllUserData().catch((error) => {
      if (__DEV__) {
        console.error('Startup sync failed', error instanceof Error ? error.message : String(error));
      }
    });
  }, [user]);

  // Show spinner while Firebase checks existing session
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator color={palette.terracotta} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator user={user} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}