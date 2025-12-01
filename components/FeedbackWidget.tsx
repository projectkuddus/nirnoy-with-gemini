import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../services/supabaseAuth';

// ============ TYPES ============
type FeedbackType = 'bug' | 'feature' | 'general' | 'doctor' | 'complaint';
type FeedbackMood = 'happy' | 'neutral' | 'sad';

export interface FeedbackData {
  id: string;
  type: FeedbackType;
  mood: FeedbackMood;
  message: string;
  page: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  status: 'new' | 'reviewed' | 'resolved';
  adminReply?: string;
  adminRepliedAt?: string;
}

// ============ FEEDBACK STORAGE - SUPABASE ============

// Get all feedbacks from Supabase (for admin)
export async function getFeedbacksAsync(): Promise<FeedbackData[]> {
  console.log('[Feedback] Loading all feedbacks...');
  
  if (!isSupabaseConfigured()) {
    console.error('[Feedback] Supabase not configured!');
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('[Feedback] Load error:', error.message, error.details);
      return [];
    }
    
    console.log('[Feedback] ✅ Loaded', data?.length || 0, 'feedbacks');
    
    return (data || []).map(fb => ({
      id: fb.id,
      type: fb.type || 'general',
      mood: fb.mood || 'neutral',
      message: fb.message,
      page: fb.page,
      userAgent: fb.user_agent || '',
      timestamp: fb.created_at,
      userId: fb.user_id,
      userRole: fb.user_role,
      userName: fb.user_name,
      status: fb.status || 'new',
      adminReply: fb.admin_reply,
      adminRepliedAt: fb.admin_replied_at
    }));
  } catch (e) {
    console.error('[Feedback] Exception:', e);
    return [];
  }
}

// Get feedbacks for a specific user
export async function getUserFeedbacks(userId: string): Promise<FeedbackData[]> {
  console.log('[Feedback] Loading feedbacks for user:', userId);
  
  if (!isSupabaseConfigured() || !userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('[Feedback] User load error:', error);
      return [];
    }
    
    return (data || []).map(fb => ({
      id: fb.id,
      type: fb.type || 'general',
      mood: fb.mood || 'neutral',
      message: fb.message,
      page: fb.page,
      userAgent: fb.user_agent || '',
      timestamp: fb.created_at,
      userId: fb.user_id,
      userRole: fb.user_role,
      userName: fb.user_name,
      status: fb.status || 'new',
      adminReply: fb.admin_reply,
      adminRepliedAt: fb.admin_replied_at
    }));
  } catch (e) {
    console.error('[Feedback] Exception:', e);
    return [];
  }
}

// Legacy sync function
export function getFeedbacks(): FeedbackData[] {
  return [];
}

// Save feedback to Supabase
export async function saveFeedback(feedback: FeedbackData): Promise<boolean> {
  console.log('[Feedback] Saving feedback:', {
    id: feedback.id,
    type: feedback.type,
    message: feedback.message.substring(0, 30) + '...',
    userId: feedback.userId
  });
  
  if (!isSupabaseConfigured()) {
    console.error('[Feedback] ❌ Supabase not configured!');
    return false;
  }
  
  try {
    const insertData = {
      id: feedback.id,
      type: feedback.type,
      mood: feedback.mood,
      message: feedback.message,
      page: feedback.page,
      user_agent: feedback.userAgent,
      user_id: feedback.userId && feedback.userId.length === 36 ? feedback.userId : null,
      user_role: feedback.userRole || 'guest',
      user_name: feedback.userName || 'Anonymous',
      status: 'new'
    };
    
    console.log('[Feedback] Insert data:', insertData);
    
    const { data, error } = await supabase
      .from('feedback')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('[Feedback] ❌ Save error:', error.message, error.details, error.hint);
      return false;
    }
    
    console.log('[Feedback] ✅ Saved successfully:', data);
    return true;
  } catch (e) {
    console.error('[Feedback] ❌ Exception:', e);
    return false;
  }
}

// Update feedback status (for admin)
export async function updateFeedbackStatus(id: string, status: FeedbackData['status'], adminReply?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (adminReply) {
      updateData.admin_reply = adminReply;
      updateData.admin_replied_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('[Feedback] Update error:', error);
      return false;
    }
    
    console.log('[Feedback] ✅ Status updated:', id, status);
    return true;
  } catch (e) {
    console.error('[Feedback] Update exception:', e);
    return false;
  }
}

// ============ COMPONENT ============
export const FeedbackWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isBn = language === 'bn';

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const hiddenPages = ['/admin', '/doctor-dashboard', '/patient-dashboard'];
  const shouldHide = hiddenPages.some(page => location.pathname.startsWith(page));

  const t = {
    title: isBn ? 'মতামত' : 'Feedback',
    howFeeling: isBn ? 'আপনার অভিজ্ঞতা কেমন?' : 'How was your experience?',
    happy: isBn ? 'ভালো' : 'Great',
    neutral: isBn ? 'ঠিকঠাক' : 'Okay',
    sad: isBn ? 'খারাপ' : 'Poor',
    whatType: isBn ? 'কি ধরনের মতামত?' : 'Feedback type',
    bug: isBn ? 'সমস্যা' : 'Bug',
    feature: isBn ? 'ফিচার' : 'Feature',
    general: isBn ? 'সাধারণ' : 'General',
    complaint: isBn ? 'অভিযোগ' : 'Complaint',
    tellMore: isBn ? 'বিস্তারিত' : 'Details',
    placeholder: isBn ? 'আপনার মতামত লিখুন...' : 'Write your feedback...',
    submit: isBn ? 'পাঠান' : 'Submit',
    submitting: isBn ? 'পাঠানো হচ্ছে...' : 'Sending...',
    thanks: isBn ? 'ধন্যবাদ!' : 'Thanks!',
    thanksMsg: isBn ? 'আপনার মতামত পাঠানো হয়েছে' : 'Your feedback has been sent',
    errorMsg: isBn ? 'সমস্যা হয়েছে, আবার চেষ্টা করুন' : 'Error, please try again',
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    setError('');

    const feedback: FeedbackData = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: feedbackType,
      mood: mood || 'neutral',
      message: message.trim(),
      page: location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userRole: isAuthenticated ? 'patient' : 'guest',
      userName: user?.name || 'Anonymous',
      status: 'new'
    };

    const success = await saveFeedback(feedback);
    setIsSubmitting(false);
    
    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
        setStep(1);
        setMood(null);
        setMessage('');
        setFeedbackType('general');
      }, 2500);
    } else {
      setError(t.errorMsg);
    }
  };

  if (shouldHide) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all transform hover:scale-105">
          <span className="text-2xl">💬</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t.title}</h2>
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-xl">✕</button>
              </div>
            </div>

            <div className="p-5">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-xl font-bold text-gray-800">{t.thanks}</h3>
                  <p className="text-gray-500 mt-1">{t.thanksMsg}</p>
                  <p className="text-sm text-blue-600 mt-2">আপনার প্রোফাইলে মতামত দেখতে পাবেন</p>
                </div>
              ) : step === 1 ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">{t.howFeeling}</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'happy' as FeedbackMood, emoji: '😊', label: t.happy },
                        { value: 'neutral' as FeedbackMood, emoji: '😐', label: t.neutral },
                        { value: 'sad' as FeedbackMood, emoji: '😞', label: t.sad },
                      ].map((option) => (
                        <button key={option.value} onClick={() => setMood(option.value)}
                          className={`flex-1 p-3 rounded-xl border-2 transition-all ${mood === option.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <span className="text-2xl block">{option.emoji}</span>
                          <span className="text-xs text-gray-600 mt-1">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">{t.whatType}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'general' as FeedbackType, label: t.general },
                        { value: 'bug' as FeedbackType, label: t.bug },
                        { value: 'feature' as FeedbackType, label: t.feature },
                        { value: 'complaint' as FeedbackType, label: t.complaint },
                      ].map((type) => (
                        <button key={type.value} onClick={() => setFeedbackType(type.value)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${feedbackType === type.value ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} disabled={!mood}
                    className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium disabled:bg-gray-300">
                    {isBn ? 'পরবর্তী' : 'Next'} →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t.tellMore}</p>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.placeholder}
                      className="w-full h-32 p-3 border rounded-xl resize-none focus:ring-2 focus:ring-teal-500" autoFocus />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 border rounded-xl text-gray-600">
                      ← {isBn ? 'পেছনে' : 'Back'}
                    </button>
                    <button onClick={handleSubmit} disabled={!message.trim() || isSubmitting}
                      className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium disabled:bg-gray-300">
                      {isSubmitting ? t.submitting : t.submit}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
