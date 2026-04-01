import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  loadLocalMedicalRecords,
  saveLocalMedicalRecords,
  syncMedicalRecordsForCurrentUser,
  syncPendingMedicalRecordsToCloud,
} from '../services/recordsRepository';
import { MedicineRecord } from '../types/records';
import { palette, spacing, typography } from '../tokens';

// --- SECTION HEADER ---
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// --- MEDICINE CARD ---
function MedicineCard({
  medicine,
  onRemove,
}: {
  medicine: MedicineRecord;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.cardBody}>
        <Text style={styles.cardPrimary}>{medicine.name}</Text>
        <Text style={styles.cardSecondary}>
          {medicine.dosage} · {medicine.frequency}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(medicine.id)} activeOpacity={0.6}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- ALLERGY CHIP ---
function AllergyChip({
  allergy,
  onRemove,
}: {
  allergy: string;
  onRemove: (value: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => onRemove(allergy)}
      activeOpacity={0.7}
    >
      <Text style={styles.chipText}>{allergy}</Text>
      <Text style={styles.chipRemove}>×</Text>
    </TouchableOpacity>
  );
}

// --- MAIN SCREEN ---
export function RecordsScreen() {
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditionsNote, setConditionsNote] = useState('');
  const hydratedRef = useRef(false);

  // Medicine form state
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');

  // Allergy form state
  const [allergyName, setAllergyName] = useState('');

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const local = await loadLocalMedicalRecords();
        if (mounted && local) {
          setMedicines(local.medicines);
          setAllergies(local.allergies);
          setConditionsNote(local.conditionsNote);
        }
      } finally {
        if (mounted) {
          hydratedRef.current = true;
        }
      }

      syncMedicalRecordsForCurrentUser().catch(() => {
        // Keep UI responsive even if cloud sync is unavailable.
      });
    };

    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      saveLocalMedicalRecords({
        medicines,
        allergies,
        conditionsNote,
      })
        .then(() => syncPendingMedicalRecordsToCloud())
        .catch(() => {
          // Changes remain local and can be retried later.
        });
    }, 450);

    return () => clearTimeout(timeout);
  }, [medicines, allergies, conditionsNote]);

  const addMedicine = () => {
    if (!medName.trim()) return;
    setMedicines(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: medName.trim(),
        dosage: medDosage.trim() || '—',
        frequency: medFrequency.trim() || '—',
      },
    ]);
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
  };

  const removeMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const addAllergy = () => {
    const normalized = allergyName.trim();
    if (!normalized) return;
    setAllergies(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setAllergyName('');
  };

  const removeAllergy = (value: string) => {
    setAllergies(prev => prev.filter(a => a !== value));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* PAGE HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MEDICAL RECORDS</Text>
          <Text style={styles.headerTitle}>My Health Profile</Text>
        </View>

        {/* ── MEDICINES ─────────────────────────────────── */}
        <SectionHeader title="Current Medicines" />

        {medicines.length > 0 && (
          <View style={styles.cardList}>
            {medicines.map(med => (
              <MedicineCard key={med.id} medicine={med} onRemove={removeMedicine} />
            ))}
          </View>
        )}

        {/* Medicine Form */}
        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Medicine name"
            placeholderTextColor={palette.muted}
            value={medName}
            onChangeText={setMedName}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Dosage (e.g. 500mg)"
              placeholderTextColor={palette.muted}
              value={medDosage}
              onChangeText={setMedDosage}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Frequency (e.g. 2x daily)"
              placeholderTextColor={palette.muted}
              value={medFrequency}
              onChangeText={setMedFrequency}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addMedicine} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* ── ALLERGIES ─────────────────────────────────── */}
        <SectionHeader title="Allergies" />

        {allergies.length > 0 && (
          <View style={styles.chipRow}>
            {allergies.map(allergy => (
              <AllergyChip key={allergy} allergy={allergy} onRemove={removeAllergy} />
            ))}
          </View>
        )}

        {/* Allergy Form */}
        <View style={styles.formCard}>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="e.g. Penicillin, Shellfish"
              placeholderTextColor={palette.muted}
              value={allergyName}
              onChangeText={setAllergyName}
              onSubmitEditing={addAllergy}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.inlineAdd} onPress={addAllergy} activeOpacity={0.8}>
              <Text style={styles.inlineAddText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PAST CONDITIONS ───────────────────────────── */}
        <SectionHeader title="Past Conditions" />

        <View style={styles.formCard}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Hypertension diagnosed 2019, Appendectomy 2021"
            placeholderTextColor={palette.muted}
            value={conditionsNote}
            onChangeText={setConditionsNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 1.5,
    paddingBottom: spacing.xxxl,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    marginBottom: spacing.xxxl,
  },
  headerLabel: {
    color: palette.muted,
    fontSize: 10,
    fontFamily: typography.sans,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 36,
    fontFamily: typography.serif,
    letterSpacing: -0.5,
  },

  // ── Section Title ────────────────────────────────────
  sectionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },

  // ── Medicine Cards ───────────────────────────────────
  cardList: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardPrimary: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.serif,
  },
  cardSecondary: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    fontWeight: '400',
  },
  removeText: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sans,
    fontWeight: '500',
  },

  // ── Allergy Chips ────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
  },
  chipText: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.sans,
    fontWeight: '500',
  },
  chipRemove: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: typography.sans,
  },

  // ── Form Card ────────────────────────────────────────
  formCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: typography.sans,
    color: palette.ink,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputHalf: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 90,
    marginBottom: 0,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineAdd: {
    backgroundColor: palette.ink,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  inlineAddText: {
    color: palette.white,
    fontSize: 13,
    fontFamily: typography.sans,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: palette.ink,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  addButtonText: {
    color: palette.white,
    fontSize: 14,
    fontFamily: typography.sans,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});