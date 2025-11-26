import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationPayload {
  type: 'sms' | 'email' | 'push';
  recipient: string; // Phone number for SMS, email for email
  template: NotificationTemplate;
  data: Record<string, string | number>;
  language?: 'bn' | 'en';
}

export type NotificationTemplate = 
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'queue_turn_soon'
  | 'queue_your_turn'
  | 'queue_delay'
  | 'consultation_complete'
  | 'prescription_ready'
  | 'appointment_cancelled'
  | 'doctor_message';

// SMS Templates in both languages
const SMS_TEMPLATES: Record<NotificationTemplate, { bn: string; en: string }> = {
  appointment_confirmed: {
    bn: 'নির্ণয়: আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে। ডাক্তার: {{doctorName}}, তারিখ: {{date}}, সময়: {{time}}, সিরিয়াল: #{{serial}}। চেম্বার: {{chamberName}}',
    en: 'Nirnoy: Appointment confirmed. Doctor: {{doctorName}}, Date: {{date}}, Time: {{time}}, Serial: #{{serial}}. Chamber: {{chamberName}}',
  },
  appointment_reminder_24h: {
    bn: 'নির্ণয়: আগামীকাল আপনার অ্যাপয়েন্টমেন্ট আছে। ডাক্তার: {{doctorName}}, সময়: {{time}}। ঠিকানা: {{address}}',
    en: 'Nirnoy: Reminder - Your appointment is tomorrow. Doctor: {{doctorName}}, Time: {{time}}. Address: {{address}}',
  },
  appointment_reminder_1h: {
    bn: 'নির্ণয়: ১ ঘন্টা পর আপনার অ্যাপয়েন্টমেন্ট। সিরিয়াল #{{serial}}। সময়মতো উপস্থিত থাকুন।',
    en: 'Nirnoy: Your appointment is in 1 hour. Serial #{{serial}}. Please arrive on time.',
  },
  queue_turn_soon: {
    bn: 'নির্ণয়: আর {{patientsAhead}} জন রোগীর পর আপনার পালা। প্রস্তুত থাকুন!',
    en: 'Nirnoy: {{patientsAhead}} patient(s) before your turn. Please be ready!',
  },
  queue_your_turn: {
    bn: 'নির্ণয়: আপনার পালা এসেছে! দয়া করে এখনই ডাক্তারের কক্ষে যান।',
    en: "Nirnoy: It's your turn! Please proceed to the doctor's room now.",
  },
  queue_delay: {
    bn: 'নির্ণয়: ডাক্তার {{delayMinutes}} মিনিট দেরিতে আছেন। অনুগ্রহ করে অপেক্ষা করুন।',
    en: 'Nirnoy: Doctor is running {{delayMinutes}} minutes late. Please wait.',
  },
  consultation_complete: {
    bn: 'নির্ণয়: আপনার পরামর্শ সম্পন্ন হয়েছে। প্রেসক্রিপশন অ্যাপে দেখুন। সুস্থ থাকুন!',
    en: 'Nirnoy: Consultation complete. View prescription in app. Stay healthy!',
  },
  prescription_ready: {
    bn: 'নির্ণয়: {{doctorName}} আপনার প্রেসক্রিপশন পাঠিয়েছেন। অ্যাপে দেখুন বা ডাউনলোড করুন।',
    en: 'Nirnoy: {{doctorName}} sent your prescription. View or download in app.',
  },
  appointment_cancelled: {
    bn: 'নির্ণয়: আপনার অ্যাপয়েন্টমেন্ট ({{date}}, ডাক্তার: {{doctorName}}) বাতিল করা হয়েছে।',
    en: 'Nirnoy: Your appointment ({{date}}, Dr. {{doctorName}}) has been cancelled.',
  },
  doctor_message: {
    bn: 'নির্ণয়: {{doctorName}} থেকে বার্তা: {{message}}',
    en: 'Nirnoy: Message from {{doctorName}}: {{message}}',
  },
};

// Email Templates
const EMAIL_TEMPLATES: Record<NotificationTemplate, { subject: { bn: string; en: string }; body: { bn: string; en: string } }> = {
  appointment_confirmed: {
    subject: {
      bn: '✅ অ্যাপয়েন্টমেন্ট নিশ্চিত - {{doctorName}}',
      en: '✅ Appointment Confirmed - {{doctorName}}',
    },
    body: {
      bn: `
প্রিয় {{patientName}},

আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে।

📋 বিস্তারিত:
• ডাক্তার: {{doctorName}}
• তারিখ: {{date}}
• সময়: {{time}}
• সিরিয়াল নং: #{{serial}}
• চেম্বার: {{chamberName}}
• ঠিকানা: {{address}}
• ফি: ৳{{fee}}

⏰ অ্যাপয়েন্টমেন্টের সময়ের ১৫-২০ মিনিট আগে উপস্থিত থাকুন।

📱 লাইভ কিউ ট্র্যাক করতে নির্ণয় অ্যাপ ব্যবহার করুন।

ধন্যবাদ,
নির্ণয় টিম
      `,
      en: `
Dear {{patientName}},

Your appointment has been successfully booked.

📋 Details:
• Doctor: {{doctorName}}
• Date: {{date}}
• Time: {{time}}
• Serial No: #{{serial}}
• Chamber: {{chamberName}}
• Address: {{address}}
• Fee: ৳{{fee}}

⏰ Please arrive 15-20 minutes before your appointment time.

📱 Use Nirnoy app to track live queue status.

Thank you,
Nirnoy Team
      `,
    },
  },
  appointment_reminder_24h: {
    subject: {
      bn: '⏰ আগামীকাল অ্যাপয়েন্টমেন্ট - {{doctorName}}',
      en: '⏰ Appointment Tomorrow - {{doctorName}}',
    },
    body: {
      bn: `আগামীকাল আপনার অ্যাপয়েন্টমেন্ট। বিস্তারিত অ্যাপে দেখুন।`,
      en: `Your appointment is tomorrow. Check app for details.`,
    },
  },
  appointment_reminder_1h: {
    subject: {
      bn: '🔔 ১ ঘন্টা পর অ্যাপয়েন্টমেন্ট',
      en: '🔔 Appointment in 1 Hour',
    },
    body: {
      bn: `আপনার অ্যাপয়েন্টমেন্ট ১ ঘন্টা পর। সময়মতো উপস্থিত থাকুন।`,
      en: `Your appointment is in 1 hour. Please be on time.`,
    },
  },
  queue_turn_soon: {
    subject: { bn: '⏳ আপনার পালা আসছে', en: '⏳ Your Turn is Coming' },
    body: { bn: 'আর {{patientsAhead}} জন পর আপনার পালা।', en: '{{patientsAhead}} patient(s) before you.' },
  },
  queue_your_turn: {
    subject: { bn: '🔔 আপনার পালা!', en: "🔔 It's Your Turn!" },
    body: { bn: 'ডাক্তারের কক্ষে যান।', en: "Proceed to doctor's room." },
  },
  queue_delay: {
    subject: { bn: '⚠️ দেরি হচ্ছে', en: '⚠️ Delay Notice' },
    body: { bn: '{{delayMinutes}} মিনিট দেরি।', en: '{{delayMinutes}} minutes delay.' },
  },
  consultation_complete: {
    subject: { bn: '✅ পরামর্শ সম্পন্ন', en: '✅ Consultation Complete' },
    body: { bn: 'প্রেসক্রিপশন অ্যাপে দেখুন।', en: 'View prescription in app.' },
  },
  prescription_ready: {
    subject: { bn: '💊 প্রেসক্রিপশন পাঠানো হয়েছে', en: '💊 Prescription Sent' },
    body: { bn: 'অ্যাপে দেখুন বা ডাউনলোড করুন।', en: 'View or download in app.' },
  },
  appointment_cancelled: {
    subject: { bn: '❌ অ্যাপয়েন্টমেন্ট বাতিল', en: '❌ Appointment Cancelled' },
    body: { bn: 'আপনার অ্যাপয়েন্টমেন্ট বাতিল হয়েছে।', en: 'Your appointment has been cancelled.' },
  },
  doctor_message: {
    subject: { bn: '💬 ডাক্তারের বার্তা', en: '💬 Message from Doctor' },
    body: { bn: '{{message}}', en: '{{message}}' },
  },
};

@Injectable()
export class NotificationsService {
  private logger = new Logger('NotificationsService');

  constructor(private prisma: PrismaService) {}

  /**
   * Send notification based on type
   */
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const lang = payload.language || 'bn';
    
    try {
      switch (payload.type) {
        case 'sms':
          return await this.sendSMS(payload.recipient, payload.template, payload.data, lang);
        case 'email':
          return await this.sendEmail(payload.recipient, payload.template, payload.data, lang);
        case 'push':
          return await this.sendPush(payload.recipient, payload.template, payload.data, lang);
        default:
          throw new Error('Invalid notification type');
      }
    } catch (error) {
      this.logger.error(`Failed to send ${payload.type} notification:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via provider (Twilio/Local BD provider)
   */
  private async sendSMS(
    phone: string,
    template: NotificationTemplate,
    data: Record<string, string | number>,
    lang: 'bn' | 'en',
  ): Promise<{ success: boolean; messageId?: string }> {
    const templateStr = SMS_TEMPLATES[template][lang];
    const message = this.interpolate(templateStr, data);

    // For production, integrate with SMS provider:
    // - Bangladesh: SSL Wireless, BulkSMSBD, Infobip
    // - International: Twilio

    this.logger.log(`[SMS] To: ${phone}, Message: ${message.substring(0, 50)}...`);
    
    // Mock SMS sending
    // In production:
    // const result = await this.smsProvider.send({ to: phone, message });
    
    return { success: true, messageId: `sms_${Date.now()}` };
  }

  /**
   * Send Email via provider (SendGrid/SES)
   */
  private async sendEmail(
    email: string,
    template: NotificationTemplate,
    data: Record<string, string | number>,
    lang: 'bn' | 'en',
  ): Promise<{ success: boolean; messageId?: string }> {
    const emailTemplate = EMAIL_TEMPLATES[template];
    const subject = this.interpolate(emailTemplate.subject[lang], data);
    const body = this.interpolate(emailTemplate.body[lang], data);

    this.logger.log(`[EMAIL] To: ${email}, Subject: ${subject}`);
    
    // For production, integrate with email provider:
    // - SendGrid, Amazon SES, Mailgun
    
    // Mock email sending
    // const result = await this.emailProvider.send({ to: email, subject, body });
    
    return { success: true, messageId: `email_${Date.now()}` };
  }

  /**
   * Send Push Notification via Firebase/OneSignal
   */
  private async sendPush(
    userId: string,
    template: NotificationTemplate,
    data: Record<string, string | number>,
    lang: 'bn' | 'en',
  ): Promise<{ success: boolean; messageId?: string }> {
    const templateStr = SMS_TEMPLATES[template][lang]; // Reuse SMS template for push
    const message = this.interpolate(templateStr, data);

    this.logger.log(`[PUSH] To: ${userId}, Message: ${message.substring(0, 50)}...`);
    
    // For production, integrate with push provider:
    // - Firebase Cloud Messaging (FCM)
    // - OneSignal
    
    // Mock push sending
    // const result = await this.pushProvider.send({ userId, message, data });
    
    return { success: true, messageId: `push_${Date.now()}` };
  }

  /**
   * Send appointment confirmation notification
   */
  async sendAppointmentConfirmation(appointmentId: number): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: true,
        chamber: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const data = {
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.nameEn,
      date: appointment.date.toLocaleDateString('bn-BD'),
      time: appointment.startTime,
      serial: appointment.serialNumber || 0,
      chamberName: appointment.chamber.name,
      address: `${appointment.chamber.address}, ${appointment.chamber.area}`,
      fee: appointment.fee || 0,
    };

    // Send SMS
    await this.send({
      type: 'sms',
      recipient: appointment.patient.user.phone,
      template: 'appointment_confirmed',
      data,
      language: 'bn',
    });

    // Send Email if available
    if (appointment.patient.email) {
      await this.send({
        type: 'email',
        recipient: appointment.patient.email,
        template: 'appointment_confirmed',
        data,
        language: 'bn',
      });
    }
  }

  /**
   * Send appointment reminder (scheduled task)
   */
  async sendAppointmentReminder(appointmentId: number, hoursBefore: number): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: true,
        chamber: true,
      },
    });

    if (!appointment) return;

    const template = hoursBefore === 24 ? 'appointment_reminder_24h' : 'appointment_reminder_1h';
    
    const data = {
      doctorName: appointment.doctor.nameEn,
      time: appointment.startTime,
      serial: appointment.serialNumber || 0,
      address: `${appointment.chamber.address}, ${appointment.chamber.area}`,
    };

    await this.send({
      type: 'sms',
      recipient: appointment.patient.user.phone,
      template,
      data,
      language: 'bn',
    });
  }

  /**
   * Send queue update notification
   */
  async sendQueueUpdate(appointmentId: number, patientsAhead: number): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
      },
    });

    if (!appointment) return;

    const template = patientsAhead === 0 ? 'queue_your_turn' : 'queue_turn_soon';
    
    await this.send({
      type: 'sms',
      recipient: appointment.patient.user.phone,
      template,
      data: { patientsAhead },
      language: 'bn',
    });
  }

  /**
   * Send delay notification
   */
  async sendDelayNotification(chamberId: number, delayMinutes: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        chamberId,
        date: { gte: today, lt: tomorrow },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      include: {
        patient: { include: { user: true } },
      },
    });

    for (const apt of appointments) {
      await this.send({
        type: 'sms',
        recipient: apt.patient.user.phone,
        template: 'queue_delay',
        data: { delayMinutes },
        language: 'bn',
      });
    }
  }

  /**
   * Helper: Interpolate template with data
   */
  private interpolate(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] || ''));
  }
}

