export interface MedicineRecord {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface MedicalRecordsData {
  medicines: MedicineRecord[];
  allergies: string[];
  conditionsNote: string;
}

export const DEFAULT_MEDICAL_RECORDS: MedicalRecordsData = {
  medicines: [],
  allergies: [],
  conditionsNote: '',
};
