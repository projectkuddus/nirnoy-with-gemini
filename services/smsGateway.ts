/**
 * SMS Gateway Service
 * Supports: SSL Wireless, BulkSMS BD, Twilio
 * For OTP verification and notifications
 */

// ============ TYPES ============
export interface SMSRequest {
  to: string; // Phone number with country code
  message: string;
  type?: 'otp' | 'notification' | 'promotional';
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OTPRequest {
  phone: string;
  purpose: 'login' | 'register' | 'reset_password' | 'verify';
}

export interface OTPVerification {
  phone: string;
  otp: string;
}

// ============ CONFIG ============
const SMS_CONFIG = {
  // SSL Wireless (Bangladesh)
  sslWireless: {
    apiUrl: 'https://smsplus.sslwireless.com/api/v3/send-sms',
    apiToken: import.meta.env.VITE_SSL_WIRELESS_API_TOKEN || '',
    sid: import.meta.env.VITE_SSL_WIRELESS_SID || '',
  },
  // BulkSMS BD (Alternative)
  bulksmsBD: {
    apiUrl: 'https://bulksmsbd.net/api/smsapi',
    apiKey: import.meta.env.VITE_BULKSMS_API_KEY || '',
    senderId: import.meta.env.VITE_BULKSMS_SENDER_ID || 'NIRNOY',
  },
  // Twilio (International)
  twilio: {
    accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
    authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
    phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
  },
};

// OTP Storage (in production, use Redis or database)
const OTP_STORAGE_KEY = 'nirnoy_otp_';
const OTP_EXPIRY_MINUTES = 5;

// ============ SMS GATEWAY SERVICE ============
class SMSGatewayService {
  private provider: 'ssl' | 'bulksms' | 'twilio' | 'mock' = 'mock';

  constructor() {
    // Determine which provider to use based on available config
    if (SMS_CONFIG.sslWireless.apiToken) {
      this.provider = 'ssl';
    } else if (SMS_CONFIG.bulksmsBD.apiKey) {
      this.provider = 'bulksms';
    } else if (SMS_CONFIG.twilio.accountSid) {
      this.provider = 'twilio';
    } else {
      this.provider = 'mock';
      console.log('SMS Gateway: Using mock mode (no credentials configured)');
    }
  }

  /**
   * Format Bangladesh phone number
   */
  private formatBDPhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('880')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      return '+880' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      return '+880' + cleaned;
    }
    return '+880' + cleaned;
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS via SSL Wireless
   */
  private async sendViaSSL(request: SMSRequest): Promise<SMSResponse> {
    try {
      const response = await fetch(SMS_CONFIG.sslWireless.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          api_token: SMS_CONFIG.sslWireless.apiToken,
          sid: SMS_CONFIG.sslWireless.sid,
          msisdn: this.formatBDPhone(request.to).replace('+', ''),
          sms: request.message,
          csms_id: `nirnoy_${Date.now()}`,
        }),
      });

      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        return { success: true, messageId: data.smsinfo?.sms_id };
      }
      return { success: false, error: data.message || 'SMS failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via BulkSMS BD
   */
  private async sendViaBulkSMS(request: SMSRequest): Promise<SMSResponse> {
    try {
      const params = new URLSearchParams({
        api_key: SMS_CONFIG.bulksmsBD.apiKey,
        senderid: SMS_CONFIG.bulksmsBD.senderId,
        number: this.formatBDPhone(request.to).replace('+', ''),
        message: request.message,
      });

      const response = await fetch(`${SMS_CONFIG.bulksmsBD.apiUrl}?${params}`);
      const data = await response.json();

      if (data.response_code === 202) {
        return { success: true, messageId: data.message_id };
      }
      return { success: false, error: data.error_message || 'SMS failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(request: SMSRequest): Promise<SMSResponse> {
    try {
      const auth = btoa(`${SMS_CONFIG.twilio.accountSid}:${SMS_CONFIG.twilio.authToken}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${SMS_CONFIG.twilio.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: this.formatBDPhone(request.to),
            From: SMS_CONFIG.twilio.phoneNumber,
            Body: request.message,
          }),
        }
      );

      const data = await response.json();

      if (data.sid) {
        return { success: true, messageId: data.sid };
      }
      return { success: false, error: data.message || 'SMS failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock SMS (for development)
   */
  private async sendMock(request: SMSRequest): Promise<SMSResponse> {
    console.log('📱 Mock SMS:', {
      to: request.to,
      message: request.message,
    });
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  /**
   * Send SMS (unified method)
   */
  async sendSMS(request: SMSRequest): Promise<SMSResponse> {
    switch (this.provider) {
      case 'ssl':
        return this.sendViaSSL(request);
      case 'bulksms':
        return this.sendViaBulkSMS(request);
      case 'twilio':
        return this.sendViaTwilio(request);
      default:
        return this.sendMock(request);
    }
  }

  /**
   * Send OTP for verification
   */
  async sendOTP(request: OTPRequest): Promise<{ success: boolean; error?: string }> {
    const otp = this.generateOTP();
    const phone = this.formatBDPhone(request.phone);
    
    // Store OTP with expiry
    const otpData = {
      otp,
      phone,
      purpose: request.purpose,
      createdAt: Date.now(),
      expiresAt: Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
    };
    localStorage.setItem(`${OTP_STORAGE_KEY}${phone}`, JSON.stringify(otpData));

    // Create message based on purpose
    const messages: Record<string, string> = {
      login: `আপনার নির্ণয় লগইন কোড: ${otp}। এই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ। কারো সাথে শেয়ার করবেন না।`,
      register: `নির্ণয়ে স্বাগতম! আপনার রেজিস্ট্রেশন কোড: ${otp}। এই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
      reset_password: `আপনার পাসওয়ার্ড রিসেট কোড: ${otp}। এই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
      verify: `আপনার ভেরিফিকেশন কোড: ${otp}। এই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
    };

    const result = await this.sendSMS({
      to: phone,
      message: messages[request.purpose] || messages.verify,
      type: 'otp',
    });

    return result;
  }

  /**
   * Verify OTP
   */
  verifyOTP(verification: OTPVerification): { valid: boolean; error?: string } {
    const phone = this.formatBDPhone(verification.phone);
    const stored = localStorage.getItem(`${OTP_STORAGE_KEY}${phone}`);

    if (!stored) {
      return { valid: false, error: 'OTP not found. Please request a new one.' };
    }

    const otpData = JSON.parse(stored);

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      localStorage.removeItem(`${OTP_STORAGE_KEY}${phone}`);
      return { valid: false, error: 'OTP expired. Please request a new one.' };
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      localStorage.removeItem(`${OTP_STORAGE_KEY}${phone}`);
      return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    // Verify OTP
    if (otpData.otp === verification.otp) {
      localStorage.removeItem(`${OTP_STORAGE_KEY}${phone}`);
      return { valid: true };
    }

    // Increment attempts
    otpData.attempts++;
    localStorage.setItem(`${OTP_STORAGE_KEY}${phone}`, JSON.stringify(otpData));
    
    return { valid: false, error: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.` };
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    phone: string,
    doctorName: string,
    date: string,
    time: string,
    serial: number
  ): Promise<SMSResponse> {
    const message = `নির্ণয় রিমাইন্ডার: আপনার ${doctorName} এর সাথে অ্যাপয়েন্টমেন্ট আছে ${date} তারিখে ${time} টায়। সিরিয়াল: ${serial}। সময়মতো উপস্থিত থাকুন।`;
    
    return this.sendSMS({ to: phone, message, type: 'notification' });
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(
    phone: string,
    doctorName: string,
    date: string,
    serial: number,
    fee: number
  ): Promise<SMSResponse> {
    const message = `নির্ণয়: আপনার অ্যাপয়েন্টমেন্ট কনফার্ম হয়েছে!\nডাক্তার: ${doctorName}\nতারিখ: ${date}\nসিরিয়াল: ${serial}\nফি: ৳${fee}\n\nধন্যবাদ!`;
    
    return this.sendSMS({ to: phone, message, type: 'notification' });
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.provider,
      configured: this.provider !== 'mock',
    };
  }
}

export const smsGateway = new SMSGatewayService();
export default smsGateway;
