import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { palette, spacing, typography } from '../tokens';

export function ExploreScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  // Request permission when the screen opens
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Permission Required</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No Camera Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* The Live Camera Feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Custom UI overlay */}
      <View style={styles.overlay}>
        <Text style={styles.instruction}>Align the reseta or lab result inside the frame</Text>

        {/* Placeholder for the Capture Button */}
        <TouchableOpacity style={styles.captureButton} onPress={() => console.log('Snap!')}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },
  title: {
    color: palette.ink,
    fontFamily: typography.serif,
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  instruction: {
    color: palette.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.sm,
    borderRadius: 8,
    fontSize: 16,
    marginTop: spacing.xl,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.white,
  },
});