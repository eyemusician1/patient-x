import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { UserProfile } from '../types/profile';
import { loadUserProfile, saveUserProfile } from '../services/profileStorage';

const CONDITION_OPTIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'Arthritis',
  'Thyroid disorder',
  'Kidney disease',
];

const FAMILY_OPTIONS = [
  'Diabetes',
  'Hypertension',
  'Heart disease',
  'Cancer',
  'Stroke',
  'Kidney disease',
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionPill}>
          <Text style={styles.sectionLabel}>{label}</Text>
        </View>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={styles.yesNoButtons}>
        {[true, false].map((opt) => (
          <TouchableOpacity
            key={String(opt)}
            style={[styles.yesNoBtn, value === opt && styles.yesNoBtnActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.yesNoBtnText, value === opt && styles.yesNoBtnTextActive]}>
              {opt ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function AdvancedHealthDetailsScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const set = (key: keyof UserProfile, value: any) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleChip = (list: keyof UserProfile, item: string) => {
    if (!profile) {
      return;
    }

    const arr = profile[list] as string[];
    set(list, arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const setLifestyle = (key: keyof UserProfile['lifestyle'], value: any) => {
    if (!profile) {
      return;
    }

    set('lifestyle', { ...profile.lifestyle, [key]: value });
  };

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const current = await loadUserProfile();
      if (mounted) {
        setProfile(current);
        setHydrated(true);
      }
    };

    hydrate().catch(() => {
      if (mounted) {
        setHydrated(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !profile) {
      return;
    }

    const timeout = setTimeout(() => {
      saveUserProfile(profile).catch(() => {
        // Keep edits local in memory while user is on this screen.
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [profile, hydrated]);

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading health details...</Text>
      </View>
    );
  }

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
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color={palette.ink} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>ADVANCED HEALTH</Text>
          <Text style={styles.headerTitle}>Additional Details</Text>
          <Text style={styles.headerSub}>Optional information to improve Iris context quality.</Text>
        </View>

        <Section label="PAST CONDITIONS">
          <View style={styles.chipRow}>
            {CONDITION_OPTIONS.map((item) => (
              <Chip
                key={item}
                label={item}
                active={profile.conditions.includes(item)}
                onPress={() => toggleChip('conditions', item)}
              />
            ))}
          </View>
        </Section>

        <Section label="FAMILY HISTORY">
          <View style={styles.chipRow}>
            {FAMILY_OPTIONS.map((item) => (
              <Chip
                key={item}
                label={item}
                active={profile.familyHistory.includes(item)}
                onPress={() => toggleChip('familyHistory', item)}
              />
            ))}
          </View>
        </Section>

        <Section label="LIFESTYLE">
          <Text style={styles.fieldLabel}>Occupation</Text>
          <TextInput
            style={styles.inlineInput}
            placeholder="e.g. Driver, Teacher, Nurse"
            placeholderTextColor={palette.muted}
            value={profile.lifestyle.occupation}
            onChangeText={(v) => setLifestyle('occupation', v)}
          />

          <YesNo
            label="Do you smoke?"
            value={profile.lifestyle.smoking}
            onChange={(v) => setLifestyle('smoking', v)}
          />
          <YesNo
            label="Do you drink alcohol?"
            value={profile.lifestyle.alcohol}
            onChange={(v) => setLifestyle('alcohol', v)}
          />
          <YesNo
            label="Physical labor at work?"
            value={profile.lifestyle.physicalLabor}
            onChange={(v) => setLifestyle('physicalLabor', v)}
          />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Any details that affect your health day to day"
            placeholderTextColor={palette.muted}
            value={profile.lifestyle.notes}
            onChangeText={(v) => setLifestyle('notes', v)}
          />
        </Section>

        <Section label="RECENT LABS">
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add recent results or findings"
            placeholderTextColor={palette.muted}
            value={profile.labResults}
            onChangeText={(v) => set('labResults', v)}
          />
        </Section>

        <View style={styles.savedHintRow}>
          <Ionicons name="checkmark-circle" size={14} color="#1F8FAF" />
          <Text style={styles.savedHint}>Changes save automatically.</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: palette.bg },
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
  },
  header: { marginBottom: spacing.lg },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sm,
    gap: 4,
  },
  backButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.sans,
    fontWeight: '600',
  },
  headerLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 40,
    fontFamily: typography.serif,
    letterSpacing: -1,
  },
  headerSub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
    marginTop: spacing.sm,
  },
  section: { marginBottom: spacing.lg },
  sectionLabelRow: { marginBottom: spacing.sm },
  sectionPill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(31, 143, 175, 0.1)',
    borderColor: 'rgba(31, 143, 175, 0.3)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.muted,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#1F8FAF',
    fontWeight: '700',
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inlineInput: {
    fontFamily: typography.sans,
    fontSize: 15,
    color: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 8,
    marginBottom: spacing.xs,
  },
  notesInput: {
    fontFamily: typography.sans,
    fontSize: 15,
    color: palette.ink,
    textAlignVertical: 'top',
    minHeight: 84,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yesNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  yesNoLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.sans,
    color: palette.ink,
    paddingRight: spacing.md,
  },
  yesNoButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  yesNoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yesNoBtnActive: {
    backgroundColor: 'rgba(31, 143, 175, 0.1)',
    borderColor: 'rgba(31, 143, 175, 0.3)',
  },
  yesNoBtnText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.muted,
    fontWeight: '600',
  },
  yesNoBtnTextActive: {
    color: '#1F8FAF',
  },
  savedHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  savedHint: {
    color: '#1F8FAF',
    fontSize: 12,
    fontFamily: typography.sans,
    fontWeight: '600',
  },
});