import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import type { CreateConversationDto, TrackTokenUsageDto } from './ai.service';

/**
 * AI Controller
 * Handles AI conversation tracking and token usage
 */
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/ai/conversations
   * Create a new AI conversation record
   */
  @Post('conversations')
  async createConversation(@Body() data: CreateConversationDto) {
    return this.aiService.createConversation(data);
  }

  /**
   * POST /api/ai/token-usage
   * Track AI token usage
   */
  @Post('token-usage')
  async trackTokenUsage(@Body() data: TrackTokenUsageDto) {
    return this.aiService.trackTokenUsage(data);
  }

  /**
   * GET /api/ai/conversations/:userId
   * Get user's conversation history
   */
  @Get('conversations/:userId')
  async getUserConversations(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getUserConversations(userId, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * GET /api/ai/token-usage/:userId
   * Get user's total token usage
   */
  @Get('token-usage/:userId')
  async getUserTokenUsage(@Param('userId') userId: string) {
    return this.aiService.getUserTokenUsage(userId);
  }

  /**
   * GET /api/ai/usage-stats/:userId
   * Get usage statistics by date range
   */
  @Get('usage-stats/:userId')
  async getUsageStats(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.aiService.getUsageStats(userId, start, end);
  }

  /**
   * PATCH /api/ai/conversations/:id
   * Update existing conversation with new messages
   */
  @Patch('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() data: { messages: any[]; tokensUsed: number },
  ) {
    return this.aiService.updateConversation(id, data.messages, data.tokensUsed);
  }
}
