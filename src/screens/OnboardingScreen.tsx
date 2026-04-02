import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { Medication, UserProfile } from '../types/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/authService';
import { getOnboardingStorageKey, ONBOARDING_STORAGE_KEY, saveUserProfile } from '../services/profileStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface OnboardingProfile {
  name: string;
  age: string;
  sex: string;
  bloodType: string;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
  height: string;
  weight: string;
  bloodPressure: string;
  bloodSugar: string;
  occupation: string;
  smoking: boolean | null;
  alcohol: boolean | null;
  physicalLabor: boolean | null;
  familyHistory: string[];
  conditions: string[];
  medications: Medication[];
  allergies: string[];
}

const FAMILY_OPTIONS = [
  'Diabetes', 'Hypertension', 'Heart disease',
  'Cancer', 'Asthma', 'Kidney disease', 'Stroke',
];

const CONDITION_OPTIONS = [
  'Hypertension', 'Diabetes', 'Asthma',
  'Arthritis', 'Tuberculosis', 'Thyroid disorder',
];

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STEPS = [
  { id: 1, label: 'Personal', title: 'Tell us\nabout you.', sub: 'Basic info so Iris knows who she\'s talking to.' },
  { id: 2, label: 'Vitals',   title: 'Your\nnumbers.', sub: 'These help Iris give you more accurate context.' },
  { id: 3, label: 'Lifestyle', title: 'How you\nlive.', sub: 'Iris tailors her questions to your daily reality.' },
  { id: 4, label: 'History',  title: 'Your health\nbackground.', sub: 'Past conditions and what runs in your family.' },
  { id: 5, label: 'Meds',     title: 'Medications\n& allergies.', sub: 'So Iris never suggests something harmful.' },
];

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
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

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function InlineInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.inlineInput} placeholderTextColor={palette.muted} {...props} />;
}

function SelectField({
  value,
  placeholder,
  options,
  open,
  onToggle,
  onSelect,
}: {
  value: string;
  placeholder: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <TouchableOpacity style={styles.selectInput} onPress={onToggle} activeOpacity={0.8}>
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={palette.muted} />
      </TouchableOpacity>

      {open ? (
        <View style={styles.selectMenu}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.selectOption}
              onPress={() => {
                onSelect(option);
                onToggle();
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.selectOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// STEP CONTENT
// ─────────────────────────────────────────────
function StepPersonal({ profile, set }: { profile: OnboardingProfile; set: (k: keyof OnboardingProfile, v: any) => void }) {
  const [bloodTypeOpen, setBloodTypeOpen] = useState(false);

  return (
    <View style={styles.stepBody}>
      <FieldLabel>Full name</FieldLabel>
      <InlineInput
        placeholder=""
        value={profile.name}
        onChangeText={(v) => set('name', v)}
      />
      <View style={styles.rowFields}>
        <View style={styles.fieldHalf}>
          <FieldLabel>Age</FieldLabel>
          <InlineInput
            placeholder=""
            keyboardType="numeric"
            value={profile.age}
            onChangeText={(v) => set('age', v)}
          />
        </View>
        <View style={styles.fieldHalf}>
          <FieldLabel>Blood type</FieldLabel>
          <SelectField
            value={profile.bloodType}
            placeholder="Select"
            options={BLOOD_TYPE_OPTIONS}
            open={bloodTypeOpen}
            onToggle={() => setBloodTypeOpen((prev) => !prev)}
            onSelect={(value) => set('bloodType', value)}
          />
        </View>
      </View>
      <FieldLabel>Sex</FieldLabel>
      <View style={styles.chipRow}>
        {['Male', 'Female'].map((s) => (
          <Chip key={s} label={s} active={profile.sex === s} onPress={() => set('sex', profile.sex === s ? '' : s)} />
        ))}
      </View>
    </View>
  );
}

function StepVitals({ profile, set }: { profile: OnboardingProfile; set: (k: keyof OnboardingProfile, v: any) => void }) {
  const numericOnly = (value: string) => value.replace(/\D/g, '');
  const formatFeetInput = (value: string) => {
    const digits = numericOnly(value).slice(0, 3);

    if (digits.length <= 1) {
      return digits;
    }

    return `${digits.slice(0, 1)}'${digits.slice(1)}`;
  };
  const [systolic = '', diastolic = ''] = profile.bloodPressure.split('/');
  const [heightUnitOpen, setHeightUnitOpen] = useState(false);
  const [weightUnitOpen, setWeightUnitOpen] = useState(false);

  return (
    <View style={styles.stepBody}>
      <View style={styles.rowFields}>
        <View style={styles.fieldHalf}>
          <FieldLabel>Height</FieldLabel>
          <View style={styles.unitInputRow}>
            <TextInput
              style={styles.unitInput}
              placeholder=""
              keyboardType="number-pad"
              value={profile.heightUnit === 'ft' ? formatFeetInput(profile.height) : profile.height}
              onChangeText={(v) =>
                set('height', profile.heightUnit === 'ft' ? formatFeetInput(v) : numericOnly(v))
              }
              maxLength={profile.heightUnit === 'ft' ? 4 : 3}
            />
            <View style={styles.unitDropdownWrap}>
              <SelectField
                value={profile.heightUnit}
                placeholder="Unit"
                options={['cm', 'ft']}
                open={heightUnitOpen}
                onToggle={() => setHeightUnitOpen((prev) => !prev)}
                onSelect={(value) => {
                  const nextUnit = value as 'cm' | 'ft';
                  set('heightUnit', nextUnit);
                  set('height', nextUnit === 'ft' ? formatFeetInput(profile.height) : numericOnly(profile.height));
                }}
              />
            </View>
          </View>
        </View>
        <View style={styles.fieldHalf}>
          <FieldLabel>Weight</FieldLabel>
          <View style={styles.unitInputRow}>
            <TextInput
              style={styles.unitInput}
              placeholder=""
              keyboardType="number-pad"
              value={profile.weight}
              onChangeText={(v) => set('weight', numericOnly(v))}
              maxLength={3}
            />
            <View style={styles.unitDropdownWrap}>
              <SelectField
                value={profile.weightUnit}
                placeholder="Unit"
                options={['kg', 'lbs']}
                open={weightUnitOpen}
                onToggle={() => setWeightUnitOpen((prev) => !prev)}
                onSelect={(value) => set('weightUnit', value as 'kg' | 'lbs')}
              />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.rowFields}>
        <View style={styles.fieldHalf}>
          <FieldLabel>Blood pressure</FieldLabel>
          <View style={styles.unitInputRow}>
            <View style={styles.bpGroup}>
              <TextInput
                style={styles.unitInput}
                placeholder=""
                keyboardType="number-pad"
                value={systolic}
                onChangeText={(v) => set('bloodPressure', `${numericOnly(v)}/${diastolic}`)}
                maxLength={3}
              />
              <Text style={styles.bpSlash}>/</Text>
              <TextInput
                style={styles.unitInput}
                placeholder=""
                keyboardType="number-pad"
                value={diastolic}
                onChangeText={(v) => set('bloodPressure', `${systolic}/${numericOnly(v)}`)}
                maxLength={3}
              />
            </View>
            <Text style={styles.unitSuffix}>mmHg</Text>
          </View>
        </View>
        <View style={styles.fieldHalf}>
          <FieldLabel>Blood sugar</FieldLabel>
          <View style={styles.unitInputRow}>
            <TextInput
              style={styles.unitInput}
              placeholder=""
              keyboardType="number-pad"
              value={profile.bloodSugar}
              onChangeText={(v) => set('bloodSugar', numericOnly(v))}
              maxLength={3}
            />
            <Text style={styles.unitSuffix}>mg/dL</Text>
          </View>
        </View>
      </View>
      <View style={styles.hintBox}>
        <Ionicons name="information-circle-outline" size={15} color="#1F8FAF" />
        <Text style={styles.hintText}>
          Don't know these yet? That's okay — you can fill them in later from your Profile.
        </Text>
      </View>
    </View>
  );
}

function StepLifestyle({ profile, set }: { profile: OnboardingProfile; set: (k: keyof OnboardingProfile, v: any) => void }) {
  return (
    <View style={styles.stepBody}>
      <FieldLabel>Occupation</FieldLabel>
      <InlineInput
        placeholder="e.g. Construction worker, Teacher, Driver"
        value={profile.occupation}
        onChangeText={(v) => set('occupation', v)}
      />
      <View style={styles.divider} />
      <YesNo label="Do you smoke?" value={profile.smoking} onChange={(v) => set('smoking', v)} />
      <YesNo label="Do you drink alcohol?" value={profile.alcohol} onChange={(v) => set('alcohol', v)} />
      <YesNo label="Does your work involve physical labor?" value={profile.physicalLabor} onChange={(v) => set('physicalLabor', v)} />
    </View>
  );
}

function StepHistory({
  profile,
  toggleChip,
}: {
  profile: OnboardingProfile;
  toggleChip: (list: 'familyHistory' | 'conditions', item: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <FieldLabel>Past conditions or diagnoses</FieldLabel>
      <View style={styles.chipRow}>
        {CONDITION_OPTIONS.map((c) => (
          <Chip key={c} label={c} active={profile.conditions.includes(c)} onPress={() => toggleChip('conditions', c)} />
        ))}
      </View>
      <View style={styles.divider} />
      <FieldLabel>Family medical history</FieldLabel>
      <Text style={styles.fieldHint}>Select conditions that run in your family.</Text>
      <View style={styles.chipRow}>
        {FAMILY_OPTIONS.map((f) => (
          <Chip key={f} label={f} active={profile.familyHistory.includes(f)} onPress={() => toggleChip('familyHistory', f)} />
        ))}
      </View>
    </View>
  );
}

function StepMeds({ profile, set }: { profile: OnboardingProfile; set: (k: keyof OnboardingProfile, v: any) => void }) {
  const [addingMed, setAddingMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', info: '' });
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');

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
    set('medications', profile.medications.filter((m: Medication) => m.id !== id));

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    set('allergies', [...profile.allergies, newAllergy.trim()]);
    setNewAllergy('');
    setAddingAllergy(false);
  };

  const removeAllergy = (a: string) =>
    set('allergies', profile.allergies.filter((x: string) => x !== a));

  return (
    <View style={styles.stepBody}>
      <FieldLabel>Current medications</FieldLabel>
      {profile.medications.map((med: Medication) => (
        <View key={med.id} style={styles.listItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{med.name}</Text>
            {!!med.info && <Text style={styles.itemSub}>{med.info}</Text>}
          </View>
          <TouchableOpacity onPress={() => removeMed(med.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={palette.muted} />
          </TouchableOpacity>
        </View>
      ))}
      {addingMed ? (
        <View style={styles.addMedForm}>
          <InlineInput
            placeholder="Medication name"
            value={newMed.name}
            onChangeText={(v) => setNewMed((m) => ({ ...m, name: v }))}
            autoFocus
          />
          <InlineInput
            placeholder="Dosage & frequency (optional)"
            value={newMed.info}
            onChangeText={(v) => setNewMed((m) => ({ ...m, info: v }))}
          />
          <View style={styles.addMedActions}>
            <TouchableOpacity onPress={() => setAddingMed(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addConfirmBtn} onPress={addMed}>
              <Text style={styles.addConfirmText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.textButton} onPress={() => setAddingMed(true)}>
          <Ionicons name="add" size={18} color={palette.terracotta} />
          <Text style={styles.textButtonText}>Add medication</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />

      <FieldLabel>Allergies</FieldLabel>
      <View style={styles.chipRow}>
        {profile.allergies.map((a: string) => (
          <TouchableOpacity key={a} style={styles.allergyPill} onPress={() => removeAllergy(a)} activeOpacity={0.7}>
            <Text style={styles.allergyPillText}>{a}</Text>
            <Ionicons name="close" size={12} color={palette.muted} style={{ marginLeft: 4 }} />
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
            <Ionicons name="add" size={16} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

  const [profile, setProfile] = useState<OnboardingProfile>({
    name: '',
    age: '',
    sex: '',
    bloodType: '',
    heightUnit: 'cm',
    weightUnit: 'kg',
    height: '',
    weight: '',
    bloodPressure: '',
    bloodSugar: '',
    occupation: '',
    smoking: null,
    alcohol: null,
    physicalLabor: null,
    familyHistory: [],
    conditions: [],
    medications: [],
    allergies: [],
  });

  const set = (key: keyof OnboardingProfile, value: any) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleChip = (list: 'familyHistory' | 'conditions', item: string) => {
    const arr = profile[list];
    set(list, arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const transition = (nextStep: number) => {
    if (isTransitioningRef.current || nextStep === step) {
      return;
    }

    isTransitioningRef.current = true;
    fadeAnim.stopAnimation(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          isTransitioningRef.current = false;
          return;
        }

        setStep(nextStep);
        fadeAnim.setValue(0);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start(() => {
          isTransitioningRef.current = false;
        });
      });
    });
  };

  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim]);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      transition(step + 1);
    } else {
      handleSave();
    }
  };

  const goBack = () => {
    if (step > 0) transition(step - 1);
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const userProfile: UserProfile = {
      name: profile.name,
      age: profile.age,
      sex: profile.sex,
      bloodType: profile.bloodType,
      chiefComplaint: '',
      doctor: '',
      clinic: '',
      philhealth: '',
      height: profile.height ? `${profile.height} ${profile.heightUnit}` : '',
      weight: profile.weight ? `${profile.weight} ${profile.weightUnit}` : '',
      bloodPressure: profile.bloodPressure,
      bloodSugar: profile.bloodSugar,
      medications: profile.medications,
      allergies: profile.allergies,
      conditions: profile.conditions,
      familyHistory: profile.familyHistory,
      lifestyle: {
        occupation: profile.occupation,
        smoking: profile.smoking,
        alcohol: profile.alcohol,
        physicalLabor: profile.physicalLabor,
        notes: '',
      },
      labResults: '',
    };

    try {
      setSaving(true);
      await saveUserProfile(userProfile);
      const userId = AuthService.getCurrentUserId();
      await AsyncStorage.setItem(getOnboardingStorageKey(userId), 'true');
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      navigation.replace('MainTabs');
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save onboarding profile', error instanceof Error ? error.message : String(error));
      }
      Alert.alert('Unable to save profile', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = (step + 1) / STEPS.length;

  const renderStep = () => {
    switch (step) {
      case 0: return <StepPersonal profile={profile} set={set} />;
      case 1: return <StepVitals profile={profile} set={set} />;
      case 2: return <StepLifestyle profile={profile} set={set} />;
      case 3: return <StepHistory profile={profile} toggleChip={toggleChip} />;
      case 4: return <StepMeds profile={profile} set={set} />;
      default: return null;
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg2.jpg')}
      style={styles.background}
      imageStyle={{ opacity: 0.42 }}
      resizeMode="cover"
      blurRadius={1}
    >
      <View style={styles.backgroundTint} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topNav}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={palette.ink} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={saving}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{current.label.toUpperCase()}</Text>
              </View>
              <Text style={styles.stepTitle}>{current.title}</Text>
              <Text style={styles.stepSub}>{current.sub}</Text>
            </View>

            <View style={styles.card}>
              {renderStep()}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Text style={styles.stepCounter}>{step + 1} of {STEPS.length}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85} disabled={saving}>
            <Text style={styles.nextBtnText}>
              {isLast ? (saving ? 'Saving...' : 'Save & continue') : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: palette.bg },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 247, 249, 0.54)',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  dotActive: {
    width: 20,
    backgroundColor: palette.terracotta,
    borderRadius: 3,
  },
  dotDone: {
    backgroundColor: '#1F8FAF',
  },
  skipText: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.sans,
    fontWeight: '600',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: spacing.xl,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: 2,
    backgroundColor: palette.terracotta,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  stepHeader: {
    marginBottom: spacing.lg,
  },
  stepBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  stepBadgeText: {
    color: palette.muted,
    fontSize: 9,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  stepTitle: {
    color: palette.ink,
    fontSize: 38,
    fontFamily: typography.serif,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.sm,
  },
  stepSub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 28,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  stepBody: { gap: 2 },
  fieldLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  fieldHint: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    marginBottom: spacing.sm,
  },
  inlineInput: {
    fontFamily: typography.sans,
    fontSize: 15,
    color: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 10,
    marginBottom: spacing.xs,
  },
  unitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 8,
    marginBottom: spacing.xs,
    gap: 8,
  },
  unitInput: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: 15,
    color: palette.ink,
    paddingVertical: 2,
  },
  unitDropdownWrap: {
    width: 86,
  },
  unitSuffix: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 10,
    gap: 6,
  },
  selectValue: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: 15,
    color: palette.ink,
  },
  selectPlaceholder: {
    color: palette.muted,
  },
  selectMenu: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    backgroundColor: palette.white,
    marginTop: 6,
    overflow: 'hidden',
  },
  selectOption: {
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  selectOptionText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: palette.ink,
  },
  bpGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bpSlash: {
    fontFamily: typography.sans,
    fontSize: 16,
    color: palette.muted,
    fontWeight: '700',
  },
  rowFields: { flexDirection: 'row', gap: spacing.md },
  fieldHalf: { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.md,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(31,143,175,0.06)',
    borderRadius: 14,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.sans,
    color: '#1F8FAF',
    lineHeight: 18,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(31,143,175,0.1)',
    borderColor: 'rgba(31,143,175,0.3)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.muted,
    fontWeight: '500',
  },
  chipTextActive: { color: '#1F8FAF', fontWeight: '700' },
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
  yesNoButtons: { flexDirection: 'row', gap: 6 },
  yesNoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yesNoBtnActive: {
    backgroundColor: 'rgba(31,143,175,0.1)',
    borderColor: 'rgba(31,143,175,0.3)',
  },
  yesNoBtnText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.muted,
    fontWeight: '600',
  },
  yesNoBtnTextActive: { color: '#1F8FAF' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: typography.sans,
    fontWeight: '600',
    color: palette.ink,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: palette.muted,
    marginTop: 2,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  textButtonText: {
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '600',
    color: palette.terracotta,
    marginLeft: 6,
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
    fontSize: 14,
    fontFamily: typography.sans,
  },
  addConfirmBtn: {
    backgroundColor: palette.terracotta,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 100,
  },
  addConfirmText: {
    color: palette.white,
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '700',
  },
  allergyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  allergyPillText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: palette.ink,
    fontWeight: '500',
  },
  allergyInput: {
    fontSize: 14,
    fontFamily: typography.sans,
    color: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
    minWidth: 120,
    paddingVertical: 4,
  },
  addPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
    backgroundColor: 'transparent',
  },
  stepCounter: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: palette.terracotta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    shadowColor: palette.terracotta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    minWidth: 158,
  },
  nextBtnText: {
    color: palette.white,
    fontSize: 17,
    fontFamily: typography.sans,
    fontWeight: '700',
  },
});