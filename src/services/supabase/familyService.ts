/**
 * Family Service
 * Handles family group and member management
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface FamilyGroup {
  id: string;
  name: string;
  name_bn?: string;
  created_by: string;
  primary_contact_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMemberDB {
  id: string;
  family_id: string;
  patient_id?: string; // Linked patient account (if exists)
  name: string;
  name_bn?: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';
  relation_label?: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  blood_group?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  
  // Health Info
  height_cm?: number;
  weight_kg?: number;
  chronic_conditions?: string[];
  allergies?: string[];
  current_medications?: string[];
  
  // Permissions
  can_book: boolean;
  can_view_records: boolean;
  is_admin: boolean;
  
  // Status
  invitation_status: 'pending' | 'accepted' | 'declined';
  invitation_phone?: string;
  invitation_code?: string;
  
  created_at: string;
  updated_at: string;
}

export interface FamilyMemberEnriched extends FamilyMemberDB {
  age?: number;
  healthScore?: number;
  lastCheckup?: string;
  upcomingAppointments?: number;
  medicationsCount?: number;
  bmi?: number;
}

// Relation labels in Bengali
const RELATION_LABELS: Record<string, string> = {
  self: 'নিজে',
  spouse: 'স্বামী/স্ত্রী',
  child: 'সন্তান',
  parent: 'বাবা/মা',
  sibling: 'ভাই/বোন',
  grandparent: 'দাদা/দাদি/নানা/নানি',
  other: 'অন্যান্য',
};

export class FamilyService {
  /**
   * Get or create family group for a patient
   */
  static async getOrCreateFamily(patientId: string, patientName: string): Promise<FamilyGroup | null> {
    if (!isSupabaseConfigured()) return null;

    // Check if patient already has a family
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('family_id, families(*)')
      .eq('patient_id', patientId)
      .eq('relation', 'self')
      .single();

    if (existingMember?.families) {
      return existingMember.families as unknown as FamilyGroup;
    }

    // Create new family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: `${patientName}'s Family`,
        name_bn: `${patientName} এর পরিবার`,
        created_by: patientId,
        primary_contact_id: patientId,
      })
      .select()
      .single();

    if (familyError) {
      console.error('Error creating family:', familyError);
      return null;
    }

    // Add self as first member
    await this.addMember({
      family_id: family.id,
      patient_id: patientId,
      name: patientName,
      relation: 'self',
      can_book: true,
      can_view_records: true,
      is_admin: true,
      gender: 'Male', // Will be updated from patient profile
      invitation_status: 'accepted',
    });

    return family;
  }

  /**
   * Get family group by ID
   */
  static async getFamilyById(familyId: string): Promise<FamilyGroup | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (error) {
      console.error('Error fetching family:', error);
      return null;
    }

    return data;
  }

  /**
   * Get family for a patient (by patient_id)
   */
  static async getPatientFamily(patientId: string): Promise<FamilyGroup | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: member } = await supabase
      .from('family_members')
      .select('family_id, families(*)')
      .eq('patient_id', patientId)
      .single();

    if (!member?.families) return null;
    return member.families as unknown as FamilyGroup;
  }

  /**
   * Get all members of a family
   */
  static async getFamilyMembers(familyId: string): Promise<FamilyMemberEnriched[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('relation', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching family members:', error);
      return [];
    }

    // Enrich with additional data
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        const enriched: FamilyMemberEnriched = {
          ...member,
          relation_label: RELATION_LABELS[member.relation] || member.relation,
        };

        // Calculate age
        if (member.date_of_birth) {
          const birth = new Date(member.date_of_birth);
          const now = new Date();
          enriched.age = now.getFullYear() - birth.getFullYear();
          const monthDiff = now.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            enriched.age--;
          }
        }

        // Calculate BMI
        if (member.height_cm && member.weight_kg) {
          const heightM = member.height_cm / 100;
          enriched.bmi = Math.round((member.weight_kg / (heightM * heightM)) * 10) / 10;
        }

        // Get upcoming appointments count if linked to patient
        if (member.patient_id) {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', member.patient_id)
            .gte('scheduled_date', new Date().toISOString().split('T')[0])
            .neq('status', 'cancelled');
          enriched.upcomingAppointments = count || 0;

          // Get last checkup
          const { data: lastAppt } = await supabase
            .from('appointments')
            .select('scheduled_date')
            .eq('patient_id', member.patient_id)
            .eq('status', 'completed')
            .order('scheduled_date', { ascending: false })
            .limit(1)
            .single();
          enriched.lastCheckup = lastAppt?.scheduled_date;

          // Get medications count
          const { count: medCount } = await supabase
            .from('prescriptions')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', member.patient_id)
            .eq('is_active', true);
          enriched.medicationsCount = medCount || 0;
        }

        return enriched;
      })
    );

    return enrichedMembers;
  }

  /**
   * Add a new family member
   */
  static async addMember(input: {
    family_id: string;
    patient_id?: string;
    name: string;
    name_bn?: string;
    relation: FamilyMemberDB['relation'];
    date_of_birth?: string;
    gender: 'Male' | 'Female';
    blood_group?: string;
    phone?: string;
    can_book?: boolean;
    can_view_records?: boolean;
    is_admin?: boolean;
    invitation_status?: 'pending' | 'accepted' | 'declined';
  }): Promise<FamilyMemberDB | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('family_members')
      .insert({
        ...input,
        relation_label: RELATION_LABELS[input.relation] || input.relation,
        can_book: input.can_book ?? true,
        can_view_records: input.can_view_records ?? true,
        is_admin: input.is_admin ?? false,
        invitation_status: input.invitation_status ?? 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding family member:', error);
      return null;
    }

    return data;
  }

  /**
   * Update a family member
   */
  static async updateMember(
    memberId: string,
    updates: Partial<Omit<FamilyMemberDB, 'id' | 'family_id' | 'created_at'>>
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('family_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating family member:', error);
      return false;
    }

    return true;
  }

  /**
   * Remove a family member
   */
  static async removeMember(memberId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Don't allow removing self
    const { data: member } = await supabase
      .from('family_members')
      .select('relation')
      .eq('id', memberId)
      .single();

    if (member?.relation === 'self') {
      console.error('Cannot remove self from family');
      return false;
    }

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing family member:', error);
      return false;
    }

    return true;
  }

  /**
   * Invite a family member via phone
   */
  static async inviteMember(
    familyId: string,
    phone: string,
    relation: FamilyMemberDB['relation'],
    name: string
  ): Promise<{ invitationCode: string } | null> {
    if (!isSupabaseConfigured()) return null;

    // Generate invitation code
    const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        name,
        relation,
        relation_label: RELATION_LABELS[relation] || relation,
        invitation_phone: phone,
        invitation_code: invitationCode,
        invitation_status: 'pending',
        can_book: true,
        can_view_records: true,
        is_admin: false,
        gender: 'Male', // Will be updated when accepted
      })
      .select()
      .single();

    if (error) {
      console.error('Error inviting family member:', error);
      return null;
    }

    return { invitationCode };
  }

  /**
   * Accept family invitation
   */
  static async acceptInvitation(
    patientId: string,
    invitationCode: string
  ): Promise<FamilyMemberDB | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: invitation } = await supabase
      .from('family_members')
      .select('*')
      .eq('invitation_code', invitationCode)
      .eq('invitation_status', 'pending')
      .single();

    if (!invitation) {
      console.error('Invalid or expired invitation');
      return null;
    }

    // Update the member to link with patient
    const { data, error } = await supabase
      .from('family_members')
      .update({
        patient_id: patientId,
        invitation_status: 'accepted',
        invitation_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .select()
      .single();

    if (error) {
      console.error('Error accepting invitation:', error);
      return null;
    }

    return data;
  }

  /**
   * Get family appointments for all members
   */
  static async getFamilyAppointments(familyId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    // Get all members with patient_id
    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, patient_id')
      .eq('family_id', familyId)
      .not('patient_id', 'is', null);

    if (!members || members.length === 0) return [];

    const patientIds = members.map(m => m.patient_id).filter(Boolean);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors (
          id,
          profile_id,
          specialties,
          profiles (
            name,
            avatar_url
          )
        )
      `)
      .in('patient_id', patientIds)
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching family appointments:', error);
      return [];
    }

    // Enrich with member info
    return (appointments || []).map(apt => {
      const member = members.find(m => m.patient_id === apt.patient_id);
      return {
        ...apt,
        memberName: member?.name || 'Unknown',
        memberId: member?.id,
      };
    });
  }

  /**
   * Get medications for all family members
   */
  static async getFamilyMedications(familyId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, patient_id')
      .eq('family_id', familyId)
      .not('patient_id', 'is', null);

    if (!members || members.length === 0) return [];

    const patientIds = members.map(m => m.patient_id).filter(Boolean);

    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select('*')
      .in('patient_id', patientIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching family medications:', error);
      return [];
    }

    // Flatten medications and add member info
    const medications: any[] = [];
    (prescriptions || []).forEach(p => {
      const member = members.find(m => m.patient_id === p.patient_id);
      (p.medicines as any[] || []).forEach(med => {
        medications.push({
          ...med,
          prescriptionId: p.id,
          memberName: member?.name || 'Unknown',
          memberId: member?.id,
        });
      });
    });

    return medications;
  }

  /**
   * Book appointment for family member
   */
  static async bookForMember(
    memberId: string,
    appointmentData: any
  ): Promise<any | null> {
    if (!isSupabaseConfigured()) return null;

    // Get member details
    const { data: member } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (!member) {
      console.error('Member not found');
      return null;
    }

    // If member has patient_id, book normally
    // If not, book with family_member_id
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        patient_id: member.patient_id || null,
        family_member_id: member.patient_id ? null : memberId,
        family_member_name: member.patient_id ? null : member.name,
        is_family_booking: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error booking for family member:', error);
      return null;
    }

    return data;
  }
}

export default FamilyService;

