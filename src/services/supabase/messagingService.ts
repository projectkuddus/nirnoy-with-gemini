import { supabase } from '../supabaseAuth';

// ============ TYPES ============
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'patient' | 'doctor';
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'prescription' | 'appointment';
  attachments?: Attachment[];
  created_at: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  size: number;
}

export interface Conversation {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'blocked';
  last_message_id?: string;
  unread_count_patient: number;
  unread_count_doctor: number;
  // Joined data
  doctor?: {
    id: string;
    name: string;
    specialties?: string[];
    photo_url?: string;
  };
  patient?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  last_message?: Message;
}

// ============ SERVICE ============
export const MessagingService = {
  // Create a new conversation
  async createConversation(patientId: string, doctorId: string): Promise<Conversation | null> {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .single();

    if (existing) {
      return existing as Conversation;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        status: 'active',
        unread_count_patient: 0,
        unread_count_doctor: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return data as Conversation;
  },

  // Get all conversations for a patient
  async getPatientConversations(patientId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        doctor:doctors(
          id,
          profiles(name, photo_url),
          specialties
        ),
        last_message:messages(*)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting patient conversations:', error);
      return [];
    }

    return (data || []).map(c => ({
      ...c,
      doctor: c.doctor ? {
        id: c.doctor.id,
        name: c.doctor.profiles?.name,
        specialties: c.doctor.specialties,
        photo_url: c.doctor.profiles?.photo_url,
      } : undefined,
      last_message: c.last_message?.[0],
    }));
  },

  // Get all conversations for a doctor
  async getDoctorConversations(doctorId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        patient:profiles!patient_id(id, name, photo_url),
        last_message:messages(*)
      `)
      .eq('doctor_id', doctorId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting doctor conversations:', error);
      return [];
    }

    return (data || []).map(c => ({
      ...c,
      last_message: c.last_message?.[0],
    }));
  },

  // Get messages for a conversation
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }

    return data || [];
  },

  // Send a message
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderType: 'patient' | 'doctor',
    senderName: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'prescription' | 'appointment' = 'text',
    attachments?: Attachment[],
    metadata?: Record<string, any>
  ): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        sender_name: senderName,
        content,
        message_type: messageType,
        attachments: attachments || [],
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    // Update conversation
    const unreadField = senderType === 'patient' ? 'unread_count_doctor' : 'unread_count_patient';
    await supabase
      .from('conversations')
      .update({
        last_message_id: data.id,
        updated_at: new Date().toISOString(),
        [unreadField]: supabase.rpc('increment', { row_id: conversationId, field: unreadField }),
      })
      .eq('id', conversationId);

    return data as Message;
  },

  // Mark message as read
  async markAsRead(messageId: string): Promise<void> {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
  },

  // Mark all messages in conversation as read
  async markConversationAsRead(conversationId: string, userId: string, userType: 'patient' | 'doctor'): Promise<void> {
    // Mark all unread messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    // Reset unread count
    const unreadField = userType === 'patient' ? 'unread_count_patient' : 'unread_count_doctor';
    await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);
  },

  // Archive conversation
  async archiveConversation(conversationId: string): Promise<void> {
    await supabase
      .from('conversations')
      .update({ status: 'archived' })
      .eq('id', conversationId);
  },

  // Upload attachment
  async uploadAttachment(file: File, conversationId: string): Promise<Attachment | null> {
    const fileName = `${conversationId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading attachment:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(fileName);

    return {
      id: data.path,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type === 'application/pdf' ? 'pdf' : 'document',
      url: urlData.publicUrl,
      size: file.size,
    };
  },

  // Subscribe to new messages in a conversation
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();
  },

  // Unsubscribe from conversation
  async unsubscribeFromConversation(conversationId: string) {
    await supabase.removeChannel(
      supabase.channel(`messages:${conversationId}`)
    );
  },
};

export default MessagingService;

