import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// ============ TYPES ============
type FeedbackType = 'bug' | 'feature' | 'general' | 'doctor' | 'complaint';
type FeedbackMood = 'happy' | 'neutral' | 'sad';

interface FeedbackData {
  id: string;
  type: FeedbackType;
  mood: FeedbackMood;
  message: string;
  email?: string;
  phone?: string;
  page: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  status: 'new' | 'reviewed' | 'resolved';
}

// ============ FEEDBACK STORAGE - EXPORTED ============
const FEEDBACK_STORAGE_KEY = 'nirnoy_feedbacks';

export function getFeedbacks(): FeedbackData[] {
  const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveFeedback(feedback: FeedbackData): void {
  const feedbacks = getFeedbacks();
  feedbacks.unshift(feedback);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks.slice(0, 100)));
}

export function updateFeedbackStatus(id: string, status: FeedbackData['status']): void {
  const feedbacks = getFeedbacks();
  const index = feedbacks.findIndex(f => f.id === id);
  if (index !== -1) {
    feedbacks[index].status = status;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks));
  }
}

// ============ COMPONENT ============
export const FeedbackWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isBn = language === 'bn';

  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Hide on certain pages
  const hiddenPages = ['/admin', '/doctor-dashboard', '/patient-dashboard'];
  const shouldHide = hiddenPages.some(page => location.pathname.startsWith(page));

  // Auto-collapse after delay
  useEffect(() => {
    if (isExpanded && !isOpen) {
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isOpen]);

  const t = {
    title: isBn ? 'মতামত' : 'Feedback',
    subtitle: isBn ? 'আপনার মতামত দিন' : 'Share your thoughts',
    howFeeling: isBn ? 'আপনার অভিজ্ঞতা কেমন?' : 'How was your experience?',
    happy: isBn ? 'ভালো' : 'Great',
    neutral: isBn ? 'ঠিকঠাক' : 'Okay',
    sad: isBn ? 'খারাপ' : 'Poor',
    whatType: isBn ? 'কি ধরনের মতামত?' : 'Feedback type',
    bug: isBn ? 'সমস্যা' : 'Bug',
    feature: isBn ? 'ফিচার' : 'Feature',
    general: isBn ? 'সাধারণ' : 'General',
    doctor: isBn ? 'ডাক্তার' : 'Doctor',
    complaint: isBn ? 'অভিযোগ' : 'Complaint',
    tellMore: isBn ? 'বিস্তারিত' : 'Details',
    placeholder: isBn ? 'আপনার মতামত লিখুন...' : 'Write your feedback...',
    submit: isBn ? 'পাঠান' : 'Submit',
    submitting: isBn ? 'পাঠানো হচ্ছে...' : 'Sending...',
    thanks: isBn ? 'ধন্যবাদ!' : 'Thanks!',
    thanksMsg: isBn ? 'আপনার মতামত পাঠানো হয়েছে' : 'Your feedback has been sent',
    loginRequired: isBn ? 'মতামত দিতে লগইন করুন' : 'Login to submit feedback',
    login: isBn ? 'লগইন' : 'Login',
    cancel: isBn ? 'বাতিল' : 'Cancel',
  };

  const handleOpen = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setIsOpen(true);
    setStep(1);
    setMood(null);
    setMessage('');
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!mood || !message.trim()) return;
    
    setIsSubmitting(true);
    
    const feedback: FeedbackData = {
      id: Date.now().toString(),
      type: feedbackType,
      mood,
      message: message.trim(),
      page: location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userRole: user?.role,
      userName: user?.name,
      status: 'new',
    };
    
    saveFeedback(feedback);
    
    await new Promise(r => setTimeout(r, 500));
    setIsSubmitting(false);
    setSubmitted(true);
    
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
    }, 2000);
  };

  if (shouldHide) return null;

  return (
    <>
      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h3 className="font-bold text-slate-800 mb-2">{t.loginRequired}</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowLoginPrompt(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-600">{t.cancel}</button>
              <button onClick={() => { setShowLoginPrompt(false); navigate('/patient-auth'); }} className="flex-1 py-2 bg-teal-500 text-white rounded-xl font-bold">{t.login}</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleOpen}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => !isOpen && setIsExpanded(false)}
          className={`flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${isExpanded ? 'px-4 py-3' : 'w-12 h-12 justify-center'}`}
        >
          <span className="text-lg">💬</span>
          {isExpanded && <span className="text-sm font-medium whitespace-nowrap">{t.title}</span>}
        </button>
      </div>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{t.title}</h3>
                  <p className="text-sm text-white/80">{t.subtitle}</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30">✕</button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">✅</div>
                  <h4 className="font-bold text-slate-800 text-lg">{t.thanks}</h4>
                  <p className="text-slate-500">{t.thanksMsg}</p>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-3">{t.howFeeling}</p>
                    <div className="flex justify-center gap-4">
                      {[
                        { value: 'happy' as FeedbackMood, emoji: '😊', label: t.happy },
                        { value: 'neutral' as FeedbackMood, emoji: '😐', label: t.neutral },
                        { value: 'sad' as FeedbackMood, emoji: '😞', label: t.sad },
                      ].map(item => (
                        <button
                          key={item.value}
                          onClick={() => setMood(item.value)}
                          className={`flex flex-col items-center p-3 rounded-xl transition ${mood === item.value ? 'bg-teal-100 ring-2 ring-teal-500' : 'hover:bg-slate-100'}`}
                        >
                          <span className="text-3xl">{item.emoji}</span>
                          <span className="text-xs text-slate-600 mt-1">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">{t.whatType}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'general' as FeedbackType, label: t.general },
                        { value: 'bug' as FeedbackType, label: t.bug },
                        { value: 'feature' as FeedbackType, label: t.feature },
                        { value: 'doctor' as FeedbackType, label: t.doctor },
                        { value: 'complaint' as FeedbackType, label: t.complaint },
                      ].map(item => (
                        <button
                          key={item.value}
                          onClick={() => setFeedbackType(item.value)}
                          className={`px-3 py-1.5 rounded-full text-sm transition ${feedbackType === item.value ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mood && (
                    <button onClick={() => setStep(2)} className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold">
                      {isBn ? 'পরবর্তী' : 'Next'} →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">{t.tellMore}</p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.placeholder}
                      className="w-full h-32 p-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">
                      ← {isBn ? 'পিছনে' : 'Back'}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !message.trim()}
                      className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold disabled:opacity-50"
                    >
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
