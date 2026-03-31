import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {palette} from '../tokens';

// Screens
import {HomeScreen}       from '../screens/HomeScreen';
import {InterviewScreen}  from '../screens/InterviewScreen';
import {ProfileScreen}    from '../screens/ProfileScreen';
import {WelcomeScreen}    from '../screens/WelcomeScreen';
import {OnboardingScreen} from '../screens/OnboardingScreen';

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
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome"    component={WelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs"   component={MainTabs} />
    </Stack.Navigator>
  );
}