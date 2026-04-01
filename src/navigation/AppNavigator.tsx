import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette } from '../tokens';
import { ONBOARDING_STORAGE_KEY } from '../services/profileStorage';

// Screens
import { HomeScreen }       from '../screens/HomeScreen';
import { InterviewScreen }  from '../screens/InterviewScreen';
import { ProfileScreen }    from '../screens/ProfileScreen';
import { RecordsScreen }    from '../screens/RecordsScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { AdvancedHealthDetailsScreen } from '../screens/AdvancedHealthDetailsScreen';
import { WelcomeScreen }    from '../screens/WelcomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route: tabRoute}) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: palette.terracotta,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarIcon: ({color, size, focused}) => {
          const iconName =
            tabRoute.name === 'Home'
              ? (focused ? 'home' : 'home-outline')
              : tabRoute.name === 'Interview'
                ? (focused ? 'chatbubble' : 'chatbubble-outline')
                : (focused ? 'person' : 'person-outline');

          return <Ionicons name={iconName} color={color} size={size} />;
        },
      })}>
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Interview" component={InterviewScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

interface AppNavigatorProps {
  user: FirebaseAuthTypes.User | null;
}

export function AppNavigator({ user }: AppNavigatorProps) {
  const [initializing, setInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs'>('Onboarding');

  useEffect(() => {
    let mounted = true;

    const hydrateRoute = async () => {
      if (!user) {
        if (mounted) {
          setInitialRoute('Onboarding');
          setInitializing(false);
        }
        return;
      }

      try {
        const hasOnboarded = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (mounted) {
          setInitialRoute(hasOnboarded === 'true' ? 'MainTabs' : 'Onboarding');
          setInitializing(false);
        }
      } catch {
        if (mounted) {
          setInitialRoute('Onboarding');
          setInitializing(false);
        }
      }
    };

    setInitializing(true);
    hydrateRoute();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (initializing) return null;

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        // AUTHENTICATED STACK
        <Stack.Group>
          {initialRoute === 'Onboarding' ? (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="MainTabs"   component={MainTabs} />
              <Stack.Screen name="Records"    component={RecordsScreen} />
              <Stack.Screen name="Conversation" component={ConversationScreen} />
              <Stack.Screen name="AdvancedHealthDetails" component={AdvancedHealthDetailsScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs"   component={MainTabs} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Records"    component={RecordsScreen} />
              <Stack.Screen name="Conversation" component={ConversationScreen} />
              <Stack.Screen name="AdvancedHealthDetails" component={AdvancedHealthDetailsScreen} />
            </>
          )}
        </Stack.Group>
      ) : (
        // UNAUTHENTICATED STACK
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      )}
    </Stack.Navigator>
  );
}