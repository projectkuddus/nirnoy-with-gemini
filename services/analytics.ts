/**
 * Google Analytics & Event Tracking Service
 * Advanced tracking for healthcare app
 */

// ============ TYPES ============
interface GAEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

interface PageViewData {
  page_title: string;
  page_path: string;
  page_location?: string;
}

interface UserProperties {
  user_id?: string;
  user_type?: 'patient' | 'doctor' | 'admin' | 'guest';
  subscription_plan?: string;
  language?: string;
  credits_balance?: number;
}

// ============ GA4 CONFIG ============
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// ============ ANALYTICS SERVICE ============
class AnalyticsService {
  private initialized = false;
  private userId: string | null = null;

  /**
   * Initialize Google Analytics
   */
  init(): void {
    if (this.initialized || !GA_MEASUREMENT_ID) {
      console.log('Analytics: Skipped (no measurement ID or already initialized)');
      return;
    }

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll send manually for SPA
      cookie_flags: 'SameSite=None;Secure',
      anonymize_ip: true,
    });

    this.initialized = true;
    console.log('Analytics: Initialized with', GA_MEASUREMENT_ID);
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
    if (userId && this.initialized) {
      this.gtag('config', GA_MEASUREMENT_ID, { user_id: userId });
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.initialized) return;
    this.gtag('set', 'user_properties', properties);
  }

  /**
   * Track page view (for SPA)
   */
  pageView(data: PageViewData): void {
    if (!this.initialized) return;
    this.gtag('event', 'page_view', {
      page_title: data.page_title,
      page_path: data.page_path,
      page_location: data.page_location || window.location.href,
    });
  }

  /**
   * Track custom event
   */
  event(event: GAEvent): void {
    if (!this.initialized) return;
    this.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.custom_parameters,
    });
  }

  /**
   * Helper for gtag calls
   */
  private gtag(...args: any[]): void {
    if ((window as any).gtag) {
      (window as any).gtag(...args);
    }
  }

  // ============ HEALTHCARE-SPECIFIC EVENTS ============

  /**
   * Track doctor search
   */
  trackDoctorSearch(query: string, specialty?: string, resultsCount?: number): void {
    this.event({
      action: 'doctor_search',
      category: 'Search',
      label: specialty || query,
      value: resultsCount,
      custom_parameters: { search_query: query, specialty },
    });
  }

  /**
   * Track appointment booking
   */
  trackAppointmentBooked(doctorId: string, specialty: string, fee: number): void {
    this.event({
      action: 'appointment_booked',
      category: 'Booking',
      label: specialty,
      value: fee,
      custom_parameters: { doctor_id: doctorId },
    });
  }

  /**
   * Track AI voice agent usage
   */
  trackVoiceAgentUsed(agentType: 'male' | 'female', duration: number): void {
    this.event({
      action: 'voice_agent_used',
      category: 'AI',
      label: agentType,
      value: Math.round(duration / 1000), // seconds
    });
  }

  /**
   * Track subscription purchase
   */
  trackSubscription(planId: string, price: number, billingCycle: string): void {
    this.event({
      action: 'purchase',
      category: 'Subscription',
      label: planId,
      value: price,
      custom_parameters: { billing_cycle: billingCycle },
    });

    // Also track as ecommerce
    this.gtag('event', 'purchase', {
      transaction_id: `sub_${Date.now()}`,
      value: price,
      currency: 'BDT',
      items: [{
        item_id: planId,
        item_name: `${planId} Plan`,
        category: 'Subscription',
        price: price,
        quantity: 1,
      }],
    });
  }

  /**
   * Track user registration
   */
  trackSignUp(method: string, userType: 'patient' | 'doctor'): void {
    this.event({
      action: 'sign_up',
      category: 'User',
      label: userType,
      custom_parameters: { method },
    });
  }

  /**
   * Track login
   */
  trackLogin(method: string): void {
    this.event({
      action: 'login',
      category: 'User',
      label: method,
    });
  }

  /**
   * Track credit earned
   */
  trackCreditEarned(actionType: string, amount: number): void {
    this.event({
      action: 'credit_earned',
      category: 'Gamification',
      label: actionType,
      value: amount,
    });
  }

  /**
   * Track feedback submitted
   */
  trackFeedback(type: string, rating?: number): void {
    this.event({
      action: 'feedback_submitted',
      category: 'Feedback',
      label: type,
      value: rating,
    });
  }

  /**
   * Track error
   */
  trackError(errorType: string, errorMessage: string): void {
    this.event({
      action: 'error',
      category: 'Error',
      label: errorType,
      custom_parameters: { error_message: errorMessage },
    });
  }
}

export const analytics = new AnalyticsService();
export default analytics;
