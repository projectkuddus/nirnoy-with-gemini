/**
 * Supabase Services Index
 * Centralized export for all Supabase services
 */

export { PatientService } from './patients';
export { DoctorService } from './doctors';
export { AppointmentService } from './appointments';
export { HealthRecordService } from './healthRecords';
export { AIConversationService } from './aiConversations';
export { AIInsightService } from './aiInsights';
export { QueueService } from './queue';
export { NotificationService } from './notifications';

// Re-export types
export type { ChatMessage } from './aiConversations';

