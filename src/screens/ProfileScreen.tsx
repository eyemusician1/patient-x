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
import { AuthService } from '../services/authService';
import { palette, spacing, typography } from '../tokens';
import {
  UserProfile,
  DEFAULT_PROFILE,
} from '../types/profile';
import { loadUserProfile, saveUserProfile } from '../services/profileStorage';

// ─────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// TOGGLE CHIP
// ─────────────────────────────────────────────
function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
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

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export function ProfileScreen({ route, navigation }: any) {
  const onboardingData: UserProfile | undefined = route?.params?.onboardingProfile;

  const [profile, setProfile] = useState<UserProfile>(
    onboardingData ?? DEFAULT_PROFILE
  );
  const [hydrated, setHydrated] = useState(false);

  const [newMed, setNewMed] = useState({ name: '', info: '' });
  const [addingMed, setAddingMed] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');
  const [addingAllergy, setAddingAllergy] = useState(false);

  const set = (key: keyof UserProfile, value: any) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleChip = (list: keyof UserProfile, item: string) => {
    const arr = profile[list] as string[];
    set(list, arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const addMed = () => {
    if (!newMed.name.trim()) return;
    set('medications', [
      ...profile.medications,
      { id: Date.now().toString(), name: newMed.name.trim(), info: newMed.info.trim() },
    ]);
    setNewMed({ name: '', info: '' });
    setAddingMed(false);
  };

  const removeMed = (id: string) =>
    set('medications', profile.medications.filter((m) => m.id !== id));

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    set('allergies', [...profile.allergies, newAllergy.trim()]);
    setNewAllergy('');
    setAddingAllergy(false);
  };

  const removeAllergy = (a: string) =>
    set('allergies', profile.allergies.filter((x) => x !== a));

  useEffect(() => {
    let mounted = true;

    const hydrateProfile = async () => {
      try {
        const stored = await loadUserProfile();
        if (mounted) {
          setProfile(onboardingData ?? stored);
        }
      } catch {
        if (mounted) {
          setProfile(onboardingData ?? DEFAULT_PROFILE);
        }
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    hydrateProfile();

    return () => {
      mounted = false;
    };
  }, [onboardingData]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timeout = setTimeout(() => {
      saveUserProfile(profile).catch((error) => {
        if (__DEV__) {
          console.error('Failed to persist profile', error instanceof Error ? error.message : String(error));
        }
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [profile, hydrated]);

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      if (__DEV__) {
        console.error('Logout failed', error instanceof Error ? error.message : String(error));
      }
    }
  };

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
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>YOUR DATA</Text>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* ── USER DATA (ESSENTIAL) ── */}
        <Section label="USER DATA">
          <Text style={styles.fieldHint}>Only essential personal details are shown here.</Text>
          <View style={styles.rowFields}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 34"
                placeholderTextColor={palette.muted}
                keyboardType="numeric"
                value={profile.age}
                onChangeText={(v) => set('age', v)}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Blood type</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. O+"
                placeholderTextColor={palette.muted}
                value={profile.bloodType}
                onChangeText={(v) => set('bloodType', v)}
              />
            </View>
          </View>
          <Text style={styles.fieldLabel}>Sex</Text>
          <View style={styles.chipRow}>
            {['Male', 'Female'].map((s) => (
              <Chip
                key={s}
                label={s}
                active={profile.sex === s}
                onPress={() => set('sex', profile.sex === s ? '' : s)}
              />
            ))}
          </View>
          <View style={styles.rowFields}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Height</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 165 cm"
                placeholderTextColor={palette.muted}
                value={profile.height}
                onChangeText={(v) => set('height', v)}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 68 kg"
                placeholderTextColor={palette.muted}
                value={profile.weight}
                onChangeText={(v) => set('weight', v)}
              />
            </View>
          </View>
          <View style={styles.rowFields}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Blood pressure</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 120/80"
                placeholderTextColor={palette.muted}
                value={profile.bloodPressure}
                onChangeText={(v) => set('bloodPressure', v)}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Blood sugar</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 95 mg/dL"
                placeholderTextColor={palette.muted}
                value={profile.bloodSugar}
                onChangeText={(v) => set('bloodSugar', v)}
              />
            </View>
          </View>
        </Section>

        <Section label="MORE DETAILS">
          <Text style={styles.fieldHint}>
            Need to add history and lifestyle details? Edit them in Advanced Health Details.
          </Text>
          <TouchableOpacity
            style={styles.advancedDetailsButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AdvancedHealthDetails')}
          >
            <Text style={styles.advancedDetailsButtonText}>Advanced Health Details</Text>
            <Ionicons name="arrow-forward" size={20} color={palette.white} />
          </TouchableOpacity>
        </Section>

        {/* ── MEDICATIONS ── */}
        <Section label="MEDICATIONS">
          {profile.medications.map((med) => (
            <View key={med.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.itemTitle}>{med.name}</Text>
                {!!med.info && <Text style={styles.itemSub}>{med.info}</Text>}
              </View>
              <TouchableOpacity onPress={() => removeMed(med.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={palette.muted} />
              </TouchableOpacity>
            </View>
          ))}

          {addingMed ? (
            <View style={styles.addMedForm}>
              <TextInput
                style={styles.inlineInput}
                placeholder="Medication name"
                placeholderTextColor={palette.muted}
                value={newMed.name}
                onChangeText={(v) => setNewMed((m) => ({ ...m, name: v }))}
                autoFocus
              />
              <TextInput
                style={styles.inlineInput}
                placeholder="Dosage & frequency (optional)"
                placeholderTextColor={palette.muted}
                value={newMed.info}
                onChangeText={(v) => setNewMed((m) => ({ ...m, info: v }))}
              />
              <View style={styles.addMedActions}>
                <TouchableOpacity onPress={() => setAddingMed(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addConfirmBtn} onPress={addMed}>
                  <Text style={styles.addConfirmText}>Add Medication</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.textButton} onPress={() => setAddingMed(true)}>
              <Ionicons name="add" size={22} color={palette.terracotta} />
              <Text style={styles.textButtonText}>Add medication</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* ── ALLERGIES ── */}
        <Section label="ALLERGIES">
          <View style={styles.chipRow}>
            {profile.allergies.map((a) => (
              <TouchableOpacity
                key={a}
                style={styles.allergyPill}
                onPress={() => removeAllergy(a)}
                activeOpacity={0.7}
              >
                <Text style={styles.allergyPillText}>{a}</Text>
                <Ionicons name="close" size={16} color={palette.muted} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
            {addingAllergy ? (
              <TextInput
                style={styles.allergyInput}
                placeholder="Type and press ↵"
                placeholderTextColor={palette.muted}
                value={newAllergy}
                onChangeText={setNewAllergy}
                onSubmitEditing={addAllergy}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity style={styles.addPill} onPress={() => setAddingAllergy(true)}>
                <Ionicons name="add" size={22} color={palette.muted} />
              </TouchableOpacity>
            )}
          </View>
        </Section>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
    </ImageBackground>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
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
  header: { marginBottom: spacing.xl },
  headerLabel: {
    color: palette.muted,
    fontSize: 13, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 46, // Scaled up
    fontFamily: typography.serif,
    letterSpacing: -1,
    marginBottom: spacing.sm,
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
    fontSize: 11, // Scaled up
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
  fieldLabel: {
    color: palette.muted,
    fontSize: 13, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  fieldHint: {
    color: palette.muted,
    fontSize: 15, // Scaled up
    fontFamily: typography.sans,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: { flex: 1 },
  inlineInput: {
    fontFamily: typography.sans,
    fontSize: 17, // Scaled up
    color: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 10,
    marginBottom: spacing.xs,
  },
  ghostInput: {
    fontFamily: typography.sans,
    fontSize: 17, // Scaled up
    color: palette.ink,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md, // Increased padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  listItemLeft: { flex: 1 },
  itemTitle: {
    fontSize: 19, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '600',
    color: palette.ink,
  },
  itemSub: {
    fontSize: 15, // Scaled up
    fontFamily: typography.sans,
    color: palette.muted,
    marginTop: 4,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  textButtonText: {
    fontSize: 18, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '600',
    color: palette.terracotta,
    marginLeft: 8,
  },
  addMedForm: { gap: 4, marginTop: spacing.sm },
  addMedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    color: palette.muted,
    fontSize: 16, // Scaled up
    fontFamily: typography.sans,
  },
  addConfirmBtn: {
    backgroundColor: palette.terracotta,
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 24, // Increased padding
    borderRadius: 100,
  },
  addConfirmText: {
    color: palette.white,
    fontSize: 16, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16, // Scaled up
    paddingVertical: 10, // Scaled up
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(31, 143, 175, 0.1)',
    borderColor: 'rgba(31, 143, 175, 0.3)',
  },
  chipText: {
    fontSize: 15, // Scaled up
    fontFamily: typography.sans,
    color: palette.muted,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#1F8FAF',
    fontWeight: '700',
  },
  allergyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 18, // Significantly scaled up padding
    paddingVertical: 12, // Significantly scaled up padding
    borderRadius: 100,
  },
  allergyPillText: {
    fontSize: 16, // Scaled up
    fontFamily: typography.sans,
    color: palette.ink,
    fontWeight: '500',
  },
  allergyInput: {
    fontSize: 16, // Scaled up
    fontFamily: typography.sans,
    color: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
    minWidth: 140,
    paddingVertical: 6,
  },
  addPill: {
    width: 44, // Scaled up width
    height: 44, // Scaled up height
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedDetailsButton: {
    marginTop: spacing.md,
    backgroundColor: '#1F8FAF',
    borderRadius: 18,
    paddingVertical: 16, // Extra vertical padding for larger touch target
    paddingHorizontal: 20, // Extra horizontal padding
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedDetailsButtonText: {
    color: palette.white,
    fontSize: 17, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18, // Taller button
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginTop: spacing.sm,
  },
  logoutButtonText: {
    color: palette.muted,
    fontSize: 17, // Scaled up
    fontFamily: typography.sans,
    fontWeight: '600',
  },
});