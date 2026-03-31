import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In right away
GoogleSignin.configure({
  // Paste your Web client ID from the Firebase Console here:
  webClientId: '855843046641-dv7li6mu0u5c12s40g39e0t2mmk07jcs.apps.googleusercontent.com',
});

export const AuthService = {
  signInWithGoogle: async () => {
    try {
      // 1. Check if your device has Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // 2. Get the user's ID token from Google
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      }

      // 3. Create a Firebase credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // 4. Sign-in the user with the credential
      return await auth().signInWithCredential(googleCredential);

    } catch (error) {
      console.error("Google Sign-In failed", error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      // Sign out of both Firebase and Google locally
      await Promise.all([
        auth().signOut(),
        GoogleSignin.revokeAccess(),
        GoogleSignin.signOut(),
      ]);
    } catch (error) {
      console.error("Sign out failed", error);
      throw error;
    }
  }
};