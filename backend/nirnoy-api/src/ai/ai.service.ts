import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface CreateConversationDto {
  userId: string;
  userRole: string;
  conversationType: string;
  messages: any[];
  tokensUsed?: number;
  sessionId?: string;
  context?: any;
}

export interface TrackTokenUsageDto {
  userId: string;
  userRole: string;
  tokensUsed: number;
  requestType: string;
  model?: string;
  estimatedCostUsd?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Save AI conversation to database
   */
  async createConversation(data: CreateConversationDto) {
    try {
      const { data: conversation, error } = await this.supabase.admin
        .from('ai_conversations')
        .insert({
          user_id: data.userId || null,
          conversation_type: data.conversationType,
          messages: data.messages,
          context: data.context,
          is_anonymous: !data.userId,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating conversation: ${error.message}`);
        throw error;
      }

      this.logger.log(`Conversation created: ${conversation.id} for user ${data.userId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Error creating conversation', error);
      throw error;
    }
  }

  /**
   * Track AI token usage - stores in memory for now
   * TODO: Create ai_token_usage table in Supabase if needed
   */
  async trackTokenUsage(data: TrackTokenUsageDto) {
    try {
      // For now, just log token usage
      // In production, you'd store this in a separate table
      this.logger.log(`Token usage: ${data.tokensUsed} tokens for user ${data.userId} (${data.requestType})`);
      
      return {
        userId: data.userId,
        tokensUsed: data.tokensUsed,
        requestType: data.requestType,
        model: data.model || 'gemini-3-pro-preview',
        estimatedCostUsd: data.estimatedCostUsd || 0,
        trackedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error tracking token usage', error);
      throw error;
    }
  }

  /**
   * Get user's AI conversation history
   */
  async getUserConversations(userId: string, limit = 10) {
    try {
      const { data: conversations, error } = await this.supabase.admin
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error(`Error fetching conversations: ${error.message}`);
        throw error;
      }

      return conversations;
    } catch (error) {
      this.logger.error('Error fetching conversations', error);
      throw error;
    }
  }

  /**
   * Get user's total AI token usage
   * Note: This would require a token_usage table - returning mock for now
   */
  async getUserTokenUsage(userId: string) {
    try {
      // Count conversations as a proxy for usage
      const { count, error } = await this.supabase.admin
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return {
        totalTokens: (count || 0) * 500, // Estimate ~500 tokens per conversation
        totalCost: 0,
        conversationCount: count || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching token usage', error);
      throw error;
    }
  }

  /**
   * Get AI usage statistics by date range
   */
  async getUsageStats(userId: string, startDate: Date, endDate: Date) {
    try {
      const { data: conversations, error } = await this.supabase.admin
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      // Group by conversation type
      const statsByType: Record<string, { count: number; estimatedTokens: number }> = {};
      
      for (const conv of conversations || []) {
        const type = conv.conversation_type || 'unknown';
        if (!statsByType[type]) {
          statsByType[type] = { count: 0, estimatedTokens: 0 };
        }
        statsByType[type].count++;
        statsByType[type].estimatedTokens += 500; // Estimate
      }

      return Object.entries(statsByType).map(([requestType, stats]) => ({
        requestType,
        totalTokens: stats.estimatedTokens,
        totalCost: 0,
        count: stats.count,
      }));
    } catch (error) {
      this.logger.error('Error fetching usage stats', error);
      throw error;
    }
  }

  /**
   * Update conversation with additional messages
   */
  async updateConversation(conversationId: string, newMessages: any[], additionalTokens: number) {
    try {
      // Get existing conversation
      const { data: conversation, error: fetchError } = await this.supabase.admin
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError || !conversation) {
        throw new Error('Conversation not found');
      }

      const existingMessages = conversation.messages || [];
      const updatedMessages = [...existingMessages, ...newMessages];

      const { data: updated, error: updateError } = await this.supabase.admin
        .from('ai_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return updated;
    } catch (error) {
      this.logger.error('Error updating conversation', error);
      throw error;
    }
  }

  /**
   * Delete old conversations (for data retention policy)
   */
  async cleanupOldConversations(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error, count } = await this.supabase.admin
        .from('ai_conversations')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      this.logger.log(`Cleaned up ${count || 0} old conversations`);
      return { count: count || 0 };
    } catch (error) {
      this.logger.error('Error cleaning up conversations', error);
      throw error;
    }
  }
}
