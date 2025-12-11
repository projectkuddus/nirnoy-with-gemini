// Patient Component Exports
export { ProfileManager } from './ProfileManager';
export { MedicalHistoryManager } from './MedicalHistoryManager';
export { HealthRecords } from './HealthRecords';
export { AppointmentManager } from './AppointmentManager';
export { PrescriptionTracker } from './PrescriptionTracker';
export { HealthTimeline } from './HealthTimeline';
export { MedicationTracker } from './MedicationTracker';
export { HealthDashboard } from './HealthDashboard';
export { MyDoctors } from './MyDoctors';
export { DocumentUpload } from './DocumentUpload';
export { FamilyHealth } from './FamilyHealth';
export { ChildHealthTracker, STANDARD_VACCINATIONS, DEVELOPMENTAL_MILESTONES } from './ChildHealthTracker';

// Re-export types
export type { ChronicCondition, Allergy, Medication, Surgery, FamilyHistory, Vaccination, MedicalHistoryData } from './MedicalHistoryManager';
export type { HealthRecord } from './HealthRecords';
export type { Appointment } from './AppointmentManager';
export type { Prescription, PrescribedMedicine } from './PrescriptionTracker';
export type { TimelineEvent } from './HealthTimeline';
export type { Medication as MedicationData, Prescription as PrescriptionData } from './MedicationTracker';
export type { VitalSign, HealthGoal, HealthInsight, HealthRisk } from './HealthDashboard';
export type { DoctorConnection } from './MyDoctors';
export type { ChildProfile, GrowthRecord, Vaccination, Milestone } from './ChildHealthTracker';
export type { FamilyMember } from './FamilyHealth';
