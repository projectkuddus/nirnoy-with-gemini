import React, { useState, useMemo } from 'react';

// ============ TYPES ============
export interface Notification {
  id: string;
  type: 'appointment' | 'medication' | 'health_alert' | 'message' | 'system' | 'reminder' | 'family';
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  createdAt: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    appointmentId?: string;
    doctorName?: string;
    medicineId?: string;
    familyMemberId?: string;
    senderId?: string;
  };
}

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  patientId: string;
  type: 'before_1_day' | 'before_2_hours' | 'before_30_min' | 'queue_update';
  scheduledFor: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  channels: ('in_app' | 'sms' | 'email' | 'push')[];
  appointmentDetails: {
    doctorName: string;
    specialty: string;
    chamberName: string;
    date: string;
    time: string;
    serialNumber?: number;
  };
}

interface NotificationsCenterProps {
  notifications: Notification[];
  reminders: AppointmentReminder[];
  unreadCount: number;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (notificationId: string) => void;
  onAction: (notification: Notification) => void;
  onConfigureReminders: () => void;
  onToggleReminder: (reminderId: string, enabled: boolean) => void;
}

// ============ CONSTANTS ============
const NOTIFICATION_ICONS: Record<string, string> = {
  appointment: '📅',
  medication: '💊',
  health_alert: '🚨',
  message: '💬',
  system: '🔔',
  reminder: '⏰',
  family: '👨‍👩‍👧‍👦',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700 animate-pulse',
};

// ============ COMPONENT ============
export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  notifications,
  reminders,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onAction,
  onConfigureReminders,
  onToggleReminder,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'medications' | 'messages' | 'settings'>('all');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }
    
    if (activeTab === 'appointments') {
      filtered = filtered.filter(n => n.type === 'appointment' || n.type === 'reminder');
    } else if (activeTab === 'medications') {
      filtered = filtered.filter(n => n.type === 'medication');
    } else if (activeTab === 'messages') {
      filtered = filtered.filter(n => n.type === 'message');
    }
    
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, filter, activeTab]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    filteredNotifications.forEach(n => {
      const date = new Date(n.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'আজ';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'গতকাল';
      } else {
        key = date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    
    return groups;
  }, [filteredNotifications]);

  // Time ago formatter
  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    return `${days} দিন আগে`;
  };

  // Upcoming reminders
  const upcomingReminders = reminders
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-700">🔔 বিজ্ঞপ্তি</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-sm rounded-full">
              {unreadCount} অপঠিত
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onMarkAllRead}
            className="px-3 py-1 text-sm text-blue-600 hover:underline"
            disabled={unreadCount === 0}
          >
            সব পঠিত হিসেবে চিহ্নিত করুন
          </button>
          <button
            onClick={onConfigureReminders}
            className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
          >
            ⚙️ সেটিংস
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'সকল', icon: '📋' },
          { id: 'appointments', label: 'অ্যাপয়েন্টমেন্ট', icon: '📅' },
          { id: 'medications', label: 'ওষুধ', icon: '💊' },
          { id: 'messages', label: 'বার্তা', icon: '💬' },
          { id: 'settings', label: 'রিমাইন্ডার সেটিংস', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'glass-card text-slate-600 hover:bg-white/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filter */}
      {activeTab !== 'settings' && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-lg ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600'
            }`}
          >
            সব
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm rounded-lg ${
              filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600'
            }`}
          >
            অপঠিত
          </button>
        </div>
      )}

      {/* Notifications List */}
      {activeTab !== 'settings' && (
        <div className="space-y-6">
          {Object.keys(groupedNotifications).length > 0 ? (
            Object.entries(groupedNotifications).map(([date, notifs]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-500 mb-2">{date}</h3>
                <div className="space-y-2">
                  {notifs.map(notification => (
                    <div
                      key={notification.id}
                      className={`glass-card rounded-xl p-4 flex items-start gap-3 transition-all ${
                        !notification.isRead ? 'border-l-4 border-blue-500 bg-blue-50/50' : ''
                      }`}
                      onClick={() => !notification.isRead && onMarkRead(notification.id)}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        PRIORITY_STYLES[notification.priority]
                      }`}>
                        {NOTIFICATION_ICONS[notification.type] || '🔔'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${!notification.isRead ? 'text-slate-800' : 'text-slate-600'}`}>
                            {notification.titleBn || notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {notification.messageBn || notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {notification.actionLabel && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAction(notification);
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {notification.actionLabel}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(notification.id);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <div className="text-5xl mb-4">🔔</div>
              <p className="font-medium">কোনো বিজ্ঞপ্তি নেই</p>
              <p className="text-sm">নতুন বিজ্ঞপ্তি আসলে এখানে দেখাবে</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Appointment Reminders */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              📅 অ্যাপয়েন্টমেন্ট রিমাইন্ডার
            </h3>
            <div className="space-y-3">
              {[
                { id: 'before_1_day', label: '১ দিন আগে', labelBn: '১ দিন আগে রিমাইন্ডার' },
                { id: 'before_2_hours', label: '২ ঘন্টা আগে', labelBn: '২ ঘন্টা আগে রিমাইন্ডার' },
                { id: 'before_30_min', label: '৩০ মিনিট আগে', labelBn: '৩০ মিনিট আগে রিমাইন্ডার' },
                { id: 'queue_update', label: 'কিউ আপডেট', labelBn: 'সিরিয়াল কাছে এলে জানাবে' },
              ].map(reminder => (
                <label
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                >
                  <div>
                    <div className="font-medium text-slate-700">{reminder.label}</div>
                    <div className="text-xs text-slate-500">{reminder.labelBn}</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={reminder.id !== 'before_30_min'}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Medication Reminders */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              💊 ওষুধের রিমাইন্ডার
            </h3>
            <div className="space-y-3">
              {[
                { id: 'medicine_time', label: 'ওষুধ খাওয়ার সময়', labelBn: 'নির্ধারিত সময়ে জানাবে' },
                { id: 'refill', label: 'রিফিল রিমাইন্ডার', labelBn: 'ওষুধ শেষ হওয়ার আগে জানাবে' },
                { id: 'missed', label: 'মিস্‌ড ডোজ', labelBn: 'ওষুধ মিস করলে জানাবে' },
              ].map(reminder => (
                <label
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                >
                  <div>
                    <div className="font-medium text-slate-700">{reminder.label}</div>
                    <div className="text-xs text-slate-500">{reminder.labelBn}</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              📱 বিজ্ঞপ্তি চ্যানেল
            </h3>
            <div className="space-y-3">
              {[
                { id: 'in_app', label: 'অ্যাপের মধ্যে', icon: '🔔', default: true },
                { id: 'sms', label: 'এসএমএস', icon: '📱', default: true },
                { id: 'email', label: 'ইমেইল', icon: '📧', default: false },
                { id: 'push', label: 'পুশ নোটিফিকেশন', icon: '📳', default: true },
              ].map(channel => (
                <label
                  key={channel.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{channel.icon}</span>
                    <span className="font-medium text-slate-700">{channel.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={channel.default}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                ⏰ আসন্ন রিমাইন্ডার
              </h3>
              <div className="space-y-3">
                {upcomingReminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-700">
                        {reminder.appointmentDetails.doctorName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(reminder.scheduledFor).toLocaleString('bn-BD')}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {{
                        before_1_day: '১ দিন আগে',
                        before_2_hours: '২ ঘন্টা আগে',
                        before_30_min: '৩০ মিনিট আগে',
                        queue_update: 'কিউ আপডেট',
                      }[reminder.type]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsCenter;

