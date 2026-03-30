import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {palette} from '../tokens';
import {HomeScreen}    from '../screens/HomeScreen';
import {ExploreScreen} from '../screens/ExploreScreen';
import {ProfileScreen} from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
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
            route.name === 'Home'
              ? (focused ? 'home' : 'home-outline')
              : route.name === 'Explore'
                ? (focused ? 'camera' : 'camera-outline')
                : (focused ? 'person' : 'person-outline');

          return <Ionicons name={iconName} color={color} size={size} />;
        },
      })}>
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
