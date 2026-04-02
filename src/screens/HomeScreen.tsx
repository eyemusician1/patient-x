import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { AuthService } from '../services/authService';
import { loadMostRecentLocalInterviewSession } from '../services/interviewRepository';
import { palette, spacing, typography } from '../tokens';

export function HomeScreen({ navigation }: any) {
  const user = AuthService.getCurrentUser();
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Guest';

  const [recentConversation, setRecentConversation] = React.useState<{
    preview: string;
    count: number;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const hydrateRecentConversation = async () => {
      const latest = await loadMostRecentLocalInterviewSession();
      if (!mounted || !latest) {
        if (mounted) setRecentConversation(null);
        return;
      }

      const lastUserMessage = [...latest.messages]
        .reverse()
        .find((m) => m.role === 'user');

      setRecentConversation({
        preview: lastUserMessage?.text ?? 'Recent chat',
        count: latest.messages.length,
      });
    };

    const unsubscribe = navigation.addListener('focus', () => {
      hydrateRecentConversation().catch(() => {
        if (mounted) setRecentConversation(null);
      });
    });

    hydrateRecentConversation().catch(() => {
      if (mounted) setRecentConversation(null);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigation]);

  const currentDate = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.jpg')}
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
        bounces={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{currentDate}</Text>
          <Text style={styles.greeting}>Hello, {firstName}.</Text>
        </View>

        {/* HERO CARD */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Interview')}
        >
          <View style={styles.heroCardTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CLINIC PREP</Text>
            </View>
            <View style={styles.heroArrow}>
              <Text style={styles.heroArrowText}>↗</Text>
            </View>
          </View>
          <View style={styles.heroCardBottom}>
            <Text style={styles.heroTitle}>Prepare for your clinic visit</Text>
            <Text style={styles.heroSub}>
              Organize your symptoms, review current medications, and note down key questions so you don't forget anything during your appointment.
            </Text>
          </View>
        </TouchableOpacity>

        {/* BENTO GRID */}
        <View style={styles.bentoLayout}>

          {/* ASSISTANT CARD */}
          <View style={[styles.bentoCard, styles.irisCard, styles.assistantCard]}>
            <Text style={styles.irisEyebrow}>ASSISTANT</Text>
            <View style={{ flex: 1 }} />
            <View>
              <Text style={styles.irisTitle}>Iris</Text>
              <Text style={styles.irisSub}>Your AI guide for symptom prep.</Text>
            </View>
          </View>

          {/* RIGHT COLUMN */}
          <View style={styles.rightColumn}>

            {/* CHATS CARD */}
            <TouchableOpacity
              style={[styles.bentoCard, styles.stackCard]}
              onPress={() => navigation.navigate('Conversation')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEyebrow}>CONVERSATION</Text>
              <View style={{ flex: 1 }} />
              <View>
                <Text style={styles.cardTitle}>Recent chats</Text>
                <Text style={styles.cardMeta}>
                  {recentConversation ? `${recentConversation.count} msgs` : 'Start chat'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* PROFILE CARD */}
            <TouchableOpacity
              style={[styles.bentoCard, styles.stackCard]}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEyebrow}>HEALTH</Text>
              <View style={{ flex: 1 }} />
              <View>
                <Text style={styles.cardTitle}>Profile</Text>
                <Text style={styles.cardMeta}>Vitals & Data</Text>
              </View>
            </TouchableOpacity>

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
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 1.1,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greeting: {
    color: palette.ink,
    fontSize: 38,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: -1,
  },

  // HERO CARD
  heroCard: {
    flex: 1.1,
    backgroundColor: palette.terracotta,
    borderRadius: 24,
    padding: spacing.xl,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  badgeText: {
    color: palette.white,
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowText: {
    color: palette.white,
    fontSize: 18,
    lineHeight: 22,
  },
  heroCardBottom: {
    marginTop: spacing.xl,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 32,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontFamily: typography.sans,
    fontWeight: '500',
    lineHeight: 22, // Slightly increased line height for readability
  },

  // BENTO GRID
  bentoLayout: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  bentoCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  assistantCard: {
    flex: 1.1,
  },
  rightColumn: {
    flex: 1,
    gap: spacing.md,
  },
  stackCard: {
    flex: 1,
  },

  // CARD TYPOGRAPHY
  irisCard: {
    backgroundColor: 'rgba(31,143,175,0.06)',
    borderColor: 'rgba(31,143,175,0.12)',
  },
  irisEyebrow: {
    color: '#1F8FAF',
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  irisTitle: {
    color: palette.ink,
    fontSize: 30,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  irisSub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 4,
  },
  cardEyebrow: {
    color: palette.muted,
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  cardMeta: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.sans,
    fontWeight: '500',
    marginTop: 4,
  },
});