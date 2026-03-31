// ─────────────────────────────────────────────
// SHARED PROFILE TYPES
// Used by OnboardingScreen, ProfileScreen, and
// any screen that calls Iris (InterviewScreen).
// ─────────────────────────────────────────────

export interface Medication {
  id: string;
  name: string;
  info: string;
}

export interface Lifestyle {
  occupation: string;
  smoking: boolean | null;
  alcohol: boolean | null;
  physicalLabor: boolean | null;
  notes: string;
}

export interface UserProfile {
  // Personal
  name: string;
  age: string;
  sex: string;
  bloodType: string;
  // This visit
  chiefComplaint: string;
  doctor: string;
  clinic: string;
  philhealth: string;
  // Vitals
  height: string;
  weight: string;
  bloodPressure: string;
  bloodSugar: string;
  // Medical
  medications: Medication[];
  allergies: string[];
  conditions: string[];
  familyHistory: string[];
  // Lifestyle
  lifestyle: Lifestyle;
  // Extra
  labResults: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: '',
  sex: '',
  bloodType: '',
  chiefComplaint: '',
  doctor: '',
  clinic: '',
  philhealth: '',
  height: '',
  weight: '',
  bloodPressure: '',
  bloodSugar: '',
  medications: [],
  allergies: [],
  conditions: [],
  familyHistory: [],
  lifestyle: {
    occupation: '',
    smoking: null,
    alcohol: null,
    physicalLabor: null,
    notes: '',
  },
  labResults: '',
};

// ─────────────────────────────────────────────
// IRIS CONTEXT BUILDER
// Call this at the start of every Iris session.
// Inject the returned string as the system prompt.
// ─────────────────────────────────────────────
export function buildIrisContext(profile: UserProfile): string {
  const lines: string[] = [
    '## Patient Profile (do not ask about anything already listed here)',
    '',
  ];

  if (profile.name) lines.push(`Name: ${profile.name}`);
  if (profile.age) lines.push(`Age: ${profile.age}`);
  if (profile.sex) lines.push(`Sex: ${profile.sex}`);
  if (profile.bloodType) lines.push(`Blood type: ${profile.bloodType}`);

  if (profile.height || profile.weight || profile.bloodPressure || profile.bloodSugar) {
    lines.push('');
    lines.push('### Vitals');
    if (profile.height) lines.push(`Height: ${profile.height}`);
    if (profile.weight) lines.push(`Weight: ${profile.weight}`);
    if (profile.bloodPressure) lines.push(`Blood pressure: ${profile.bloodPressure}`);
    if (profile.bloodSugar) lines.push(`Blood sugar: ${profile.bloodSugar}`);
  }

  if (profile.chiefComplaint) {
    lines.push('');
    lines.push('### Reason for this visit');
    lines.push(profile.chiefComplaint);
  }

  if (profile.medications.length > 0) {
    lines.push('');
    lines.push('### Current medications');
    profile.medications.forEach((m) =>
      lines.push(`- ${m.name}${m.info ? ` (${m.info})` : ''}`)
    );
  }

  if (profile.allergies.length > 0) {
    lines.push('');
    lines.push('### Allergies');
    lines.push(profile.allergies.join(', '));
  }

  if (profile.conditions.length > 0) {
    lines.push('');
    lines.push('### Past conditions / diagnoses');
    profile.conditions.forEach((c) => lines.push(`- ${c}`));
  }

  if (profile.familyHistory.length > 0) {
    lines.push('');
    lines.push('### Family medical history');
    lines.push(profile.familyHistory.join(', '));
  }

  const { occupation, smoking, alcohol, physicalLabor, notes } = profile.lifestyle;
  if (occupation || smoking !== null || alcohol !== null || physicalLabor !== null || notes) {
    lines.push('');
    lines.push('### Lifestyle');
    if (occupation) lines.push(`Occupation: ${occupation}`);
    if (smoking !== null) lines.push(`Smoker: ${smoking ? 'Yes' : 'No'}`);
    if (alcohol !== null) lines.push(`Drinks alcohol: ${alcohol ? 'Yes' : 'No'}`);
    if (physicalLabor !== null) lines.push(`Physical labor: ${physicalLabor ? 'Yes' : 'No'}`);
    if (notes) lines.push(`Notes: ${notes}`);
  }

  if (profile.labResults) {
    lines.push('');
    lines.push('### Recent lab results');
    lines.push(profile.labResults);
  }

  if (profile.doctor || profile.clinic || profile.philhealth) {
    lines.push('');
    lines.push('### Clinic info');
    if (profile.doctor) lines.push(`Doctor: ${profile.doctor}`);
    if (profile.clinic) lines.push(`Clinic: ${profile.clinic}`);
    if (profile.philhealth) lines.push(`PhilHealth / Insurance: ${profile.philhealth}`);
  }

  lines.push('');
  lines.push(
    'Use this context to personalize your questions. Skip anything you already know. ' +
    "Tailor your language to the patient's literacy level and lifestyle constraints. " +
    'Highlight concerns that align with their occupation and family history.'
  );

  return lines.join('\n');
}