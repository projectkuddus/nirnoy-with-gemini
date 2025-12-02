/**
 * Nirnoy Care API Service
 * Connects frontend to NestJS backend
 * 
 * Production-ready: Uses environment variables for API URL
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Store JWT token
let authToken: string | null = localStorage.getItem('nirnoy_token');

// Helper to make authenticated requests
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== AUTH ====================

export interface AuthUser {
  id: number;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  doctorId?: number;
  patientId?: number;
  name: string;
  isProfileComplete: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authAPI = {
  requestOTP: async (phone: string, role: 'PATIENT' | 'DOCTOR') => {
    return fetchAPI<{ success: boolean; message: string; devOtp?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    });
  },

  verifyOTP: async (phone: string, otp: string): Promise<LoginResponse> => {
    const response = await fetchAPI<LoginResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });

    // Store token
    authToken = response.accessToken;
    localStorage.setItem('nirnoy_token', authToken);

    return response;
  },

  getMe: async (): Promise<AuthUser> => {
    return fetchAPI<AuthUser>('/auth/me');
  },

  logout: () => {
    authToken = null;
    localStorage.removeItem('nirnoy_token');
    localStorage.removeItem('nirnoy_role');
  },

  isAuthenticated: () => !!authToken,
};

// ==================== DOCTORS ====================

export interface Clinic {
  id: number;
  name: string;
  area: string;
  city: string;
  address: string;
  schedule: {
    daysOfWeek: string;
    startTime: string;
    endTime: string;
    slotMinutes: number;
  };
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  gender: string;
  degrees: string | null;
  fee: number;
  experienceYears: number | null;
  phone: string;
  clinics: Clinic[];
}

export interface DoctorFilters {
  specialty?: string;
  area?: string;
  hospital?: string;
  gender?: string;
  minFee?: number;
  maxFee?: number;
  minExperience?: number;
  search?: string;
}

export const doctorsAPI = {
  getAll: async (filters: DoctorFilters = {}): Promise<Doctor[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const query = params.toString() ? `?${params}` : '';
    return fetchAPI<Doctor[]>(`/doctors${query}`);
  },

  getOne: async (id: number): Promise<Doctor> => {
    return fetchAPI<Doctor>(`/doctors/${id}`);
  },

  getSpecialties: async (): Promise<string[]> => {
    return fetchAPI<string[]>('/doctors/filters/specialties');
  },

  getAreas: async (): Promise<string[]> => {
    return fetchAPI<string[]>('/doctors/filters/areas');
  },

  getHospitals: async (): Promise<{ id: number; name: string; area: string }[]> => {
    return fetchAPI('/doctors/filters/hospitals');
  },

  getMyProfile: async (): Promise<Doctor> => {
    return fetchAPI<Doctor>('/doctors/me/profile');
  },

  updateMyProfile: async (data: Partial<Doctor>): Promise<Doctor> => {
    return fetchAPI<Doctor>('/doctors/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ==================== APPOINTMENTS ====================

export type VisitType = 'NEW' | 'FOLLOW_UP' | 'REPORT_CHECK';
export type ConsultationType = 'CHAMBER' | 'ONLINE';

export interface Appointment {
  id: number;
  date: string;
  startTime: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  visitType: VisitType;
  consultationType: ConsultationType;
  serialNumber: number;
  patientName?: string;
  patientPhone?: string;
  symptoms?: string;
  fee: number;
  createdAt: string;
  doctor?: {
    id: number;
    name: string;
    specialty: string;
    fee: number;
  };
  patient?: {
    id: number;
    name: string;
  };
  clinic?: {
    id: number;
    name: string;
    area: string;
    address: string;
  };
}

export interface PatientHistory {
  isReturningPatient: boolean;
  totalVisits: number;
  lastVisitDate?: string;
  suggestedVisitType: VisitType;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailableSlots {
  date: string;
  doctorId: number;
  clinicId: number;
  schedule: {
    startTime: string;
    endTime: string;
    slotMinutes: number;
  };
  slots: TimeSlot[];
}

export const appointmentsAPI = {
  create: async (data: {
    doctorId: number;
    clinicId: number;
    date: string;
    startTime: string;
    visitType: VisitType;
    consultationType?: ConsultationType;
    patientName?: string;
    patientPhone?: string;
    symptoms?: string;
  }): Promise<Appointment> => {
    return fetchAPI<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Check patient history with a doctor
  getPatientHistory: async (doctorId: number): Promise<PatientHistory> => {
    return fetchAPI<PatientHistory>(`/appointments/history/${doctorId}`);
  },

  getMyAppointments: async (status?: string): Promise<Appointment[]> => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI<Appointment[]>(`/appointments/my${query}`);
  },

  getDoctorAppointments: async (date?: string, status?: string): Promise<Appointment[]> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params}` : '';
    return fetchAPI<Appointment[]>(`/appointments/doctor${query}`);
  },

  getTodayQueue: async (clinicId: number): Promise<{
    total: number;
    current: number;
    queue: { serial: number; patientName: string; time: string; status: string }[];
  }> => {
    return fetchAPI(`/appointments/doctor/queue/${clinicId}`);
  },

  updateStatus: async (id: number, status: string): Promise<Appointment> => {
    return fetchAPI<Appointment>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  cancel: async (id: number): Promise<Appointment> => {
    return fetchAPI<Appointment>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  getAvailableSlots: async (
    doctorId: number,
    clinicId: number,
    date: string
  ): Promise<AvailableSlots> => {
    return fetchAPI<AvailableSlots>(`/appointments/slots/${doctorId}/${clinicId}?date=${date}`);
  },
};

// ==================== AI SERVICES ====================

export interface AiConversation {
  id: number;
  userId: number;
  userRole: string;
  conversationType: string;
  messages: any[];
  tokensUsed: number;
  sessionId?: string;
  context?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiTokenUsage {
  id: number;
  userId: number;
  userRole: string;
  tokensUsed: number;
  requestType: string;
  model: string;
  estimatedCostUsd: number;
  createdAt: string;
}

export interface AiUsageStats {
  requestType: string;
  totalTokens: number;
  totalCost: number;
  count: number;
}

export interface UserTokenUsageSummary {
  totalTokens: number;
  totalCost: number;
  conversationCount: number;
}

export const aiAPI = {
  /**
   * Save AI conversation to database
   */
  createConversation: async (data: {
    userId: number;
    userRole: string;
    conversationType: string;
    messages: any[];
    tokensUsed?: number;
    sessionId?: string;
    context?: string;
  }): Promise<AiConversation> => {
    return fetchAPI<AiConversation>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Track AI token usage
   */
  trackTokenUsage: async (data: {
    userId: number;
    userRole: string;
    tokensUsed: number;
    requestType: string;
    model?: string;
    estimatedCostUsd?: number;
  }): Promise<AiTokenUsage> => {
    return fetchAPI<AiTokenUsage>('/ai/token-usage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get user's conversation history
   */
  getUserConversations: async (userId: number, limit = 10): Promise<AiConversation[]> => {
    return fetchAPI<AiConversation[]>(`/ai/conversations/${userId}?limit=${limit}`);
  },

  /**
   * Get user's total token usage
   */
  getUserTokenUsage: async (userId: number): Promise<UserTokenUsageSummary> => {
    return fetchAPI<UserTokenUsageSummary>(`/ai/token-usage/${userId}`);
  },

  /**
   * Get usage statistics by date range
   */
  getUsageStats: async (
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<AiUsageStats[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params}` : '';
    return fetchAPI<AiUsageStats[]>(`/ai/usage-stats/${userId}${query}`);
  },

  /**
   * Update existing conversation with new messages
   */
  updateConversation: async (
    conversationId: number,
    messages: any[],
    tokensUsed: number
  ): Promise<AiConversation> => {
    return fetchAPI<AiConversation>(`/ai/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ messages, tokensUsed }),
    });
  },
};

// Export all APIs
export const api = {
  auth: authAPI,
  doctors: doctorsAPI,
  appointments: appointmentsAPI,
  ai: aiAPI,
};

export default api;

