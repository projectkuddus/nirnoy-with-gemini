import React, { useState, useCallback, useRef } from 'react';

// ============ TYPES ============
export interface UploadedDocument {
  id: string;
  name: string;
  type: 'prescription' | 'lab_report' | 'imaging' | 'discharge_summary' | 'other';
  category: string;
  date: string;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  
  // OCR Data
  ocrText?: string;
  ocrProcessed?: boolean;
  ocrConfidence?: number;
  
  // Metadata
  doctorName?: string;
  hospitalName?: string;
  appointmentId?: string;
  notes?: string;
  tags?: string[];
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onUpload: (files: File[], metadata: Partial<UploadedDocument>) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>;
  onView?: (document: UploadedDocument) => void;
  onShare?: (document: UploadedDocument) => void;
  maxFileSizeMB?: number;
}

// ============ DOCUMENT TYPES ============
const DOCUMENT_TYPES = [
  { value: 'prescription', label: 'প্রেসক্রিপশন', icon: '💊' },
  { value: 'lab_report', label: 'ল্যাব রিপোর্ট', icon: '🔬' },
  { value: 'imaging', label: 'ইমেজিং (X-Ray, MRI, CT)', icon: '🏥' },
  { value: 'discharge_summary', label: 'ডিসচার্জ সামারি', icon: '📋' },
  { value: 'other', label: 'অন্যান্য', icon: '📄' },
];

// ============ DOCUMENT UPLOAD COMPONENT ============
export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documents,
  onUpload,
  onDelete,
  onView,
  onShare,
  maxFileSizeMB = 10,
}) => {
  // State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>('prescription');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const typeMatch = filter === 'all' || doc.type === filter;
    const searchMatch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospitalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.ocrText?.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    validateAndSetFiles(files);
  }, []);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndSetFiles(files);
  }, []);

  // Validate files
  const validateAndSetFiles = (files: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of files) {
      // Check size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`ফাইল "${file.name}" ${maxFileSizeMB}MB এর বেশি`);
        continue;
      }
      
      // Check type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError(`ফাইল "${file.name}" সমর্থিত নয়। JPG, PNG, WebP বা PDF ব্যবহার করুন।`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onUpload(selectedFiles, {
        type: documentType as any,
        date: documentDate,
        doctorName: doctorName || undefined,
        hospitalName: hospitalName || undefined,
        notes: notes || undefined,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form
      setTimeout(() => {
        setSelectedFiles([]);
        setDoctorName('');
        setHospitalName('');
        setNotes('');
        setUploadProgress(0);
        setUploading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'আপলোড ব্যর্থ হয়েছে');
      setUploading(false);
    }
  }, [selectedFiles, documentType, documentDate, doctorName, hospitalName, notes, onUpload]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get type config
  const getTypeConfig = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[4];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📁 ডকুমেন্ট ম্যানেজমেন্ট</h2>
          <p className="text-slate-500">আপনার মেডিকেল ডকুমেন্ট আপলোড ও সংরক্ষণ করুন</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <span>📤</span>
          <span>আপলোড করুন</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`glass-card p-8 border-2 border-dashed transition ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            ফাইল টেনে এনে ছাড়ুন বা ক্লিক করুন
          </h3>
          <p className="text-slate-500 mb-4">
            JPG, PNG, WebP বা PDF • সর্বোচ্চ {maxFileSizeMB}MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            ফাইল নির্বাচন করুন
          </button>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-700 mb-4">
            📎 নির্বাচিত ফাইল ({selectedFiles.length})
          </h3>

          {/* File List */}
          <div className="space-y-2 mb-4">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 glass-subtle rounded-lg">
                <span className="text-2xl">
                  {file.type.includes('pdf') ? '📕' : '🖼️'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 truncate">{file.name}</div>
                  <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                </div>
                <button
                  onClick={() => removeSelectedFile(idx)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Metadata Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ডকুমেন্টের ধরন</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">তারিখ</label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ডাক্তারের নাম (ঐচ্ছিক)</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="ডাক্তারের নাম"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">হাসপাতাল/ল্যাব (ঐচ্ছিক)</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="হাসপাতাল বা ল্যাবের নাম"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">নোট (ঐচ্ছিক)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="এই ডকুমেন্ট সম্পর্কে কোনো নোট..."
              rows={2}
              className="w-full p-2 border border-slate-200 rounded-lg resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>আপলোড হচ্ছে...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
          >
            {uploading ? '⏳ আপলোড হচ্ছে...' : '📤 আপলোড করুন'}
          </button>
        </div>
      )}

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
              placeholder="ডকুমেন্ট খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 glass-subtle rounded-lg border-0"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'glass-subtle text-slate-600 hover:bg-slate-100'
              }`}
            >
              সব ({documents.length})
            </button>
            {DOCUMENT_TYPES.map(type => {
              const count = documents.filter(d => d.type === type.value).length;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
                    filter === type.value
                      ? 'bg-blue-500 text-white'
                      : 'glass-subtle text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type.icon} {type.label} ({count})
                </button>
              );
            })}
          </div>

          {/* View Toggle */}
          <div className="flex glass-subtle rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-600'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-600'}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => {
            const typeConfig = getTypeConfig(doc.type);

            return (
              <div
                key={doc.id}
                className="glass-card p-4 cursor-pointer hover:shadow-lg transition group"
                onClick={() => onView ? onView(doc) : setSelectedDocument(doc)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {doc.thumbnailUrl ? (
                    <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{typeConfig.icon}</span>
                  )}
                </div>

                {/* Info */}
                <div className="truncate font-medium text-slate-700 mb-1">{doc.name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{typeConfig.label}</span>
                  <span>•</span>
                  <span>{new Date(doc.date).toLocaleDateString('bn-BD')}</span>
                </div>

                {/* OCR Badge */}
                {doc.ocrProcessed && (
                  <div className="mt-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      ✓ OCR
                    </span>
                  </div>
                )}

                {/* Actions (visible on hover) */}
                <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(doc);
                      }}
                      className="flex-1 py-1.5 glass-subtle text-slate-600 text-xs rounded hover:bg-slate-100"
                    >
                      📤 শেয়ার
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('এই ডকুমেন্ট মুছে ফেলতে চান?')) {
                          onDelete(doc.id);
                        }
                      }}
                      className="px-3 py-1.5 text-red-500 text-xs rounded hover:bg-red-50"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ধরন</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">নাম</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">তারিখ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">ডাক্তার</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">সাইজ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map(doc => {
                const typeConfig = getTypeConfig(doc.type);

                return (
                  <tr key={doc.id} className="hover:bg-blue-50/30 transition cursor-pointer" onClick={() => onView ? onView(doc) : setSelectedDocument(doc)}>
                    <td className="px-4 py-3">
                      <span className="text-2xl">{typeConfig.icon}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{doc.name}</div>
                      {doc.ocrProcessed && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          ✓ OCR
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(doc.date).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {doc.doctorName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onView ? onView(doc) : setSelectedDocument(doc);
                          }}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                        >
                          দেখুন
                        </button>
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('মুছে ফেলতে চান?')) onDelete(doc.id);
                            }}
                            className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-sm"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">কোনো ডকুমেন্ট নেই</h3>
          <p className="text-slate-500 mb-4">আপনার মেডিকেল ডকুমেন্ট আপলোড করুন</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            📤 আপলোড করুন
          </button>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{selectedDocument.name}</h3>
                <p className="text-sm text-slate-500">
                  {getTypeConfig(selectedDocument.type).label} • {new Date(selectedDocument.date).toLocaleDateString('bn-BD')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100">
              {selectedDocument.mimeType?.includes('pdf') ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-full min-h-[500px] rounded-lg"
                />
              ) : (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="max-w-full max-h-full mx-auto rounded-lg shadow"
                />
              )}
            </div>

            {/* OCR Text */}
            {selectedDocument.ocrText && (
              <div className="p-4 border-t border-slate-200 max-h-48 overflow-y-auto">
                <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  🔍 OCR টেক্সট
                  {selectedDocument.ocrConfidence && (
                    <span className="text-xs text-slate-500">
                      ({selectedDocument.ocrConfidence}% নির্ভুলতা)
                    </span>
                  )}
                </h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {selectedDocument.ocrText}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              {onShare && (
                <button
                  onClick={() => {
                    onShare(selectedDocument);
                    setSelectedDocument(null);
                  }}
                  className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  📤 ডাক্তারের সাথে শেয়ার
                </button>
              )}
              <a
                href={selectedDocument.url}
                download={selectedDocument.name}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                📥 ডাউনলোড
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;

