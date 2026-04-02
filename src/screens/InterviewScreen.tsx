import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, Keyboard } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthService } from '../services/authService';
import {
  createDefaultInterviewSession,
  createInterviewSessionId,
  loadLocalInterviewSession,
  saveLocalInterviewSession,
  syncInterviewSessionsForCurrentUser,
  syncPendingInterviewSessionsToCloud,
} from '../services/interviewRepository';
import { generateInterviewReply } from '../services/ai/interviewAssistantService';
import { InterviewSession } from '../types/interview';
import { palette, spacing, typography } from '../tokens';

function createStarterSession(sessionId: string, firstName: string): InterviewSession {
  const defaultSession = createDefaultInterviewSession(sessionId);
  const starter = defaultSession.messages[0];

  return {
    ...defaultSession,
    messages: starter
      ? [
          {
            ...starter,
            text: `Hello ${firstName}. My name is Iris and I'm here to help you prepare for your clinic visit. What is the main reason you are seeing the doctor today?`,
          },
        ]
      : defaultSession.messages,
  };
}

// Extracted as a stable component so it unmounts cleanly without
// leaving stale animated nodes (fixes RN 0.76 New Architecture crash).
function ThinkingBubble() {
  return (
    <View style={styles.messageRow}>
      <View style={styles.avatar}>
        <Image source={require('../../assets/images/iris.png')} style={styles.avatarImage} />
      </View>
      <View style={[styles.aiBubble, styles.thinkingBubble]}>
        <ActivityIndicator
          key="thinking-indicator"
          size="small"
          color={palette.terracotta}
        />
        <Text style={styles.thinkingText}>Let me think...</Text>
      </View>
    </View>
  );
}

export function InterviewScreen({ navigation, route }: any) {
  const user = AuthService.getCurrentUser();
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';
  const initialSessionId = route?.params?.sessionId ?? createInterviewSessionId();
  const sessionIdRef = useRef<string>(initialSessionId);
  const [session, setSession] = useState<InterviewSession>(() => createStarterSession(sessionIdRef.current, firstName));
  const [draft, setDraft] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const hydratedRef = useRef(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  };

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const requestedSessionId = route?.params?.sessionId;
      if (typeof requestedSessionId === 'string' && requestedSessionId.length > 0) {
        sessionIdRef.current = requestedSessionId;
      }

      const targetSessionId = sessionIdRef.current;

      try {
        const existing = await loadLocalInterviewSession(targetSessionId);
        if (!mounted) {
          return;
        }

        if (existing) {
          setSession(existing);
        } else {
          setSession(createStarterSession(targetSessionId, firstName));
        }
      } finally {
        if (mounted) {
          hydratedRef.current = true;
        }
      }

      syncInterviewSessionsForCurrentUser().catch(() => {
        // Keep chat available offline even when sync fails.
      });
    };

    hydrateSession();
    return () => {
      mounted = false;
    };
  }, [route?.params?.sessionId, firstName]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      saveLocalInterviewSession(session)
        .then(() => syncPendingInterviewSessionsToCloud())
        .catch(() => {
          // Local data remains queued for future sync.
        });
    }, 250);

    return () => clearTimeout(timeout);
  }, [session]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    scrollToLatest();
  }, [session.messages.length, isGeneratingReply]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isGeneratingReply) {
      return;
    }

    // Immediately dismiss the keyboard when the user presses send
    Keyboard.dismiss();

    const now = Date.now();
    const userMessage = {
      id: `user-${now}`,
      role: 'user' as const,
      text: trimmed,
      createdAt: now,
    };

    const nextMessages = [...session.messages, userMessage];

    setSession((prev) => ({
      ...prev,
      updatedAt: now,
      messages: nextMessages,
    }));
    setDraft('');

    setIsGeneratingReply(true);

    try {
      const reply = await generateInterviewReply({
        userInput: trimmed,
        messageHistory: nextMessages,
        context: { firstName },
      });

      const assistantCreatedAt = Date.now();
      const assistantMessage = {
        id: `assistant-${assistantCreatedAt}`,
        role: 'assistant' as const,
        text: reply.text,
        createdAt: assistantCreatedAt,
      };

      setSession((prev) => ({
        ...prev,
        updatedAt: assistantCreatedAt,
        messages: [...prev.messages, assistantMessage],
      }));
    } finally {
      setIsGeneratingReply(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color={palette.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>IRIS</Text>
          <Text style={styles.headerTitle}>Clinical Advocate</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={scrollToLatest}
      >
        {session.messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          return (
            <View key={message.id} style={[styles.messageRow, !isAssistant && styles.messageRowUser]}>
              {isAssistant && (
                <View style={styles.avatar}>
                  <Image source={require('../../assets/images/iris.png')} style={styles.avatarImage} />
                </View>
              )}
              <View style={[styles.aiBubble, !isAssistant && styles.userBubble]}>
                <Text style={[styles.aiText, !isAssistant && styles.userText]}>
                    {message.text}
                </Text>
              </View>
            </View>
          );
        })}

        {isGeneratingReply ? <ThinkingBubble /> : null}
      </ScrollView>

      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your answer..."
            placeholderTextColor={palette.muted}
            value={draft}
            onChangeText={setDraft}
            multiline={true}
          />
          <TouchableOpacity
            style={[styles.sendButton, isGeneratingReply && styles.sendButtonDisabled]}
            activeOpacity={0.8}
            onPress={() => {
              void handleSend();
            }}
            disabled={isGeneratingReply}
          >
            <Ionicons name="arrow-up" size={24} color={palette.white} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.bg,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    padding: spacing.xs,
    width: 44,
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerSubtitle: {
    color: palette.muted,
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.serif,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.xxl, // Added extra margin for bigger bubbles
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 40, // Scaled up
    height: 40, // Scaled up
    borderRadius: 20,
    backgroundColor: palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md, // Increased gap slightly
    borderWidth: 1,
    borderColor: palette.border,
  },
  avatarImage: {
    width: 32, // Scaled up
    height: 32, // Scaled up
    borderRadius: 16,
  },
  aiBubble: {
    backgroundColor: palette.white,
    padding: 20, // Increased padding
    borderRadius: 24, // Smoother roundness
    borderBottomLeftRadius: 6, // Sharper tail
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: palette.terracotta,
    borderBottomLeftRadius: 24, // Reset to match overall roundness
    borderBottomRightRadius: 6, // Tail on the right side
  },
  aiText: {
    color: palette.ink,
    fontSize: 18, // Scaled up
    fontFamily: typography.sans,
    lineHeight: 28, // Scaled up for readability
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingText: {
    color: palette.muted,
    fontSize: 16, // Scaled up
    fontFamily: typography.sans,
  },
  userText: {
    color: palette.white,
    fontSize: 18, // Explicitly setting size for user text to match
    lineHeight: 28,
  },
  inputWrapper: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: palette.bg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: palette.white,
    borderRadius: 32,
    padding: 8,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 64,
    maxHeight: 160,
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 20,
    fontSize: 18,
    fontFamily: typography.sans,
    color: palette.ink,
  },
  sendButton: {
    backgroundColor: palette.terracotta,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});