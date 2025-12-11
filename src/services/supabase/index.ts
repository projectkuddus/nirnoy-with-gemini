/**
 * Supabase Services Index
 * Centralized export for all Supabase services
 */

// Core Services
export { PatientService } from './patients';
export { DoctorService } from './doctors';
export { AppointmentService } from './appointments';
export { HealthRecordService } from './healthRecords';
export { AIConversationService } from './aiConversations';
export { AIInsightService } from './aiInsights';
export { QueueService } from './queue';
export { NotificationService } from './notifications';

// Patient Feature Services (Phase 2)
export { VitalsService } from './vitals';
export { HealthGoalsService } from './healthGoals';
export { PatientDoctorConnectionsService } from './patientDoctorConnections';
export { PatientDocumentsService } from './patientDocuments';
export { PrescriptionsService } from './prescriptions';
export { HealthInsightsService, INSIGHT_TEMPLATES } from './healthInsights';
export { FamilyService } from './familyService';

// Re-export types
export type { ChatMessage } from './aiConversations';
export type { VitalSign, VitalSignInsert, VITAL_NORMAL_RANGES } from './vitals';
export type { HealthGoal, HealthGoalInsert, GoalProgress, GOAL_TEMPLATES } from './healthGoals';
export type { PatientDoctorConnection, DoctorConnectionEnriched } from './patientDoctorConnections';
export type { PatientDocument, DocumentInsert, DOCUMENT_TYPE_LABELS } from './patientDocuments';
export type { Prescription, PrescribedMedicine, PrescriptionEnriched } from './prescriptions';
export type { HealthInsight, HealthInsightInput } from './healthInsights';
export type { FamilyGroup, FamilyMemberDB, FamilyMemberEnriched } from './familyService';

