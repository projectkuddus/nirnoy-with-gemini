/**
 * Patient Documents Service
 * Handles health records, documents, and file uploads
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface PatientDocument {
  id: string;
  patient_id: string;
  document_type: 'prescription' | 'lab_report' | 'imaging' | 'discharge_summary' | 'certificate' | 'insurance' | 'other';
  title: string;
  description?: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  document_date: string;
  doctor_name?: string;
  doctor_id?: string;
  hospital_name?: string;
  appointment_id?: string;
  tags: string[];
  ocr_text?: string;
  is_shared_with_doctors: boolean;
  uploaded_at: string;
}

export interface DocumentInsert {
  patient_id: string;
  document_type: PatientDocument['document_type'];
  title: string;
  description?: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  document_date?: string;
  doctor_name?: string;
  doctor_id?: string;
  hospital_name?: string;
  appointment_id?: string;
  tags?: string[];
  is_shared_with_doctors?: boolean;
}

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<PatientDocument['document_type'], { label: string; labelBn: string; icon: string }> = {
  prescription: { label: 'Prescription', labelBn: 'প্রেসক্রিপশন', icon: '📋' },
  lab_report: { label: 'Lab Report', labelBn: 'ল্যাব রিপোর্ট', icon: '🔬' },
  imaging: { label: 'X-Ray/CT/MRI', labelBn: 'ইমেজিং', icon: '🩻' },
  discharge_summary: { label: 'Discharge Summary', labelBn: 'ডিসচার্জ সামারি', icon: '🏥' },
  certificate: { label: 'Medical Certificate', labelBn: 'সার্টিফিকেট', icon: '📄' },
  insurance: { label: 'Insurance', labelBn: 'বীমা', icon: '🛡️' },
  other: { label: 'Other', labelBn: 'অন্যান্য', icon: '📁' },
};

export class PatientDocumentsService {
  /**
   * Upload a document to Supabase Storage
   */
  static async uploadFile(
    patientId: string,
    file: File
  ): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string } | null> {
    if (!isSupabaseConfigured()) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('health-records')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('health-records')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  }

  /**
   * Add a new document record
   */
  static async addDocument(document: DocumentInsert): Promise<PatientDocument | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('patient_documents')
      .insert({
        ...document,
        document_date: document.document_date || new Date().toISOString().split('T')[0],
        tags: document.tags || [],
        is_shared_with_doctors: document.is_shared_with_doctors !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding document:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient's documents
   */
  static async getPatientDocuments(
    patientId: string,
    options?: {
      documentType?: PatientDocument['document_type'];
      doctorId?: string;
      limit?: number;
      offset?: number;
      searchQuery?: string;
    }
  ): Promise<PatientDocument[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('document_date', { ascending: false });

    if (options?.documentType) {
      query = query.eq('document_type', options.documentType);
    }

    if (options?.doctorId) {
      query = query.eq('doctor_id', options.doctorId);
    }

    if (options?.searchQuery) {
      query = query.or(`title.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%,ocr_text.ilike.%${options.searchQuery}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get documents by type with counts
   */
  static async getDocumentStats(patientId: string): Promise<Record<string, number>> {
    if (!isSupabaseConfigured()) return {};

    const { data, error } = await supabase
      .from('patient_documents')
      .select('document_type')
      .eq('patient_id', patientId);

    if (error) {
      console.error('Error fetching document stats:', error);
      return {};
    }

    const stats: Record<string, number> = { total: data?.length || 0 };
    data?.forEach(doc => {
      stats[doc.document_type] = (stats[doc.document_type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Update document
   */
  static async updateDocument(
    documentId: string,
    updates: Partial<PatientDocument>
  ): Promise<PatientDocument | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('patient_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Get the document to delete the file
    const { data: doc } = await supabase
      .from('patient_documents')
      .select('file_url')
      .eq('id', documentId)
      .single();

    // Delete from database
    const { error } = await supabase
      .from('patient_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }

    // Try to delete from storage (extract path from URL)
    if (doc?.file_url) {
      try {
        const url = new URL(doc.file_url);
        const path = url.pathname.split('/health-records/')[1];
        if (path) {
          await supabase.storage.from('health-records').remove([path]);
        }
      } catch (e) {
        console.error('Error deleting file from storage:', e);
      }
    }

    return true;
  }

  /**
   * Toggle document sharing with doctors
   */
  static async toggleSharing(documentId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data: current } = await supabase
      .from('patient_documents')
      .select('is_shared_with_doctors')
      .eq('id', documentId)
      .single();

    if (!current) return false;

    const { error } = await supabase
      .from('patient_documents')
      .update({ is_shared_with_doctors: !current.is_shared_with_doctors })
      .eq('id', documentId);

    if (error) {
      console.error('Error toggling sharing:', error);
      return false;
    }

    return true;
  }

  /**
   * Get documents for a specific appointment
   */
  static async getAppointmentDocuments(appointmentId: string): Promise<PatientDocument[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('document_date', { ascending: false });

    if (error) {
      console.error('Error fetching appointment documents:', error);
      return [];
    }

    return data || [];
  }
}

export default PatientDocumentsService;

