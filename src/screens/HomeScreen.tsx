import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { loadMostRecentLocalInterviewSession } from '../services/interviewRepository';
import { palette, spacing, typography } from '../tokens';

export function HomeScreen({ navigation }: any) {
  const user = auth().currentUser;
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
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{currentDate}</Text>
          <Text style={styles.greeting}>Hello, {firstName}.</Text>
        </View>

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
          <Text style={styles.heroTitle}>Prepare for your clinic visit</Text>
          <Text style={styles.heroSub}>
            Plan symptoms, meds, and key questions.
          </Text>
        </TouchableOpacity>

        <View style={styles.bentoLayout}>
          <View style={[styles.bentoCard, styles.irisCard, styles.assistantCard]}>
            <Text style={styles.irisEyebrow}>ASSISTANT</Text>
            <Text style={styles.irisTitle}>Iris</Text>
            <Text style={styles.irisSub}>Your AI guide for symptom prep.</Text>
          </View>

          <View style={styles.rightColumn}>
            <TouchableOpacity
              style={[styles.bentoCard, styles.stackCard]}
              onPress={() => navigation.navigate('Conversation')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEyebrow}>CONVERSATION</Text>
              <Text style={styles.cardTitle}>Recent chats</Text>
              <Text style={styles.cardMeta}>
                {recentConversation ? `${recentConversation.count} msgs` : 'Start chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bentoCard, styles.stackCard]}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEyebrow}>HEALTH</Text>
              <Text style={styles.cardTitle}>Profile</Text>
              <Text style={styles.cardMeta}>Vitals</Text>
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
    fontSize: 40,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: palette.terracotta,
    borderRadius: 28,
    padding: spacing.xl,
    minHeight: 280,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heroCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  badgeText: {
    color: palette.white,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowText: {
    color: palette.white,
    fontSize: 16,
    lineHeight: 20,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 34,
    fontFamily: typography.sans,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: spacing.sm,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: typography.sans,
    lineHeight: 20,
  },
  bentoLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    minHeight: 340,
    flex: 1,
  },
  bentoCard: {
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'space-between',
  },
  assistantCard: {
    flex: 1.05,
    minHeight: 340,
  },
  rightColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  stackCard: {
    flex: 1,
    minHeight: 145,
  },
  irisCard: {
    backgroundColor: 'rgba(31,143,175,0.06)',
    borderColor: 'rgba(31,143,175,0.12)',
  },
  irisEyebrow: {
    color: '#1F8FAF',
    fontSize: 9,
    fontFamily: typography.sans,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  irisTitle: {
    color: palette.ink,
    fontSize: 32,
    fontFamily: typography.sans,
    letterSpacing: -0.2,
  },
  irisSub: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.sans,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  cardEyebrow: {
    color: palette.muted,
    fontSize: 9,
    fontFamily: typography.sans,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.sans,
    lineHeight: 26,
  },
  cardMeta: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans,
    marginTop: spacing.xs,
  },
});
