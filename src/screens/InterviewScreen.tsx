import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';

export function InterviewScreen({ navigation }: any) {
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

      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        <View style={styles.messageRow}>
          <View style={styles.avatar}>
            <Ionicons name="medical" size={16} color={palette.terracotta} />
          </View>
          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>
              Hello Cire. I'm here to help you prepare for your clinic visit. Let's start simple: what is the main reason you are seeing the doctor today?
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your answer..."
            placeholderTextColor={palette.muted}
            multiline={true}
          />
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.8}>
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
    fontFamily: typography.sans, // <-- Added Sans
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
  aiText: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.sans, // <-- Added Sans
    lineHeight: 24,
  },
  inputWrapper: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: palette.bg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: 4,
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
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    fontFamily: typography.sans, // <-- Added Sans
    color: palette.ink,
  },
  sendButton: {
    backgroundColor: palette.terracotta,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
});