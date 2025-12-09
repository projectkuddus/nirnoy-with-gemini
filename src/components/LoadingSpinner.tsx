import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({ size = 'md', text }) => {
  const sizeClasses = { sm: 'w-6 h-6 border-2', md: 'w-10 h-10 border-3', lg: 'w-16 h-16 border-4' };
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="text-sm font-medium text-gray-600">{text}</p>}
    </div>
  );
};

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-2xl font-bold text-blue-600">N</span>
          </div>
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
        <p className="text-gray-400 text-sm mt-1">নির্ণয় হেলথ</p>
      </div>
    </div>
  );
};

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
      <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/2"></div></div>
    </div>
    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-full"></div><div className="h-3 bg-gray-200 rounded w-5/6"></div></div>
  </div>
);

export default LoadingSpinner;
