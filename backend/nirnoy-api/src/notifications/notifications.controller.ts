import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-sms')
  @UseGuards(JwtAuthGuard)
  async testSMS(@Body() body: { phone: string; message: string }) {
    // For testing purposes only - should be admin only in production
    return { success: true, message: 'SMS would be sent to ' + body.phone };
  }

  @Post('appointment/:id/confirm')
  @UseGuards(JwtAuthGuard)
  async sendAppointmentConfirmation(@Body() body: { appointmentId: number }) {
    await this.notificationsService.sendAppointmentConfirmation(body.appointmentId);
    return { success: true };
  }

  @Post('queue/delay')
  @UseGuards(JwtAuthGuard)
  async sendDelayNotification(@Body() body: { chamberId: number; delayMinutes: number }) {
    await this.notificationsService.sendDelayNotification(body.chamberId, body.delayMinutes);
    return { success: true };
  }
}

