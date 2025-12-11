import React, { useState, useMemo, useCallback } from 'react';
import { PatientProfile } from '../../contexts/AuthContext';

// ============ TYPES ============
export interface VitalSign {
  id: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'blood_sugar' | 'weight' | 'spo2' | 'respiratory_rate';
  value: string | number;
  secondaryValue?: number; // For BP (diastolic)
  unit: string;
  measuredAt: string;
  notes?: string;
  source?: 'manual' | 'device' | 'lab';
}

export interface HealthGoal {
  id: string;
  title: string;
  titleBn: string;
  type: 'weight' | 'steps' | 'water' | 'sleep' | 'exercise' | 'medication' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  streak?: number;
  progress: number;
}

export interface HealthInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  category: 'general' | 'vitals' | 'medication' | 'lifestyle' | 'appointment';
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  action?: {
    label: string;
    labelBn: string;
    onClick?: () => void;
  };
  createdAt: string;
  read?: boolean;
}

export interface HealthRisk {
  id: string;
  condition: string;
  conditionBn: string;
  riskLevel: 'low' | 'moderate' | 'high';
  factors: string[];
  recommendations: string[];
  lastUpdated: string;
}

interface HealthDashboardProps {
  profile: PatientProfile;
  vitals: VitalSign[];
  goals: HealthGoal[];
  insights: HealthInsight[];
  risks?: HealthRisk[];
  onAddVital?: (vital: Omit<VitalSign, 'id'>) => Promise<void>;
  onAddGoal?: (goal: Omit<HealthGoal, 'id' | 'progress'>) => Promise<void>;
  onUpdateGoal?: (goalId: string, currentValue: number) => Promise<void>;
  onDismissInsight?: (insightId: string) => void;
}

// ============ CONSTANTS ============
const VITAL_CONFIG = {
  blood_pressure: { 
    icon: '🩸', 
    label: 'Blood Pressure', 
    labelBn: 'রক্তচাপ', 
    unit: 'mmHg',
    normalRange: { min: '90/60', max: '120/80' },
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  heart_rate: { 
    icon: '❤️', 
    label: 'Heart Rate', 
    labelBn: 'হৃদস্পন্দন', 
    unit: 'bpm',
    normalRange: { min: 60, max: 100 },
    color: 'text-pink-600',
    bg: 'bg-pink-100',
  },
  temperature: { 
    icon: '🌡️', 
    label: 'Temperature', 
    labelBn: 'তাপমাত্রা', 
    unit: '°F',
    normalRange: { min: 97, max: 99 },
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  blood_sugar: { 
    icon: '🩹', 
    label: 'Blood Sugar', 
    labelBn: 'রক্তে শর্করা', 
    unit: 'mg/dL',
    normalRange: { min: 70, max: 100 },
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  weight: { 
    icon: '⚖️', 
    label: 'Weight', 
    labelBn: 'ওজন', 
    unit: 'kg',
    normalRange: { min: 0, max: 0 }, // Dynamic based on BMI
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  spo2: { 
    icon: '💨', 
    label: 'Oxygen Saturation', 
    labelBn: 'অক্সিজেন স্যাচুরেশন', 
    unit: '%',
    normalRange: { min: 95, max: 100 },
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
  },
  respiratory_rate: { 
    icon: '🫁', 
    label: 'Respiratory Rate', 
    labelBn: 'শ্বাস-প্রশ্বাস', 
    unit: '/min',
    normalRange: { min: 12, max: 20 },
    color: 'text-teal-600',
    bg: 'bg-teal-100',
  },
};

const GOAL_ICONS: Record<string, string> = {
  weight: '⚖️',
  steps: '🚶',
  water: '💧',
  sleep: '😴',
  exercise: '🏃',
  medication: '💊',
  custom: '🎯',
};

// ============ HEALTH DASHBOARD COMPONENT ============
export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  profile,
  vitals,
  goals,
  insights,
  risks = [],
  onAddVital,
  onAddGoal,
  onUpdateGoal,
  onDismissInsight,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'goals' | 'insights' | 'risks'>('overview');
  const [showAddVitalModal, setShowAddVitalModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [selectedVitalType, setSelectedVitalType] = useState<VitalSign['type']>('blood_pressure');
  const [vitalValue, setVitalValue] = useState('');
  const [vitalSecondaryValue, setVitalSecondaryValue] = useState('');
  const [vitalNotes, setVitalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate health score
  const healthScore = useMemo(() => {
    let score = 70; // Base score
    
    // BMI contribution
    if (profile.heightCm && profile.weightKg) {
      const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
      if (bmi >= 18.5 && bmi < 25) score += 15;
      else if (bmi >= 25 && bmi < 30) score += 5;
      else score -= 5;
    }
    
    // Profile completeness
    const fields = [profile.bloodGroup, profile.dateOfBirth, profile.emergencyContactPhone];
    score += fields.filter(Boolean).length * 3;
    
    // Chronic conditions impact
    if (profile.chronicConditions?.length) {
      score -= profile.chronicConditions.length * 5;
    }
    
    // Recent vitals bonus
    const recentVitals = vitals.filter(v => {
      const daysDiff = (Date.now() - new Date(v.measuredAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    if (recentVitals.length >= 3) score += 5;
    
    // Goal progress
    const avgProgress = goals.length > 0 
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length 
      : 0;
    score += Math.round(avgProgress * 0.1);
    
    // High risk penalty
    const highRisks = risks.filter(r => r.riskLevel === 'high');
    score -= highRisks.length * 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [profile, vitals, goals, risks]);

  // Get health score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-200' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-200' };
    return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200' };
  };

  const scoreColors = getScoreColor(healthScore);

  // Calculate BMI
  const bmiData = useMemo(() => {
    if (!profile.heightCm || !profile.weightKg) return null;
    const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
    let category = '';
    let categoryBn = '';
    let color = '';
    
    if (bmi < 18.5) { category = 'Underweight'; categoryBn = 'কম ওজন'; color = 'text-blue-600'; }
    else if (bmi < 25) { category = 'Normal'; categoryBn = 'স্বাভাবিক'; color = 'text-green-600'; }
    else if (bmi < 30) { category = 'Overweight'; categoryBn = 'অতিরিক্ত ওজন'; color = 'text-amber-600'; }
    else { category = 'Obese'; categoryBn = 'স্থূলতা'; color = 'text-red-600'; }
    
    return { value: bmi.toFixed(1), category, categoryBn, color };
  }, [profile]);

  // Get latest vitals by type
  const latestVitals = useMemo(() => {
    const latest: Record<string, VitalSign> = {};
    vitals.forEach(v => {
      if (!latest[v.type] || new Date(v.measuredAt) > new Date(latest[v.type].measuredAt)) {
        latest[v.type] = v;
      }
    });
    return latest;
  }, [vitals]);

  // Unread insights count
  const unreadInsights = insights.filter(i => !i.read).length;

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle add vital
  const handleAddVital = useCallback(async () => {
    if (!onAddVital || !vitalValue) return;
    
    setIsSubmitting(true);
    try {
      await onAddVital({
        type: selectedVitalType,
        value: selectedVitalType === 'blood_pressure' ? `${vitalValue}/${vitalSecondaryValue}` : parseFloat(vitalValue),
        secondaryValue: selectedVitalType === 'blood_pressure' ? parseFloat(vitalSecondaryValue) : undefined,
        unit: VITAL_CONFIG[selectedVitalType].unit,
        measuredAt: new Date().toISOString(),
        notes: vitalNotes || undefined,
        source: 'manual',
      });
      
      setShowAddVitalModal(false);
      setVitalValue('');
      setVitalSecondaryValue('');
      setVitalNotes('');
    } catch (error) {
      console.error('Error adding vital:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onAddVital, selectedVitalType, vitalValue, vitalSecondaryValue, vitalNotes]);

  // Get trend indicator for vitals
  const getVitalTrend = (type: VitalSign['type']) => {
    const typeVitals = vitals.filter(v => v.type === type).sort((a, b) => 
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
    );
    
    if (typeVitals.length < 2) return null;
    
    const current = typeof typeVitals[0].value === 'string' 
      ? parseFloat(typeVitals[0].value.split('/')[0]) 
      : typeVitals[0].value;
    const previous = typeof typeVitals[1].value === 'string'
      ? parseFloat(typeVitals[1].value.split('/')[0])
      : typeVitals[1].value;
    
    if (current > previous) return { direction: 'up', color: 'text-red-500' };
    if (current < previous) return { direction: 'down', color: 'text-green-500' };
    return { direction: 'stable', color: 'text-slate-400' };
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Score */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Health Score Circle */}
          <div className="relative">
            <div className={`w-32 h-32 rounded-full ${scoreColors.ring} ring-8 flex items-center justify-center ${scoreColors.bg}/10`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${scoreColors.text}`}>{healthScore}</div>
                <div className="text-sm text-slate-500">স্বাস্থ্য স্কোর</div>
              </div>
            </div>
            {/* Animated ring */}
            <svg className="absolute inset-0 w-32 h-32 -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className={scoreColors.text}
                strokeDasharray={`${(healthScore / 100) * 364} 364`}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Quick Stats */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* BMI */}
            {bmiData && (
              <div className="glass-subtle p-3 rounded-xl text-center">
                <div className={`text-2xl font-bold ${bmiData.color}`}>{bmiData.value}</div>
                <div className="text-xs text-slate-500">BMI</div>
                <div className={`text-xs ${bmiData.color}`}>{bmiData.categoryBn}</div>
              </div>
            )}

            {/* Blood Pressure */}
            {latestVitals.blood_pressure && (
              <div className="glass-subtle p-3 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-600">{latestVitals.blood_pressure.value}</div>
                <div className="text-xs text-slate-500">রক্তচাপ</div>
              </div>
            )}

            {/* Goals Progress */}
            <div className="glass-subtle p-3 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-600">
                {goals.filter(g => g.progress >= 100).length}/{goals.length}
              </div>
              <div className="text-xs text-slate-500">লক্ষ্য পূর্ণ</div>
            </div>

            {/* Insights */}
            <div className="glass-subtle p-3 rounded-xl text-center cursor-pointer hover:bg-blue-50" onClick={() => setActiveTab('insights')}>
              <div className="text-2xl font-bold text-purple-600">{unreadInsights}</div>
              <div className="text-xs text-slate-500">নতুন পরামর্শ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 flex gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'সারসংক্ষেপ', icon: '📊' },
          { id: 'vitals', label: 'ভাইটাল সাইন', icon: '❤️', badge: Object.keys(latestVitals).length },
          { id: 'goals', label: 'লক্ষ্য', icon: '🎯', badge: goals.length },
          { id: 'insights', label: 'পরামর্শ', icon: '💡', badge: unreadInsights },
          { id: 'risks', label: 'ঝুঁকি', icon: '⚠️', badge: risks.filter(r => r.riskLevel === 'high').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/30' : 'bg-slate-200'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Vitals */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">❤️ সাম্প্রতিক ভাইটাল</h3>
              {onAddVital && (
                <button
                  onClick={() => setShowAddVitalModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + যোগ করুন
                </button>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(latestVitals).slice(0, 4).map(([type, vital]) => {
                const config = VITAL_CONFIG[type as VitalSign['type']];
                const trend = getVitalTrend(type as VitalSign['type']);
                
                return (
                  <div key={type} className="flex items-center gap-4 p-3 glass-subtle rounded-xl">
                    <div className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center text-xl`}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-500">{config.labelBn}</div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {vital.value} {config.unit}
                        {trend && (
                          <span className={trend.color}>
                            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(vital.measuredAt)}</div>
                  </div>
                );
              })}
              
              {Object.keys(latestVitals).length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <div className="text-4xl mb-2">📊</div>
                  <p>কোনো ভাইটাল রেকর্ড নেই</p>
                </div>
              )}
            </div>
          </div>

          {/* Goals Progress */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">🎯 লক্ষ্য অগ্রগতি</h3>
              {onAddGoal && (
                <button
                  onClick={() => setShowAddGoalModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + নতুন লক্ষ্য
                </button>
              )}
            </div>
            <div className="space-y-4">
              {goals.slice(0, 3).map(goal => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{GOAL_ICONS[goal.type]}</span>
                      <span className="text-sm font-medium text-slate-700">{goal.titleBn}</span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {goal.currentValue}/{goal.targetValue} {goal.unit}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  {goal.streak && goal.streak > 0 && (
                    <div className="text-xs text-amber-600">🔥 {goal.streak} দিন ধারাবাহিক</div>
                  )}
                </div>
              ))}
              
              {goals.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>কোনো লক্ষ্য সেট করা হয়নি</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights Preview */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-800 mb-4">💡 এআই পরামর্শ</h3>
            <div className="space-y-3">
              {insights.slice(0, 3).map(insight => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-xl border-l-4 ${
                    insight.type === 'alert' ? 'border-red-400 bg-red-50' :
                    insight.type === 'warning' ? 'border-amber-400 bg-amber-50' :
                    insight.type === 'success' ? 'border-green-400 bg-green-50' :
                    'border-blue-400 bg-blue-50'
                  }`}
                >
                  <div className="font-medium text-slate-800">{insight.titleBn}</div>
                  <p className="text-sm text-slate-600 mt-1">{insight.descriptionBn}</p>
                </div>
              ))}
              
              {insights.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <div className="text-4xl mb-2">💡</div>
                  <p>কোনো পরামর্শ নেই</p>
                </div>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-800 mb-4">⚠️ স্বাস্থ্য ঝুঁকি</h3>
            <div className="space-y-3">
              {risks.slice(0, 3).map(risk => (
                <div
                  key={risk.id}
                  className={`p-3 rounded-xl flex items-start gap-3 ${
                    risk.riskLevel === 'high' ? 'bg-red-50' :
                    risk.riskLevel === 'moderate' ? 'bg-amber-50' :
                    'bg-green-50'
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    risk.riskLevel === 'high' ? 'bg-red-200 text-red-700' :
                    risk.riskLevel === 'moderate' ? 'bg-amber-200 text-amber-700' :
                    'bg-green-200 text-green-700'
                  }`}>
                    {risk.riskLevel === 'high' ? 'উচ্চ' : risk.riskLevel === 'moderate' ? 'মাঝারি' : 'কম'}
                  </span>
                  <div>
                    <div className="font-medium text-slate-800">{risk.conditionBn}</div>
                    <p className="text-xs text-slate-500 mt-1">
                      {risk.factors.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
              
              {risks.length === 0 && (
                <div className="text-center py-6 text-green-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>কোনো উল্লেখযোগ্য ঝুঁকি নেই</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vitals Tab */}
      {activeTab === 'vitals' && (
        <div className="space-y-6">
          {/* Add Vital Button */}
          {onAddVital && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddVitalModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                + ভাইটাল যোগ করুন
              </button>
            </div>
          )}

          {/* Vital Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(VITAL_CONFIG).map(([type, config]) => {
              const typeVitals = vitals.filter(v => v.type === type).sort((a, b) =>
                new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
              );
              const latest = typeVitals[0];
              const trend = getVitalTrend(type as VitalSign['type']);

              return (
                <div key={type} className="glass-card p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center text-2xl`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{config.labelBn}</h4>
                      <p className="text-xs text-slate-500">{config.unit}</p>
                    </div>
                  </div>

                  {latest ? (
                    <>
                      <div className="flex items-end gap-2 mb-2">
                        <span className={`text-3xl font-bold ${config.color}`}>
                          {latest.value}
                        </span>
                        {trend && (
                          <span className={`text-lg ${trend.color}`}>
                            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(latest.measuredAt)}</p>

                      {/* Mini chart placeholder */}
                      <div className="mt-4 h-12 flex items-end gap-1">
                        {typeVitals.slice(0, 7).reverse().map((v, i) => {
                          const value = typeof v.value === 'string' ? parseFloat(v.value.split('/')[0]) : v.value;
                          const maxValue = Math.max(...typeVitals.map(tv => 
                            typeof tv.value === 'string' ? parseFloat(tv.value.split('/')[0]) : tv.value
                          ));
                          const height = (value / maxValue) * 100;
                          
                          return (
                            <div
                              key={v.id}
                              className={`flex-1 ${config.bg} rounded-t transition-all hover:opacity-80`}
                              style={{ height: `${height}%` }}
                              title={`${v.value} ${config.unit}`}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      <p className="text-sm">কোনো ডেটা নেই</p>
                      {onAddVital && (
                        <button
                          onClick={() => {
                            setSelectedVitalType(type as VitalSign['type']);
                            setShowAddVitalModal(true);
                          }}
                          className="text-blue-600 text-sm mt-2"
                        >
                          + যোগ করুন
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vitals History */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-800 mb-4">📋 ভাইটাল ইতিহাস</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">ধরন</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">মান</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">সময়</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">নোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitals.slice(0, 10).map(vital => {
                    const config = VITAL_CONFIG[vital.type];
                    return (
                      <tr key={vital.id} className="hover:bg-blue-50/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span className="text-sm text-slate-700">{config.labelBn}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${config.color}`}>
                            {vital.value} {config.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{formatDate(vital.measuredAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{vital.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Add Goal Button */}
          {onAddGoal && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddGoalModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                + নতুন লক্ষ্য
              </button>
            </div>
          )}

          {/* Goals List */}
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="glass-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    {GOAL_ICONS[goal.type]}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-800">{goal.titleBn}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        goal.progress >= 100 ? 'bg-green-100 text-green-700' :
                        goal.progress >= 50 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {Math.round(goal.progress)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full transition-all ${
                          goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                      <div className="flex items-center gap-4">
                        {goal.streak && goal.streak > 0 && (
                          <span className="text-amber-600">🔥 {goal.streak} দিন</span>
                        )}
                        <span className="text-slate-500">
                          {goal.frequency === 'daily' ? 'প্রতিদিন' : goal.frequency === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'}
                        </span>
                      </div>
                    </div>

                    {/* Update Button */}
                    {onUpdateGoal && goal.progress < 100 && (
                      <button
                        onClick={() => {
                          const increment = goal.type === 'steps' ? 1000 : goal.type === 'water' ? 1 : 1;
                          onUpdateGoal(goal.id, goal.currentValue + increment);
                        }}
                        className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                      >
                        + অগ্রগতি যোগ করুন
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {goals.length === 0 && (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো লক্ষ্য সেট করা হয়নি</h3>
                <p className="text-slate-500 mb-4">আপনার স্বাস্থ্য লক্ষ্য সেট করুন</p>
                {onAddGoal && (
                  <button
                    onClick={() => setShowAddGoalModal(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                  >
                    + প্রথম লক্ষ্য সেট করুন
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`glass-card p-4 border-l-4 ${
                insight.type === 'alert' ? 'border-red-400' :
                insight.type === 'warning' ? 'border-amber-400' :
                insight.type === 'success' ? 'border-green-400' :
                'border-blue-400'
              } ${!insight.read ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {insight.type === 'alert' ? '🚨' :
                     insight.type === 'warning' ? '⚠️' :
                     insight.type === 'success' ? '✅' : '💡'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-800">{insight.titleBn}</h4>
                    <p className="text-sm text-slate-600 mt-1">{insight.descriptionBn}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDate(insight.createdAt)}</p>
                    
                    {insight.action && (
                      <button
                        onClick={insight.action.onClick}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                      >
                        {insight.action.labelBn}
                      </button>
                    )}
                  </div>
                </div>
                
                {onDismissInsight && (
                  <button
                    onClick={() => onDismissInsight(insight.id)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {insights.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">💡</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো পরামর্শ নেই</h3>
              <p className="text-slate-500">নতুন স্বাস্থ্য পরামর্শ এখানে দেখাবে</p>
            </div>
          )}
        </div>
      )}

      {/* Risks Tab */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {risks.map(risk => (
            <div key={risk.id} className="glass-card p-6">
              <div className="flex items-start gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                  risk.riskLevel === 'moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {risk.riskLevel === 'high' ? 'উচ্চ ঝুঁকি' : risk.riskLevel === 'moderate' ? 'মাঝারি ঝুঁকি' : 'কম ঝুঁকি'}
                </span>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 text-lg">{risk.conditionBn}</h4>
                  
                  {/* Factors */}
                  <div className="mt-3">
                    <div className="text-sm font-medium text-slate-600 mb-2">ঝুঁকির কারণ:</div>
                    <div className="flex flex-wrap gap-2">
                      {risk.factors.map((factor, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="mt-4">
                    <div className="text-sm font-medium text-slate-600 mb-2">পরামর্শ:</div>
                    <ul className="space-y-1">
                      {risk.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-slate-400 mt-3">
                    সর্বশেষ আপডেট: {formatDate(risk.lastUpdated)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {risks.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-green-600 mb-2">দারুণ!</h3>
              <p className="text-slate-500">কোনো উল্লেখযোগ্য স্বাস্থ্য ঝুঁকি নেই</p>
            </div>
          )}
        </div>
      )}

      {/* Add Vital Modal */}
      {showAddVitalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">❤️ ভাইটাল যোগ করুন</h3>
            
            {/* Vital Type Selection */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {Object.entries(VITAL_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedVitalType(type as VitalSign['type'])}
                  className={`p-3 rounded-xl text-center transition ${
                    selectedVitalType === type
                      ? `${config.bg} ${config.color}`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <div className="text-xl">{config.icon}</div>
                  <div className="text-xs mt-1">{config.labelBn.split(' ')[0]}</div>
                </button>
              ))}
            </div>

            {/* Value Input */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {selectedVitalType === 'blood_pressure' ? 'সিস্টোলিক' : 'মান'}
                  </label>
                  <input
                    type="number"
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                    placeholder={selectedVitalType === 'blood_pressure' ? '120' : '0'}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  />
                </div>
                {selectedVitalType === 'blood_pressure' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">ডায়াস্টোলিক</label>
                    <input
                      type="number"
                      value={vitalSecondaryValue}
                      onChange={(e) => setVitalSecondaryValue(e.target.value)}
                      placeholder="80"
                      className="w-full p-3 border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={vitalNotes}
                  onChange={(e) => setVitalNotes(e.target.value)}
                  placeholder="বিশ্রামের পরে মাপা"
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddVitalModal(false);
                  setVitalValue('');
                  setVitalSecondaryValue('');
                  setVitalNotes('');
                }}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleAddVital}
                disabled={isSubmitting || !vitalValue || (selectedVitalType === 'blood_pressure' && !vitalSecondaryValue)}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;

