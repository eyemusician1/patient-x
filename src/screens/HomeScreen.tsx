import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { palette, spacing, typography } from '../tokens';

export function HomeScreen({ navigation }: any) {
  const currentDate = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.png')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
      resizeMode="cover"
      blurRadius={1}
    >
      <View style={styles.backgroundTint} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{currentDate}</Text>
          <Text style={styles.greeting}>Hello, Cire.</Text>
        </View>

        {/* HERO CARD */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Interview')}
        >
          <View style={styles.heroCardTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW SESSION</Text>
            </View>
            <View style={styles.heroArrow}>
              <Text style={styles.heroArrowText}>↗</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Prepare for your clinic visit</Text>
          <Text style={styles.heroSub}>
            Organize thoughts and symptoms before you see the doctor.
          </Text>
        </TouchableOpacity>

        {/* BENTO GRID */}
        <View style={styles.bentoGrid}>

          {/* ASSISTANT INTRO CARD — static, not clickable */}
          <View style={[styles.bentoCard, styles.irisCard]}>
            <View style={styles.irisBadge}>
              <Text style={styles.irisLabel}>ASSISTANT</Text>
            </View>
            <Text style={styles.irisTitle}>Meet Iris.</Text>
            <Text style={styles.irisSub}>
              Iris listens to your symptoms, helps you recall what to tell your doctor, and turns confusing medical language into plain words — so you always walk in prepared and walk out informed.
            </Text>
          </View>

          {/* ALIGNED NAVIGATION ROW */}
          <View style={styles.bentoRow}>
            <TouchableOpacity
              style={[styles.bentoCard, styles.halfWidth]}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <View style={styles.navBadge}>
                <Text style={styles.navLabel}>RECORDS</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Medical Library</Text>
                <Text style={styles.cardSub}>3 saved</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bentoCard, styles.halfWidth]}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <View style={styles.navBadge}>
                <Text style={styles.navLabel}>ACCOUNT</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Health Profile</Text>
                <Text style={styles.cardSub}>Update vitals</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* STATUS CARD */}
          <View style={[styles.bentoCard, styles.statusCard]}>
            <View style={styles.navBadge}>
              <Text style={styles.navLabel}>SYSTEM STATUS</Text>
            </View>
            <Text style={styles.statusTitle}>All systems ready.</Text>
            <Text style={styles.statusSub}>Data is encrypted and synced locally.</Text>
          </View>

        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  backgroundImageStyle: { opacity: 0.42 },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 247, 249, 0.54)',
  },
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 1.5,
    paddingBottom: spacing.xxxl,
  },
  header: { marginBottom: spacing.xl },
  dateLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  greeting: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.serif,
    letterSpacing: -1,
  },

  // --- HERO ---
  heroCard: {
    backgroundColor: palette.terracotta,
    borderRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  heroArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowText: {
    color: palette.white,
    fontSize: 16,
    lineHeight: 20,
  },
  badgeText: {
    color: palette.white,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 28,
    fontFamily: typography.serif,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: typography.sans,
    lineHeight: 20,
  },

  // --- BENTO GRID ---
  bentoGrid: { gap: spacing.md },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  bentoCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0)',
  },
  halfWidth: {
    flex: 1,
  },

  // Assistant Card
  irisCard: {
    backgroundColor: 'rgba(31, 143, 175, 0.05)',
    borderColor: 'rgba(31, 143, 175, 0.10)',
  },
  irisBadge: {
    backgroundColor: 'rgba(31, 143, 175, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  irisLabel: {
    color: '#1F8FAF',
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  irisTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.serif,
    marginBottom: spacing.sm,
  },
  irisSub: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.sans,
    lineHeight: 18,
  },

  // Typography
  navBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  navLabel: {
    color: palette.muted,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 17,
    fontFamily: typography.serif,
    lineHeight: 21,
  },
  cardSub: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    marginTop: 2,
  },

  // Status Card
  statusCard: {},
  statusHeader: {},
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34A853',
  },
  statusTitle: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.serif,
  },
  statusSub: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
  },
});