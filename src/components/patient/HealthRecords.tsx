import React, { useState, useCallback, useRef, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseAuth';

// ============ TYPES ============
export interface HealthRecord {
  id: string;
  userId: string;
  type: 'prescription' | 'lab_report' | 'imaging' | 'discharge_summary' | 'certificate' | 'other';
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  appointmentId?: string;
  doctorName?: string;
  hospitalName?: string;
  recordDate: string;
  uploadedAt: string;
  tags?: string[];
  isSharedWithDoctors?: boolean;
  ocrText?: string;
}

interface HealthRecordsProps {
  userId: string;
  records: HealthRecord[];
  onRecordAdd?: (record: HealthRecord) => Promise<void>;
  onRecordDelete?: (recordId: string) => Promise<void>;
  onRecordUpdate?: (record: HealthRecord) => Promise<void>;
  readOnly?: boolean;
}

// ============ CONSTANTS ============
const RECORD_TYPES = [
  { value: 'prescription', label: 'প্রেসক্রিপশন', labelEn: 'Prescription', icon: '📋' },
  { value: 'lab_report', label: 'ল্যাব রিপোর্ট', labelEn: 'Lab Report', icon: '🔬' },
  { value: 'imaging', label: 'ইমেজিং', labelEn: 'X-Ray/CT/MRI', icon: '🩻' },
  { value: 'discharge_summary', label: 'ডিসচার্জ সামারি', labelEn: 'Discharge Summary', icon: '🏥' },
  { value: 'certificate', label: 'সার্টিফিকেট', labelEn: 'Medical Certificate', icon: '📄' },
  { value: 'other', label: 'অন্যান্য', labelEn: 'Other', icon: '📁' },
];

// ============ HEALTH RECORDS COMPONENT ============
export const HealthRecords: React.FC<HealthRecordsProps> = ({
  userId,
  records,
  onRecordAdd,
  onRecordDelete,
  onRecordUpdate,
  readOnly = false,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    type: 'prescription' as HealthRecord['type'],
    title: '',
    description: '',
    doctorName: '',
    hospitalName: '',
    recordDate: new Date().toISOString().split('T')[0],
    tags: '',
    isSharedWithDoctors: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    // Filter by type
    if (activeTab !== 'all') {
      result = result.filter(r => r.type === activeTab);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.doctorName?.toLowerCase().includes(query) ||
        r.hospitalName?.toLowerCase().includes(query) ||
        r.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [records, activeTab, searchQuery, sortBy, sortOrder]);

  // Stats by type
  const recordStats = useMemo(() => {
    const stats: Record<string, number> = { all: records.length };
    records.forEach(r => {
      stats[r.type] = (stats[r.type] || 0) + 1;
    });
    return stats;
  }, [records]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('ফাইলের সাইজ ১০MB এর কম হতে হবে');
        return;
      }
      setSelectedFile(file);
      // Auto-fill title from filename
      if (!uploadForm.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  }, [uploadForm.title]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !uploadForm.title) {
      alert('ফাইল এবং শিরোনাম প্রয়োজন');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileUrl = '';
      let fileName = selectedFile.name;
      let fileSize = selectedFile.size;
      let mimeType = selectedFile.type;

      // Upload to Supabase Storage if configured
      if (isSupabaseConfigured()) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;

        setUploadProgress(30);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('health-records')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        setUploadProgress(70);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('health-records')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      } else {
        // For demo/development, convert to base64
        fileUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      setUploadProgress(90);

      // Create record
      const newRecord: HealthRecord = {
        id: `record-${Date.now()}`,
        userId,
        type: uploadForm.type,
        title: uploadForm.title,
        description: uploadForm.description,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        doctorName: uploadForm.doctorName,
        hospitalName: uploadForm.hospitalName,
        recordDate: uploadForm.recordDate,
        uploadedAt: new Date().toISOString(),
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isSharedWithDoctors: uploadForm.isSharedWithDoctors,
      };

      if (onRecordAdd) {
        await onRecordAdd(newRecord);
      }

      setUploadProgress(100);

      // Reset form
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({
        type: 'prescription',
        title: '',
        description: '',
        doctorName: '',
        hospitalName: '',
        recordDate: new Date().toISOString().split('T')[0],
        tags: '',
        isSharedWithDoctors: true,
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('আপলোড করতে সমস্যা হয়েছে');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, uploadForm, userId, onRecordAdd]);

  // Handle delete
  const handleDelete = useCallback(async (recordId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই রেকর্ড মুছে ফেলতে চান?')) return;
    
    if (onRecordDelete) {
      await onRecordDelete(recordId);
    }
  }, [onRecordDelete]);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get record type info
  const getRecordTypeInfo = (type: string) => {
    return RECORD_TYPES.find(rt => rt.value === type) || RECORD_TYPES[5];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">📁 স্বাস্থ্য রেকর্ড</h2>
          <p className="text-sm text-slate-500">আপনার সব মেডিকেল ডকুমেন্ট এক জায়গায়</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            📤 আপলোড করুন
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{recordStats.all || 0}</div>
          <div className="text-sm text-slate-500">মোট রেকর্ড</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-blue-400">
          <div className="text-3xl font-bold text-blue-600">{recordStats.prescription || 0}</div>
          <div className="text-sm text-slate-500">প্রেসক্রিপশন</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-purple-400">
          <div className="text-3xl font-bold text-purple-600">{recordStats.lab_report || 0}</div>
          <div className="text-sm text-slate-500">ল্যাব রিপোর্ট</div>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-teal-400">
          <div className="text-3xl font-bold text-teal-600">{recordStats.imaging || 0}</div>
          <div className="text-sm text-slate-500">ইমেজিং</div>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="glass-card p-2 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          সব ({recordStats.all || 0})
        </button>
        {RECORD_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setActiveTab(type.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === type.value
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
            {recordStats[type.value] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === type.value ? 'bg-white/30' : 'bg-slate-200'
              }`}>
                {recordStats[type.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Sort */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="রেকর্ড খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 rounded-lg"
          >
            <option value="date">তারিখ অনুসারে</option>
            <option value="type">ধরন অনুসারে</option>
            <option value="name">নাম অনুসারে</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filteredRecords.map(record => {
          const typeInfo = getRecordTypeInfo(record.type);
          return (
            <div key={record.id} className="glass-card p-4 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                  {typeInfo.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 truncate">{record.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{typeInfo.label}</span>
                        <span>📅 {formatDate(record.recordDate)}</span>
                        {record.doctorName && <span>👨‍⚕️ {record.doctorName}</span>}
                      </div>
                      {record.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{record.description}</p>
                      )}
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {record.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {record.fileUrl && (
                        <a
                          href={record.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          👁️
                        </a>
                      )}
                      {!readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                          }}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File info */}
                  {record.fileName && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>📎 {record.fileName}</span>
                      <span>{formatFileSize(record.fileSize)}</span>
                      {record.isSharedWithDoctors && (
                        <span className="text-green-600">✓ ডাক্তারদের সাথে শেয়ার করা হয়েছে</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRecords.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো রেকর্ড নেই</h3>
            <p className="text-slate-500 mb-4">আপনার মেডিকেল ডকুমেন্ট আপলোড করুন</p>
            {!readOnly && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                📤 প্রথম রেকর্ড আপলোড করুন
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">📤 নতুন রেকর্ড আপলোড</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
              >
                {selectedFile ? (
                  <div>
                    <div className="text-4xl mb-2">📄</div>
                    <p className="font-medium text-slate-700">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-slate-600">ফাইল নির্বাচন করতে ক্লিক করুন</p>
                    <p className="text-sm text-slate-400 mt-1">PDF, JPG, PNG (সর্বোচ্চ ১০MB)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Record Type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">ধরন</label>
                <div className="grid grid-cols-3 gap-2">
                  {RECORD_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setUploadForm(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-3 rounded-lg text-center transition ${
                        uploadForm.type === type.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <div className="text-xl">{type.icon}</div>
                      <div className="text-xs mt-1">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">শিরোনাম *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="যেমন: রক্ত পরীক্ষার রিপোর্ট"
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">রেকর্ডের তারিখ</label>
                <input
                  type="date"
                  value={uploadForm.recordDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, recordDate: e.target.value }))}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Doctor & Hospital */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">ডাক্তারের নাম</label>
                  <input
                    type="text"
                    value={uploadForm.doctorName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, doctorName: e.target.value }))}
                    placeholder="ঐচ্ছিক"
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">হাসপাতাল/ল্যাব</label>
                  <input
                    type="text"
                    value={uploadForm.hospitalName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, hospitalName: e.target.value }))}
                    placeholder="ঐচ্ছিক"
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">বিবরণ</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="এই রেকর্ড সম্পর্কে কিছু লিখুন..."
                  rows={2}
                  className="w-full p-3 border border-slate-200 rounded-lg resize-none"
                />
              </div>

              {/* Share with doctors */}
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadForm.isSharedWithDoctors}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, isSharedWithDoctors: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <div className="font-medium text-slate-700">ডাক্তারদের সাথে শেয়ার করুন</div>
                  <div className="text-sm text-slate-500">আপনার ডাক্তাররা এই রেকর্ড দেখতে পারবেন</div>
                </div>
              </label>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>আপলোড হচ্ছে...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !uploadForm.title}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isUploading ? '⏳ আপলোড হচ্ছে...' : '📤 আপলোড করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;

