import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  loadLocalInterviewSessions,
  loadMostRecentLocalInterviewSession,
} from '../services/interviewRepository';
import { InterviewMessage, InterviewSession } from '../types/interview';
import { palette, spacing, typography } from '../tokens';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function lastUserMessage(messages: InterviewMessage[]): InterviewMessage | null {
  const reversed = [...messages].reverse();
  return reversed.find((m) => m.role === 'user') ?? null;
}

export function ConversationScreen({ navigation }: any) {
  const [recentSession, setRecentSession] = useState<InterviewSession | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const [latest, sessions] = await Promise.all([
        loadMostRecentLocalInterviewSession(),
        loadLocalInterviewSessions(),
      ]);
      if (!mounted) return;
      setRecentSession(latest);
      setSessionCount(sessions.length);
    };

    const unsubscribe = navigation.addListener('focus', () => {
      hydrate().catch(() => {
        if (mounted) { setRecentSession(null); setSessionCount(0); }
      });
    });

    hydrate().catch(() => {
      if (mounted) { setRecentSession(null); setSessionCount(0); }
    });

    return () => { mounted = false; unsubscribe(); };
  }, [navigation]);

  const lastMessage = useMemo(() => {
    if (!recentSession) return null;
    return lastUserMessage(recentSession.messages);
  }, [recentSession]);

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      blurRadius={1}
    >
      <View style={styles.backgroundTint} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={palette.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>HISTORY</Text>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessionCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              {recentSession ? '1' : '0'}
            </Text>
            <Text style={[styles.statLabel, styles.statLabelAccent]}>Active</Text>
          </View>
        </View>

        {/* ── RECENT SESSION or EMPTY ── */}
        {recentSession ? (
          <>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>LATEST SESSION</Text>
            </View>

            <View style={styles.sessionCard}>
              <View style={styles.sessionCardTop}>
                <View style={styles.latestBadge}>
                  <Text style={styles.latestBadgeText}>LATEST</Text>
                </View>
                <Text style={styles.sessionMeta}>
                  {formatTimestamp(recentSession.updatedAt)}
                </Text>
              </View>

              <Text style={styles.sessionTitle} numberOfLines={3}>
                {lastMessage?.text || 'Session started'}
              </Text>

              <TouchableOpacity
                style={styles.continueBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Interview',
                    params: { sessionId: recentSession.sessionId },
                  })
                }
              >
                <Text style={styles.continueBtnText}>Continue session</Text>
                <View style={styles.continueBtnArrow}>
                  <Ionicons name="arrow-forward" size={16} color={palette.terracotta} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>GET STARTED</Text>
            </View>

            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#1F8FAF" />
              </View>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySub}>
                Start a conversation with Iris and she'll help you prepare for your clinic visit.
              </Text>
              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Interview' })
                }
              >
                <Text style={styles.startBtnText}>Start with Iris</Text>
                <View style={styles.startBtnArrow}>
                  <Ionicons name="arrow-forward" size={14} color={palette.terracotta} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── IRIS NUDGE ── */}
        <Text style={styles.irisNudgeText}>
          Iris remembers your profile across every session.
        </Text>

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: palette.bg },
  backgroundImage: { opacity: 0.42 },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 247, 249, 0.54)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxxl * 1.2,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerLabel: {
    color: palette.muted,
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.serif,
    letterSpacing: -0.5,
  },

  // Scroll
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    paddingVertical: spacing.xl * 1.4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statCardAccent: {
    backgroundColor: 'rgba(31,143,175,0.07)',
    borderColor: 'rgba(31,143,175,0.15)',
  },
  statValue: {
    fontSize: 52,
    fontFamily: typography.serif,
    color: palette.ink,
    letterSpacing: -2,
    lineHeight: 56,
  },
  statValueAccent: { color: '#1F8FAF' },
  statLabel: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  statLabelAccent: { color: '#1F8FAF' },

  // Section pill label
  sectionPill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  sectionPillText: {
    color: palette.muted,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  // Session card — spacious, fills available area
  sessionCard: {
    backgroundColor: palette.white,
    borderRadius: 28,
    padding: spacing.xl,
    paddingVertical: spacing.xl * 1.3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: spacing.xl,
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  latestBadge: {
    backgroundColor: 'rgba(31,143,175,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  latestBadgeText: {
    color: '#1F8FAF',
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sessionMeta: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
  },
  sessionTitle: {
    color: palette.ink,
    fontSize: 26,
    fontFamily: typography.serif,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  // Full-width continue button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.terracotta,
    paddingVertical: 18,
    paddingLeft: spacing.xl,
    paddingRight: 14,
    borderRadius: 20,
    shadowColor: palette.terracotta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  continueBtnText: {
    color: palette.white,
    fontSize: 16,
    fontFamily: typography.sans,
    fontWeight: '700',
  },
  continueBtnArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyCard: {
    backgroundColor: palette.white,
    borderRadius: 28,
    padding: spacing.xl,
    paddingVertical: spacing.xl * 1.3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(31,143,175,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 24,
    fontFamily: typography.serif,
    letterSpacing: -0.5,
  },
  emptySub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
    lineHeight: 20,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.terracotta,
    paddingVertical: 18,
    paddingLeft: spacing.xl,
    paddingRight: 14,
    borderRadius: 20,
    width: '100%',
    marginTop: spacing.sm,
    shadowColor: palette.terracotta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  startBtnText: {
    color: palette.white,
    fontSize: 16,
    fontFamily: typography.sans,
    fontWeight: '700',
  },
  startBtnArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Iris nudge — plain gray
  irisNudgeText: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});