import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
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
            text: `Hello ${firstName}. I'm here to help you prepare for your clinic visit. Let's start simple: what is the main reason you are seeing the doctor today?`,
          },
        ]
      : defaultSession.messages,
  };
}

export function InterviewScreen({ navigation, route }: any) {
  // Grab the user to dynamically say their name
  const user = auth().currentUser;
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
      scrollViewRef.current?.scrollToEnd({ animated: true });
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
                  <Ionicons name="medical" size={16} color={palette.terracotta} />
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
        {isGeneratingReply ? (
          <View style={styles.messageRow}>
            <View style={styles.avatar}>
              <Ionicons name="medical" size={16} color={palette.terracotta} />
            </View>
            <View style={[styles.aiBubble, styles.thinkingBubble]}>
              <ActivityIndicator size="small" color={palette.terracotta} />
              <Text style={styles.thinkingText}>Iris is thinking...</Text>
            </View>
          </View>
        ) : null}
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
            <Ionicons name="arrow-up" size={20} color={palette.white} />
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
    marginBottom: spacing.xl,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  aiBubble: {
    backgroundColor: palette.white,
    padding: spacing.lg,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  aiText: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.sans,
    lineHeight: 24,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingText: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
  },
  userText: {
    color: palette.white,
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
    borderRadius: 28,
    padding: 6,
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
    minHeight: 56,
    maxHeight: 140,
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    fontFamily: typography.sans,
    color: palette.ink,
  },
  sendButton: {
    backgroundColor: palette.terracotta,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});