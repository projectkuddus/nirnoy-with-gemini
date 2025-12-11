import React, { useState, useMemo } from 'react';

// ============ TYPES ============
export interface TimelineEvent {
  id: string;
  type: 'appointment' | 'prescription' | 'lab_report' | 'vaccination' | 'vital' | 'symptom' | 'surgery' | 'diagnosis';
  date: string;
  title: string;
  titleBn: string;
  description?: string;
  descriptionBn?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  location?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  metadata?: Record<string, any>;
}

interface HealthTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  onAddEvent?: () => void;
}

// ============ EVENT TYPE ICONS & COLORS ============
const EVENT_STYLES: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  appointment: { icon: '📅', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  prescription: { icon: '💊', color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-400' },
  lab_report: { icon: '🔬', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  vaccination: { icon: '💉', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-400' },
  vital: { icon: '❤️', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-400' },
  symptom: { icon: '🩹', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-400' },
  surgery: { icon: '🏥', color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-400' },
  diagnosis: { icon: '🔍', color: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-400' },
};

// ============ HEALTH TIMELINE COMPONENT ============
export const HealthTimeline: React.FC<HealthTimelineProps> = ({
  events,
  onEventClick,
  onAddEvent,
}) => {
  // State
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'list'>('timeline');

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(e => e.type === filter);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.titleBn.includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.doctorName?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [events, filter, searchQuery]);

  // Group events by month/year
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEvents]);

  // Toggle event expansion
  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format month header
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });
  };

  // Get time ago
  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'আজ';
    if (diffDays === 1) return 'গতকাল';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} সপ্তাহ আগে`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} মাস আগে`;
    return `${Math.floor(diffDays / 365)} বছর আগে`;
  };

  // Event types for filter
  const eventTypes = [
    { value: 'all', label: 'সব', icon: '📋' },
    { value: 'appointment', label: 'অ্যাপয়েন্টমেন্ট', icon: '📅' },
    { value: 'prescription', label: 'প্রেসক্রিপশন', icon: '💊' },
    { value: 'lab_report', label: 'ল্যাব রিপোর্ট', icon: '🔬' },
    { value: 'vaccination', label: 'টিকা', icon: '💉' },
    { value: 'vital', label: 'ভাইটাল', icon: '❤️' },
    { value: 'diagnosis', label: 'রোগ নির্ণয়', icon: '🔍' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📋 স্বাস্থ্য টাইমলাইন</h2>
          <p className="text-slate-500">আপনার সম্পূর্ণ চিকিৎসা ইতিহাস এক নজরে</p>
        </div>
        <div className="flex gap-2">
          {/* View Mode */}
          <div className="flex glass-subtle rounded-lg overflow-hidden">
            {(['timeline', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm ${viewMode === mode ? 'bg-blue-500 text-white' : 'text-slate-600'}`}
              >
                {mode === 'timeline' ? '⏳' : '☰'}
              </button>
            ))}
          </div>
          
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            >
              <span>+</span>
              <span>রেকর্ড যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ইতিহাসে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 glass-subtle rounded-lg border-0"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
                  filter === type.value
                    ? 'bg-blue-500 text-white'
                    : 'glass-subtle text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{events.length}</div>
          <div className="text-sm text-slate-500">মোট রেকর্ড</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-blue-400">
          <div className="text-3xl font-bold text-blue-600">
            {events.filter(e => e.type === 'appointment').length}
          </div>
          <div className="text-sm text-slate-500">অ্যাপয়েন্টমেন্ট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-purple-400">
          <div className="text-3xl font-bold text-purple-600">
            {events.filter(e => e.type === 'lab_report').length}
          </div>
          <div className="text-sm text-slate-500">ল্যাব রিপোর্ট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-teal-400">
          <div className="text-3xl font-bold text-teal-600">
            {events.filter(e => e.type === 'prescription').length}
          </div>
          <div className="text-sm text-slate-500">প্রেসক্রিপশন</div>
        </div>
      </div>

      {/* Timeline Content */}
      {viewMode === 'timeline' ? (
        <div className="space-y-8">
          {groupedEvents.map(([monthKey, monthEvents]) => (
            <div key={monthKey}>
              {/* Month Header */}
              <div className="sticky top-0 z-10 glass-strong py-2 px-4 rounded-lg mb-4">
                <h3 className="font-semibold text-slate-700">{formatMonth(monthKey)}</h3>
              </div>

              {/* Events */}
              <div className="relative pl-8 space-y-4">
                {/* Timeline Line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                {monthEvents.map((event, idx) => {
                  const style = EVENT_STYLES[event.type] || EVENT_STYLES.appointment;
                  const isExpanded = expandedEvents.has(event.id);

                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-5 w-4 h-4 rounded-full ${style.bg} border-2 ${style.border}`}></div>

                      {/* Event Card */}
                      <div
                        className={`glass-card p-4 cursor-pointer transition hover:shadow-lg ${
                          isExpanded ? 'ring-2 ring-blue-200' : ''
                        }`}
                        onClick={() => toggleExpand(event.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center text-xl`}>
                            {style.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`font-semibold ${style.color}`}>{event.titleBn || event.title}</h4>
                              <span className="text-xs text-slate-500">{getTimeAgo(event.date)}</span>
                            </div>
                            
                            <div className="text-sm text-slate-500 mt-1">{formatDate(event.date)}</div>

                            {event.doctorName && (
                              <div className="text-sm text-slate-600 mt-1">
                                👨‍⚕️ {event.doctorName}
                                {event.doctorSpecialty && ` • ${event.doctorSpecialty}`}
                              </div>
                            )}

                            {event.location && (
                              <div className="text-sm text-slate-500 mt-1">📍 {event.location}</div>
                            )}

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                {(event.description || event.descriptionBn) && (
                                  <p className="text-slate-600">{event.descriptionBn || event.description}</p>
                                )}

                                {/* Metadata */}
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(event.metadata).map(([key, value]) => (
                                      <div key={key} className="p-2 glass-subtle rounded-lg">
                                        <div className="text-xs text-slate-500">{key}</div>
                                        <div className="text-sm font-medium text-slate-700">{String(value)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Documents */}
                                {event.documents && event.documents.length > 0 && (
                                  <div>
                                    <div className="text-sm font-medium text-slate-600 mb-2">📎 সংযুক্তি</div>
                                    <div className="flex flex-wrap gap-2">
                                      {event.documents.map(doc => (
                                        <a
                                          key={doc.id}
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 glass-subtle rounded-lg text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          📄 {doc.name}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                  {onEventClick && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(event);
                                      }}
                                      className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                                    >
                                      বিস্তারিত দেখুন
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Expand Icon */}
                          <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ধরন</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">বিবরণ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">তারিখ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ডাক্তার</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map(event => {
                const style = EVENT_STYLES[event.type] || EVENT_STYLES.appointment;
                
                return (
                  <tr key={event.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${style.bg} ${style.color}`}>
                        {style.icon}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{event.titleBn || event.title}</div>
                      {event.descriptionBn && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">{event.descriptionBn}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(event.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{event.doctorName || '-'}</td>
                    <td className="px-4 py-3">
                      {onEventClick && (
                        <button
                          onClick={() => onEventClick(event)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          দেখুন
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো রেকর্ড পাওয়া যায়নি</h3>
          <p className="text-slate-500 mb-4">আপনার ফিল্টার পরিবর্তন করুন বা নতুন রেকর্ড যোগ করুন</p>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              + নতুন রেকর্ড যোগ করুন
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthTimeline;

