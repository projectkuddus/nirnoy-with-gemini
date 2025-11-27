import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService, isSupabaseConfigured } from '../services/supabaseClient';

// ============ TYPES ============
type FeedbackType = 'bug' | 'feature' | 'general' | 'doctor' | 'complaint';
type FeedbackMood = 'happy' | 'neutral' | 'sad';

interface FeedbackData {
  type: FeedbackType;
  mood: FeedbackMood;
  message: string;
  email?: string;
  phone?: string;
  page: string;
  userAgent: string;
  timestamp: string;
}

// ============ COMPONENT ============
export const FeedbackWidget: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Translations
  const t = {
    title: isBn ? 'মতামত দিন' : 'Give Feedback',
    subtitle: isBn ? 'আপনার মতামত আমাদের উন্নতিতে সাহায্য করে' : 'Your feedback helps us improve',
    howFeeling: isBn ? 'আজ আপনার অভিজ্ঞতা কেমন?' : 'How was your experience today?',
    happy: isBn ? 'ভালো' : 'Great',
    neutral: isBn ? 'ঠিকঠাক' : 'Okay',
    sad: isBn ? 'খারাপ' : 'Poor',
    whatType: isBn ? 'কি ধরনের মতামত?' : 'What type of feedback?',
    bug: isBn ? '🐛 সমস্যা রিপোর্ট' : '🐛 Bug Report',
    feature: isBn ? '💡 ফিচার রিকোয়েস্ট' : '💡 Feature Request',
    general: isBn ? '💬 সাধারণ মতামত' : '💬 General Feedback',
    doctor: isBn ? '👨‍⚕️ ডাক্তার ফিডব্যাক' : '👨‍⚕️ Doctor Feedback',
    complaint: isBn ? '😤 অভিযোগ' : '😤 Complaint',
    tellMore: isBn ? 'বিস্তারিত বলুন' : 'Tell us more',
    placeholder: isBn ? 'আপনার মতামত এখানে লিখুন...' : 'Write your feedback here...',
    contactOptional: isBn ? 'যোগাযোগ (ঐচ্ছিক)' : 'Contact (Optional)',
    contactPlaceholder: isBn ? 'ফোন বা ইমেইল' : 'Phone or Email',
    submit: isBn ? 'পাঠান' : 'Submit',
    submitting: isBn ? 'পাঠানো হচ্ছে...' : 'Submitting...',
    thanks: isBn ? 'ধন্যবাদ! 🙏' : 'Thank You! 🙏',
    thanksMessage: isBn ? 'আপনার মতামত আমাদের কাছে পৌঁছে গেছে। আমরা শীঘ্রই পর্যালোচনা করব।' : 'Your feedback has been received. We will review it soon.',
    close: isBn ? 'বন্ধ করুন' : 'Close',
    back: isBn ? 'পিছনে' : 'Back',
    next: isBn ? 'পরবর্তী' : 'Next',
    anonymous: isBn ? 'বেনামে পাঠান' : 'Send Anonymously',
  };

  const feedbackTypes: { type: FeedbackType; label: string; icon: string }[] = [
    { type: 'general', label: t.general, icon: '💬' },
    { type: 'bug', label: t.bug, icon: '🐛' },
    { type: 'feature', label: t.feature, icon: '💡' },
    { type: 'doctor', label: t.doctor, icon: '👨‍⚕️' },
    { type: 'complaint', label: t.complaint, icon: '😤' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      mood: mood || 'neutral',
      message: message.trim(),
      email: contact.includes('@') ? contact : undefined,
      phone: !contact.includes('@') && contact ? contact : undefined,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    try {
      // Submit to Supabase if configured, otherwise localStorage
      console.log('Feedback submitted:', feedbackData);
      
      await dbService.submitFeedback(feedbackData);

      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setMood(null);
    setFeedbackType('general');
    setMessage('');
    setContact('');
    setSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 300);
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 group"
        aria-label="Give Feedback"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105">
          <i className="fas fa-comment-dots text-lg"></i>
          <span className="font-bold text-sm hidden sm:inline">{t.title}</span>
        </div>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="fas fa-comment-dots text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t.title}</h2>
                  <p className="text-purple-100 text-sm">{t.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {submitted ? (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check text-green-500 text-3xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{t.thanks}</h3>
                  <p className="text-slate-500 mb-6">{t.thanksMessage}</p>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                  >
                    {t.close}
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 1: Mood */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-slate-800 text-center">{t.howFeeling}</h3>
                      <div className="flex justify-center gap-4">
                        {[
                          { mood: 'happy' as FeedbackMood, emoji: '😊', label: t.happy, color: 'green' },
                          { mood: 'neutral' as FeedbackMood, emoji: '😐', label: t.neutral, color: 'amber' },
                          { mood: 'sad' as FeedbackMood, emoji: '😞', label: t.sad, color: 'red' },
                        ].map((item) => (
                          <button
                            key={item.mood}
                            onClick={() => {
                              setMood(item.mood);
                              setStep(2);
                            }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105 ${
                              mood === item.mood
                                ? `border-${item.color}-500 bg-${item.color}-50`
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-4xl">{item.emoji}</span>
                            <span className="text-sm font-medium text-slate-600">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Type & Message */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{t.whatType}</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {feedbackTypes.map((item) => (
                            <button
                              key={item.type}
                              onClick={() => setFeedbackType(item.type)}
                              className={`p-3 rounded-xl text-sm font-medium transition text-left ${
                                feedbackType === item.type
                                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                                  : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">{t.tellMore}</h3>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={t.placeholder}
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none transition resize-none"
                          autoFocus
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">{t.contactOptional}</h3>
                        <input
                          type="text"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder={t.contactPlaceholder}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none transition"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(1)}
                          className="px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition"
                        >
                          <i className="fas fa-arrow-left mr-2"></i>
                          {t.back}
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={!message.trim() || isSubmitting}
                          className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>{t.submitting}</>
                          ) : (
                            <><i className="fas fa-paper-plane mr-2"></i>{t.submit}</>
                          )}
                        </button>
                      </div>

                      {!contact && (
                        <p className="text-xs text-center text-slate-400">
                          <i className="fas fa-user-secret mr-1"></i>
                          {t.anonymous}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Progress Indicator */}
            {!submitted && (
              <div className="px-6 pb-4">
                <div className="flex gap-2">
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      className={`flex-1 h-1 rounded-full transition ${
                        step >= s ? 'bg-purple-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;

