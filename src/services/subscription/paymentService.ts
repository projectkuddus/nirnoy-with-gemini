/**
 * Payment Gateway Integration Service
 * Supports: bKash, Nagad, SSLCommerz (Card payments)
 */

import { BillingCycle, PaymentMethod } from './types';

// ============ TYPES ============
export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: 'BDT';
  method: PaymentMethod;
  planId: string;
  billingCycle: BillingCycle;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  message: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaymentVerification {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  paidAt?: string;
}

// ============ BKASH CONFIG ============
const BKASH_CONFIG = {
  baseUrl: import.meta.env.VITE_BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  appKey: import.meta.env.VITE_BKASH_APP_KEY || '',
  appSecret: import.meta.env.VITE_BKASH_APP_SECRET || '',
  username: import.meta.env.VITE_BKASH_USERNAME || '',
  password: import.meta.env.VITE_BKASH_PASSWORD || '',
  callbackUrl: import.meta.env.VITE_BKASH_CALLBACK_URL || 'https://nirnoy.ai/api/payment/bkash/callback',
};

// ============ NAGAD CONFIG ============
const NAGAD_CONFIG = {
  baseUrl: import.meta.env.VITE_NAGAD_BASE_URL || 'https://api.sandbox.mynagad.com/api/dfs',
  merchantId: import.meta.env.VITE_NAGAD_MERCHANT_ID || '',
  merchantNumber: import.meta.env.VITE_NAGAD_MERCHANT_NUMBER || '',
  publicKey: import.meta.env.VITE_NAGAD_PUBLIC_KEY || '',
  privateKey: import.meta.env.VITE_NAGAD_PRIVATE_KEY || '',
  callbackUrl: import.meta.env.VITE_NAGAD_CALLBACK_URL || 'https://nirnoy.ai/api/payment/nagad/callback',
};

// ============ SSLCOMMERZ CONFIG ============
const SSLCOMMERZ_CONFIG = {
  storeId: import.meta.env.VITE_SSLCOMMERZ_STORE_ID || '',
  storePassword: import.meta.env.VITE_SSLCOMMERZ_STORE_PASSWORD || '',
  isSandbox: import.meta.env.VITE_SSLCOMMERZ_SANDBOX === 'true',
  successUrl: 'https://nirnoy.ai/api/payment/ssl/success',
  failUrl: 'https://nirnoy.ai/api/payment/ssl/fail',
  cancelUrl: 'https://nirnoy.ai/api/payment/ssl/cancel',
  ipnUrl: 'https://nirnoy.ai/api/payment/ssl/ipn',
};

// ============ PAYMENT SERVICE ============
class PaymentService {
  private bkashToken: string | null = null;
  private bkashTokenExpiry: number = 0;

  // ============ BKASH METHODS ============
  
  /**
   * Get bKash access token
   */
  private async getBkashToken(): Promise<string> {
    if (this.bkashToken && Date.now() < this.bkashTokenExpiry) {
      return this.bkashToken;
    }

    try {
      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': BKASH_CONFIG.username,
          'password': BKASH_CONFIG.password,
        },
        body: JSON.stringify({
          app_key: BKASH_CONFIG.appKey,
          app_secret: BKASH_CONFIG.appSecret,
        }),
      });

      const data = await response.json();
      if (data.id_token) {
        this.bkashToken = data.id_token;
        this.bkashTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
        return data.id_token;
      }
      throw new Error('Failed to get bKash token');
    } catch (error) {
      console.error('bKash token error:', error);
      throw error;
    }
  }

  /**
   * Create bKash payment
   */
  async createBkashPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getBkashToken();
      const paymentId = `NIRNOY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'X-APP-Key': BKASH_CONFIG.appKey,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: request.customerPhone,
          callbackURL: BKASH_CONFIG.callbackUrl,
          amount: request.amount.toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: paymentId,
        }),
      });

      const data = await response.json();
      
      if (data.bkashURL) {
        // Store pending payment
        this.storePendingPayment(paymentId, request, 'bkash');
        
        return {
          success: true,
          transactionId: paymentId,
          paymentUrl: data.bkashURL,
          message: 'Redirecting to bKash...',
          status: 'pending',
        };
      }

      return {
        success: false,
        message: data.errorMessage || 'bKash payment creation failed',
        status: 'failed',
      };
    } catch (error) {
      console.error('bKash payment error:', error);
      return {
        success: false,
        message: 'bKash payment failed. Please try again.',
        status: 'failed',
      };
    }
  }

  /**
   * Execute bKash payment after callback
   */
  async executeBkashPayment(paymentID: string): Promise<PaymentVerification> {
    try {
      const token = await this.getBkashToken();

      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'X-APP-Key': BKASH_CONFIG.appKey,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data = await response.json();

      if (data.statusCode === '0000') {
        return {
          transactionId: data.trxID,
          status: 'success',
          amount: parseFloat(data.amount),
          paidAt: new Date().toISOString(),
        };
      }

      return {
        transactionId: paymentID,
        status: 'failed',
        amount: 0,
      };
    } catch (error) {
      console.error('bKash execute error:', error);
      return {
        transactionId: paymentID,
        status: 'failed',
        amount: 0,
      };
    }
  }

  // ============ NAGAD METHODS ============

  /**
   * Create Nagad payment
   */
  async createNagadPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const orderId = `NIRNOY_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // In production, this would involve proper encryption and API calls
      // For now, we'll simulate the flow
      const paymentUrl = `${NAGAD_CONFIG.baseUrl}/checkout/initialize/${NAGAD_CONFIG.merchantId}/${orderId}`;

      this.storePendingPayment(orderId, request, 'nagad');

      return {
        success: true,
        transactionId: orderId,
        paymentUrl: paymentUrl,
        message: 'Redirecting to Nagad...',
        status: 'pending',
      };
    } catch (error) {
      console.error('Nagad payment error:', error);
      return {
        success: false,
        message: 'Nagad payment failed. Please try again.',
        status: 'failed',
      };
    }
  }

  // ============ SSLCOMMERZ METHODS ============

  /**
   * Create SSLCommerz payment (Card/Bank)
   */
  async createSSLCommerzPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const transactionId = `NIRNOY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const baseUrl = SSLCOMMERZ_CONFIG.isSandbox 
        ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

      const formData = new URLSearchParams({
        store_id: SSLCOMMERZ_CONFIG.storeId,
        store_passwd: SSLCOMMERZ_CONFIG.storePassword,
        total_amount: request.amount.toString(),
        currency: 'BDT',
        tran_id: transactionId,
        success_url: SSLCOMMERZ_CONFIG.successUrl,
        fail_url: SSLCOMMERZ_CONFIG.failUrl,
        cancel_url: SSLCOMMERZ_CONFIG.cancelUrl,
        ipn_url: SSLCOMMERZ_CONFIG.ipnUrl,
        cus_name: request.customerName,
        cus_email: request.customerEmail || 'customer@nirnoy.ai',
        cus_phone: request.customerPhone,
        cus_add1: 'Dhaka, Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        shipping_method: 'NO',
        product_name: `Nirnoy ${request.planId} Plan`,
        product_category: 'Healthcare',
        product_profile: 'non-physical-goods',
      });

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'SUCCESS') {
        this.storePendingPayment(transactionId, request, 'card');
        
        return {
          success: true,
          transactionId: transactionId,
          paymentUrl: data.GatewayPageURL,
          message: 'Redirecting to payment gateway...',
          status: 'pending',
        };
      }

      return {
        success: false,
        message: data.failedreason || 'Payment initialization failed',
        status: 'failed',
      };
    } catch (error) {
      console.error('SSLCommerz error:', error);
      return {
        success: false,
        message: 'Payment failed. Please try again.',
        status: 'failed',
      };
    }
  }

  // ============ UNIFIED PAYMENT METHOD ============

  /**
   * Create payment based on method
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    switch (request.method) {
      case 'bkash':
        return this.createBkashPayment(request);
      case 'nagad':
        return this.createNagadPayment(request);
      case 'card':
        return this.createSSLCommerzPayment(request);
      default:
        return {
          success: false,
          message: 'Invalid payment method',
          status: 'failed',
        };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string, method: PaymentMethod): Promise<PaymentVerification> {
    // In production, this would call the respective payment gateway's verification API
    const pending = this.getPendingPayment(transactionId);
    
    if (!pending) {
      return {
        transactionId,
        status: 'failed',
        amount: 0,
      };
    }

    // For demo, simulate successful payment
    return {
      transactionId,
      status: 'success',
      amount: pending.amount,
      paidAt: new Date().toISOString(),
    };
  }

  // ============ LOCAL STORAGE HELPERS ============

  private storePendingPayment(id: string, request: PaymentRequest, method: string): void {
    const pending = {
      ...request,
      method,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`payment_pending_${id}`, JSON.stringify(pending));
  }

  private getPendingPayment(id: string): PaymentRequest | null {
    const stored = localStorage.getItem(`payment_pending_${id}`);
    return stored ? JSON.parse(stored) : null;
  }

  private clearPendingPayment(id: string): void {
    localStorage.removeItem(`payment_pending_${id}`);
  }

  // ============ PAYMENT HISTORY ============

  getPaymentHistory(userId: string): any[] {
    const stored = localStorage.getItem(`payment_history_${userId}`);
    return stored ? JSON.parse(stored) : [];
  }

  addPaymentToHistory(userId: string, payment: any): void {
    const history = this.getPaymentHistory(userId);
    history.unshift(payment);
    localStorage.setItem(`payment_history_${userId}`, JSON.stringify(history.slice(0, 50)));
  }
}

export const paymentService = new PaymentService();
export default paymentService;
