/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import { it, jest } from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

jest.mock('../src/services/syncService', () => ({
  syncAllUserData: () => Promise.resolve(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    onAuthStateChanged: (callback: (u: any) => void) => {
      callback(null);
      return () => {};
    },
  });
});

jest.mock('../src/navigation/AppNavigator', () => ({
  AppNavigator: () => null,
}));

it('renders correctly', () => {
  renderer.create(<App />);
});
