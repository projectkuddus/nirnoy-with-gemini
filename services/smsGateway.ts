/**
 * SMS Gateway Service for Nirnoy Health
 * Primary: Twilio (International + Bangladesh)
 * 
 * HOW TO GET TWILIO CREDENTIALS:
 * 1. Go to https://console.twilio.com
 * 2. On the Dashboard, find "Account SID" and "Auth Token"
 * 3. Go to Phone Numbers > Manage > Buy a number (or use trial number)
 * 4. Add credentials to Vercel Environment Variables
 */

// ============ TYPES ============
export interface SMSRequest {
  to: string;
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

// ============ TWILIO CONFIG ============
const TWILIO_CONFIG = {
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
  // Twilio Verify Service (for OTP) - more reliable than SMS
  verifyServiceSid: import.meta.env.VITE_TWILIO_VERIFY_SID || '',
};

// OTP Storage
const OTP_STORAGE_KEY = 'nirnoy_otp_';
const OTP_EXPIRY_MINUTES = 5;

// ============ SMS GATEWAY SERVICE ============
class SMSGatewayService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(TWILIO_CONFIG.accountSid && TWILIO_CONFIG.authToken);
    if (!this.isConfigured) {
      console.log('📱 SMS Gateway: Running in DEMO mode (no Twilio credentials)');
      console.log('   To enable real SMS, add VITE_TWILIO_ACCOUNT_SID and VITE_TWILIO_AUTH_TOKEN');
    } else {
      console.log('📱 SMS Gateway: Twilio configured');
    }
  }

  /**
   * Format Bangladesh phone number to E.164 format
   */
  private formatBDPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('880')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      return '+880' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      return '+880' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
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
   * Send SMS via Twilio
   */
  private async sendViaTwilio(request: SMSRequest): Promise<SMSResponse> {
    if (!this.isConfigured) {
      return this.sendMock(request);
    }

    try {
      const auth = btoa(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`);
      const formattedPhone = this.formatBDPhone(request.to);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: TWILIO_CONFIG.phoneNumber,
            Body: request.message,
          }),
        }
      );

      const data = await response.json();

      if (data.sid) {
        console.log('✅ SMS sent successfully:', data.sid);
        // Track SMS for finance war room
        const smsCount = parseInt(localStorage.getItem('nirnoy_sms_sent_count') || '0');
        localStorage.setItem('nirnoy_sms_sent_count', (smsCount + 1).toString());
        return { success: true, messageId: data.sid };
      }
      
      console.error('❌ Twilio error:', data);
      return { success: false, error: data.message || 'SMS failed' };
    } catch (error: any) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock SMS for development/demo
   */
  private async sendMock(request: SMSRequest): Promise<SMSResponse> {
    const formattedPhone = this.formatBDPhone(request.to);
    console.log('📱 DEMO SMS (not actually sent):');
    console.log('   To:', formattedPhone);
    console.log('   Message:', request.message);
    
    // Show OTP in console for testing
    const otpMatch = request.message.match(/\d{6}/);
    if (otpMatch) {
      console.log('   🔑 OTP Code:', otpMatch[0]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `demo_${Date.now()}` };
  }

  /**
   * Send SMS (unified method)
   */
  async sendSMS(request: SMSRequest): Promise<SMSResponse> {
    return this.sendViaTwilio(request);
  }

  /**
   * Send OTP for verification
   */
  async sendOTP(request: OTPRequest): Promise<{ success: boolean; error?: string; otp?: string }> {
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

    // Create Bengali message
    const messages: Record<string, string> = {
      login: `নির্ণয় লগইন কোড: ${otp}\nএই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।\nকারো সাথে শেয়ার করবেন না।`,
      register: `নির্ণয়ে স্বাগতম!\nআপনার রেজিস্ট্রেশন কোড: ${otp}\nএই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
      reset_password: `পাসওয়ার্ড রিসেট কোড: ${otp}\nএই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
      verify: `ভেরিফিকেশন কোড: ${otp}\nএই কোড ${OTP_EXPIRY_MINUTES} মিনিট বৈধ।`,
    };

    const result = await this.sendSMS({
      to: phone,
      message: messages[request.purpose] || messages.verify,
      type: 'otp',
    });

    // In demo mode, return the OTP for testing
    if (!this.isConfigured) {
      return { ...result, otp };
    }

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
    const message = `নির্ণয় রিমাইন্ডার:\n${doctorName} এর সাথে অ্যাপয়েন্টমেন্ট\n📅 ${date}\n⏰ ${time}\n🔢 সিরিয়াল: ${serial}\n\nসময়মতো উপস্থিত থাকুন।`;
    
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
    const message = `✅ নির্ণয় বুকিং কনফার্ম!\n\n👨‍⚕️ ${doctorName}\n📅 ${date}\n🔢 সিরিয়াল: ${serial}\n💰 ফি: ৳${fee}\n\nধন্যবাদ!`;
    
    return this.sendSMS({ to: phone, message, type: 'notification' });
  }

  /**
   * Check if SMS is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.isConfigured ? 'Twilio' : 'Demo Mode',
      configured: this.isConfigured,
    };
  }
}

export const smsGateway = new SMSGatewayService();
export default smsGateway;
