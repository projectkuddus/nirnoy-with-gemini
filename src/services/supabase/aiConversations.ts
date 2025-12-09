import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Conversation = Database['public']['Tables']['ai_conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['ai_conversations']['Insert'];
type ConversationUpdate = Database['public']['Tables']['ai_conversations']['Update'];

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class AIConversationService {
  /**
   * Create new conversation
   */
  static async create(
    userId: string,
    conversationType: Conversation['conversation_type'],
    context?: Record<string, any>
  ): Promise<Conversation | null> {
    const conversation: ConversationInsert = {
      user_id: userId,
      conversation_type: conversationType,
      context: context || null,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return data;
  }

  /**
   * Get conversation by ID
   */
  static async getById(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data;
  }

  /**
   * Get user conversations
   */
  static async getByUser(
    userId: string,
    conversationType?: Conversation['conversation_type'],
    limit = 50
  ) {
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (conversationType) {
      query = query.eq('conversation_type', conversationType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data;
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<Conversation | null> {
    // Get current conversation
    const conversation = await this.getById(conversationId);
    if (!conversation) return null;

    // Add new message
    const messages = (conversation.messages as ChatMessage[]) || [];
    messages.push(message);

    const update: ConversationUpdate = {
      messages: messages as any,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ai_conversations')
      .update(update)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }

    return data;
  }

  /**
   * Update conversation summary and insights
   */
  static async updateInsights(
    conversationId: string,
    summary: string,
    insights: Record<string, any>
  ): Promise<Conversation | null> {
    const update: ConversationUpdate = {
      summary,
      insights: insights as any,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ai_conversations')
      .update(update)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating insights:', error);
      return null;
    }

    return data;
  }

  /**
   * Subscribe to conversation updates (real-time)
   */
  static subscribeToConversation(
    conversationId: string,
    callback: (conversation: Conversation) => void
  ) {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as Conversation);
        }
      )
      .subscribe();
  }
}

