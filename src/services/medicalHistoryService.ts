/**
 * Medical History Service
 * Fetches comprehensive medical history for patients
 */

import { supabase, isSupabaseConfigured } from './supabaseAuth';

export interface ConsultationHistory {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  consultationDate: string;
  consultationTime: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis?: string;
  diagnosisBn?: string;
  advice?: string[];
  vitals?: any;
}

export interface PrescriptionHistory {
  id: string;
  consultationId: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  medicineName: string;
  medicineNameBn?: string;
  dosage: string;
  duration: string;
  instruction?: string;
  prescriptionDate: string;
  followUpDate?: string;
}

export interface TestReportHistory {
  id: string;
  consultationId?: string;
  appointmentId?: string;
  doctorId?: string;
  doctorName?: string;
  testName: string;
  testNameBn?: string;
  testType?: string;
  testDate: string;
  fileUrl?: string;
  fileName?: string;
  findings?: string;
  recommendations?: string;
  doctorNotes?: string;
}

export interface CompleteMedicalHistory {
  consultations: ConsultationHistory[];
  prescriptions: PrescriptionHistory[];
  testReports: TestReportHistory[];
  doctors: Array<{
    id: string;
    name: string;
    specialty: string;
    totalConsultations: number;
    lastVisit: string;
  }>;
}

/**
 * Get complete medical history for a patient
 */
export async function getPatientMedicalHistory(patientId: string): Promise<CompleteMedicalHistory | null> {
  if (!isSupabaseConfigured() || !patientId) return null;

  try {
    // First, get all appointment IDs for this patient (check both patient_id and booked_by_id)
    const { data: patientAppointments } = await supabase
      .from('appointments')
      .select('id')
      .or(`patient_id.eq.${patientId},booked_by_id.eq.${patientId}`);

    const appointmentIds = patientAppointments?.map(apt => apt.id) || [];

    // Fetch consultations - check both direct patient_id and via appointments
    let consultationsQuery = supabase
      .from('consultations')
      .select(`
        id,
        appointment_id,
        doctor_id,
        patient_id,
        subjective,
        objective,
        assessment,
        plan,
        diagnosis,
        diagnosis_bn,
        advice,
        vitals,
        consultation_date,
        consultation_time,
        appointments!inner(
          id,
          patient_name,
          scheduled_date,
          scheduled_time
        )
      `)
      .eq('patient_id', patientId);
    
    // Also fetch consultations linked via appointments
    if (appointmentIds.length > 0) {
      const { data: consultationsViaAppointments } = await supabase
        .from('consultations')
        .select(`
          id,
          appointment_id,
          doctor_id,
          patient_id,
          subjective,
          objective,
          assessment,
          plan,
          diagnosis,
          diagnosis_bn,
          advice,
          vitals,
          consultation_date,
          consultation_time,
          appointments!inner(
            id,
            patient_name,
            scheduled_date,
            scheduled_time
          )
        `)
        .in('appointment_id', appointmentIds);
      
      // Combine results
      const { data: directConsultations } = await consultationsQuery;
      const allConsultations = [
        ...(directConsultations || []),
        ...(consultationsViaAppointments || [])
      ];
      
      // Remove duplicates
      const uniqueConsultations = Array.from(
        new Map(allConsultations.map(c => [c.id, c])).values()
      );
      
      var consultations = uniqueConsultations.sort((a, b) => {
        const dateCompare = new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.consultation_time.localeCompare(a.consultation_time);
      });
      
      var consultationsError = null;
    } else {
      const { data, error } = await consultationsQuery
        .order('consultation_date', { ascending: false })
        .order('consultation_time', { ascending: false });
      var consultations = data;
      var consultationsError = error;
    }

    if (consultationsError) {
      console.error('[MedicalHistory] Consultations error:', consultationsError);
    }

    // Fetch prescriptions - check both direct patient_id and via appointments/consultations
    const consultationIds = consultations?.map(c => c.id) || [];
    
    // Fetch prescriptions by patient_id
    const { data: prescriptionsByPatient } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId);
    
    // Fetch prescriptions by appointment_id
    let prescriptionsByAppointment: any[] = [];
    if (appointmentIds.length > 0) {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .in('appointment_id', appointmentIds);
      prescriptionsByAppointment = data || [];
    }
    
    // Fetch prescriptions by consultation_id
    let prescriptionsByConsultation: any[] = [];
    if (consultationIds.length > 0) {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .in('consultation_id', consultationIds);
      prescriptionsByConsultation = data || [];
    }
    
    // Combine and deduplicate
    const allPrescriptions = [
      ...(prescriptionsByPatient || []),
      ...prescriptionsByAppointment,
      ...prescriptionsByConsultation
    ];
    const uniquePrescriptions = Array.from(
      new Map(allPrescriptions.map(p => [p.id, p])).values()
    );
    const prescriptions = uniquePrescriptions.sort((a, b) => 
      new Date(b.prescription_date).getTime() - new Date(a.prescription_date).getTime()
    );
    const prescriptionsError = null;

    if (prescriptionsError) {
      console.error('[MedicalHistory] Prescriptions error:', prescriptionsError);
    }

    // Fetch test reports - check both direct patient_id and via appointments/consultations
    const { data: testReportsByPatient } = await supabase
      .from('test_reports')
      .select('*')
      .eq('patient_id', patientId);
    
    let testReportsByAppointment: any[] = [];
    if (appointmentIds.length > 0) {
      const { data } = await supabase
        .from('test_reports')
        .select('*')
        .in('appointment_id', appointmentIds);
      testReportsByAppointment = data || [];
    }
    
    let testReportsByConsultation: any[] = [];
    if (consultationIds.length > 0) {
      const { data } = await supabase
        .from('test_reports')
        .select('*')
        .in('consultation_id', consultationIds);
      testReportsByConsultation = data || [];
    }
    
    // Combine and deduplicate
    const allTestReports = [
      ...(testReportsByPatient || []),
      ...testReportsByAppointment,
      ...testReportsByConsultation
    ];
    const uniqueTestReports = Array.from(
      new Map(allTestReports.map(tr => [tr.id, tr])).values()
    );
    const testReports = uniqueTestReports.sort((a, b) => 
      new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    );
    const testReportsError = null;

    if (testReportsError) {
      console.error('[MedicalHistory] Test reports error:', testReportsError);
    }

    // Get doctor names for consultations
    const doctorIds = new Set<string>();
    consultations?.forEach(c => c.doctor_id && doctorIds.add(c.doctor_id));
    prescriptions?.forEach(p => p.doctor_id && doctorIds.add(p.doctor_id));
    testReports?.forEach(tr => tr.doctor_id && doctorIds.add(tr.doctor_id));
    
    const doctorMap = new Map<string, { name: string; specialty: string }>();
    if (doctorIds.size > 0) {
      const { data: doctorProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(doctorIds));

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('profile_id, specialties')
        .in('profile_id', Array.from(doctorIds));

      const specialtyMap = new Map(doctorData?.map(d => [d.profile_id, d.specialties]) || []);

      doctorProfiles?.forEach(profile => {
        const specialties = specialtyMap.get(profile.id) || [];
        const specialty = Array.isArray(specialties) && specialties.length > 0 
          ? (typeof specialties[0] === 'string' ? specialties[0] : specialties[0]?.name || 'General')
          : 'General';
        doctorMap.set(profile.id, { name: profile.name, specialty });
      });
    }

    // Transform consultations
    const consultationHistory: ConsultationHistory[] = (consultations || []).map(c => {
      const doctor = doctorMap.get(c.doctor_id) || { name: 'Unknown Doctor', specialty: 'General' };
      return {
        id: c.id,
        appointmentId: c.appointment_id,
        doctorId: c.doctor_id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        consultationDate: c.consultation_date,
        consultationTime: c.consultation_time,
        subjective: c.subjective,
        objective: c.objective,
        assessment: c.assessment,
        plan: c.plan,
        diagnosis: c.diagnosis,
        diagnosisBn: c.diagnosis_bn,
        advice: c.advice || [],
        vitals: c.vitals,
      };
    });

    // Transform prescriptions
    const prescriptionHistory: PrescriptionHistory[] = (prescriptions || []).map(p => {
      const doctor = doctorMap.get(p.doctor_id) || { name: 'Unknown Doctor', specialty: 'General' };
      return {
        id: p.id,
        consultationId: p.consultation_id,
        appointmentId: p.appointment_id,
        doctorId: p.doctor_id,
        doctorName: doctor.name,
        medicineName: p.medicine_name,
        medicineNameBn: p.medicine_name_bn,
        dosage: p.dosage,
        duration: p.duration,
        instruction: p.instruction,
        prescriptionDate: p.prescription_date,
        followUpDate: p.follow_up_date,
      };
    });

    // Transform test reports
    const testReportHistory: TestReportHistory[] = (testReports || []).map(tr => {
      const doctor = doctorMap.get(tr.doctor_id) || { name: 'Unknown Doctor', specialty: 'General' };
      return {
        id: tr.id,
        consultationId: tr.consultation_id,
        appointmentId: tr.appointment_id,
        doctorId: tr.doctor_id,
        doctorName: doctor.name,
        testName: tr.test_name,
        testNameBn: tr.test_name_bn,
        testType: tr.test_type,
        testDate: tr.test_date,
        fileUrl: tr.file_url,
        fileName: tr.file_name,
        findings: tr.findings,
        recommendations: tr.recommendations,
        doctorNotes: tr.doctor_notes,
      };
    });

    // Calculate doctors summary
    const doctorsMap = new Map<string, { name: string; specialty: string; consultations: number; lastVisit: string }>();
    consultationHistory.forEach(c => {
      const existing = doctorsMap.get(c.doctorId);
      if (existing) {
        existing.consultations++;
        if (c.consultationDate > existing.lastVisit) {
          existing.lastVisit = c.consultationDate;
        }
      } else {
        doctorsMap.set(c.doctorId, {
          name: c.doctorName,
          specialty: c.doctorSpecialty,
          consultations: 1,
          lastVisit: c.consultationDate,
        });
      }
    });

    return {
      consultations: consultationHistory,
      prescriptions: prescriptionHistory,
      testReports: testReportHistory,
      doctors: Array.from(doctorsMap.values()),
    };
  } catch (e) {
    console.error('[MedicalHistory] Exception:', e);
    return null;
  }
}

/**
 * Get patient history for a specific doctor (for doctor's view)
 */
export async function getPatientHistoryForDoctor(patientId: string, doctorId?: string): Promise<CompleteMedicalHistory | null> {
  if (!isSupabaseConfigured() || !patientId) return null;

  // Get all history, then filter if needed
  const history = await getPatientMedicalHistory(patientId);
  if (!history) return null;

  // If doctorId provided, filter to show only that doctor's records
  if (doctorId) {
    return {
      consultations: history.consultations.filter(c => c.doctorId === doctorId),
      prescriptions: history.prescriptions.filter(p => p.doctorId === doctorId),
      testReports: history.testReports.filter(tr => tr.doctorId === doctorId),
      doctors: history.doctors.filter(d => d.id === doctorId),
    };
  }

  return history;
}

