import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette } from '../tokens';

// Screens
import { HomeScreen }       from '../screens/HomeScreen';
import { InterviewScreen }  from '../screens/InterviewScreen';
import { ProfileScreen }    from '../screens/ProfileScreen';
import { WelcomeScreen }    from '../screens/WelcomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ route }: any) {
  const onboardingProfile = route?.params?.onboardingProfile;

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
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ onboardingProfile }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs'>('Onboarding');

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check if the user has already completed onboarding
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        if (hasOnboarded === 'true') {
          setInitialRoute('MainTabs');
        } else {
          setInitialRoute('Onboarding');
        }
      }

      if (initializing) setInitializing(false);
    });

    return subscriber; // Unsubscribe on unmount
  }, [initializing]);

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
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs"   component={MainTabs} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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