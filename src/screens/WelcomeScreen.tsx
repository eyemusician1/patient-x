import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { palette, typography } from '../tokens';
import { AuthService } from '../services/authService';

export function WelcomeScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await AuthService.signInWithGoogle();
      // Notice: No navigation call here! AppNavigator handles the swap.
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (__DEV__) {
        console.error('Login failed', message);
      }
      Alert.alert('Sign-in failed', message || 'Please try again.');
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        <View style={styles.mainContent}>
          <Text style={styles.heroText}>Iris</Text>
          <Text style={styles.subtitle}>Where patient advocacy begins</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={palette.ink} />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroText: {
    color: '#1F8FAF',
    fontSize: 118,
    fontFamily: typography.serif,
    fontWeight: '900',
    letterSpacing: -3,
    marginBottom: 10,
    textShadowColor: 'rgba(31, 143, 175, 0.24)',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 14,
    includeFontPadding: false,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 18,
    fontFamily: typography.sans,
    fontWeight: '400',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 240,
  },
  buttonText: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.sans,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});