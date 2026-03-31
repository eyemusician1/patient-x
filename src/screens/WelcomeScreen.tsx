import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ImageBackground } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, typography } from '../tokens'; // <-- Added typography import

export function WelcomeScreen({ navigation }: any) {

  const handleSignIn = () => {
    navigation.replace('MainTabs');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        <View style={styles.mainContent}>
          <Text style={styles.heroText}>Iris</Text>
          <Text style={styles.subtitle}>Where patient advocacy begins</Text>

          <TouchableOpacity style={styles.button} onPress={handleSignIn} activeOpacity={0.5}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLinks}>Terms of Service  ·  Privacy Policy</Text>
          <Text style={styles.footerSecurity}>
            <Ionicons name="shield-checkmark" size={10} color={palette.muted} />
            {' '}Secure & Confidential
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    color: '#1F8FAF',
    fontSize: 118,
    fontFamily: typography.serif, // <-- Added Serif
    fontWeight: '900',
    letterSpacing: -3,
    marginBottom: 10,
    textShadowColor: 'rgba(31, 143, 175, 0.24)',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 14,
    includeFontPadding: false,
  },
  subtitle: {
    color: palette.body,
    fontSize: 18,
    fontFamily: typography.sans, // <-- Added Sans
    fontWeight: '400',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(0, 0, 0, 0.12)',
    borderWidth: 1,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.sans, // <-- Added Sans
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerLinks: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans, // <-- Added Sans
    marginBottom: 10,
    fontWeight: '500',
  },
  footerSecurity: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans, // <-- Added Sans
    flexDirection: 'row',
    alignItems: 'center',
  },
});