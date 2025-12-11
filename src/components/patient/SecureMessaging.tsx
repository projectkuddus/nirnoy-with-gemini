import React, { useState, useRef, useEffect, useMemo } from 'react';

// ============ TYPES ============
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'patient' | 'doctor';
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'prescription' | 'appointment';
  attachments?: Attachment[];
  createdAt: string;
  readAt?: string;
  metadata?: {
    prescriptionId?: string;
    appointmentId?: string;
    fileUrl?: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  url: string;
  size: number;
}

export interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorPhoto?: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'blocked';
}

interface SecureMessagingProps {
  conversations: Conversation[];
  activeConversation?: Conversation;
  messages: Message[];
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  onSendMessage: (conversationId: string, content: string, type: Message['type'], attachments?: File[]) => Promise<void>;
  onLoadMoreMessages: (conversationId: string) => void;
  onMarkAsRead: (messageId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onStartNewConversation?: (doctorId: string) => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
}

// ============ COMPONENT ============
export const SecureMessaging: React.FC<SecureMessagingProps> = ({
  conversations,
  activeConversation,
  messages,
  currentUserId,
  onSelectConversation,
  onSendMessage,
  onLoadMoreMessages,
  onMarkAsRead,
  onArchiveConversation,
  onStartNewConversation,
  isLoading = false,
  hasMoreMessages = false,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (activeConversation) {
      messages
        .filter(m => m.senderType === 'doctor' && !m.readAt)
        .forEach(m => onMarkAsRead(m.id));
    }
  }, [messages, activeConversation, onMarkAsRead]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(c =>
      c.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.doctorNameBn?.includes(searchQuery) ||
      c.doctorSpecialty.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Sort conversations by last message
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [filteredConversations]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    
    messages.forEach(m => {
      const date = new Date(m.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'আজ';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'গতকাল';
      } else {
        key = date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    
    return groups;
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (!activeConversation) return;
    
    setIsSending(true);
    try {
      await onSendMessage(
        activeConversation.id,
        messageInput,
        selectedFiles.length > 0 ? 'file' : 'text',
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      setMessageInput('');
      setSelectedFiles([]);
    } finally {
      setIsSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setShowAttachMenu(false);
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Unread total
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] glass-strong rounded-2xl overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-white/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              💬 বার্তা
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="ডাক্তার খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 rounded-xl border-0 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {sortedConversations.length > 0 ? (
            sortedConversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-white/40 transition-all text-left ${
                  activeConversation?.id === conversation.id ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg flex-shrink-0">
                  {conversation.doctorPhoto ? (
                    <img src={conversation.doctorPhoto} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '👨‍⚕️'
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-slate-700 truncate">
                      {conversation.doctorNameBn || conversation.doctorName}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {formatTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{conversation.doctorSpecialty}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 truncate flex-1">
                      {conversation.lastMessage?.content || 'কোনো বার্তা নেই'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">কোনো কথোপকথন নেই</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-white/20 flex items-center justify-between bg-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="font-medium text-slate-700">
                    {activeConversation.doctorNameBn || activeConversation.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500">{activeConversation.doctorSpecialty}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onArchiveConversation(activeConversation.id)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  title="আর্কাইভ করুন"
                >
                  📥
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Load more button */}
              {hasMoreMessages && (
                <button
                  onClick={() => onLoadMoreMessages(activeConversation.id)}
                  className="w-full py-2 text-sm text-blue-600 hover:underline"
                  disabled={isLoading}
                >
                  {isLoading ? 'লোড হচ্ছে...' : 'আরো বার্তা দেখুন'}
                </button>
              )}

              {/* Message Groups */}
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-xs text-slate-400">{date}</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3">
                    {msgs.map(message => {
                      const isOwn = message.senderId === currentUserId;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-slate-700 rounded-bl-sm shadow-sm'
                              }`}
                            >
                              {/* Message Content */}
                              {message.type === 'text' && (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              )}

                              {message.type === 'prescription' && (
                                <div className={`${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span>📋</span>
                                    <span className="font-medium">প্রেসক্রিপশন</span>
                                  </div>
                                  <p className="text-sm">{message.content}</p>
                                </div>
                              )}

                              {message.type === 'appointment' && (
                                <div className={`${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span>📅</span>
                                    <span className="font-medium">অ্যাপয়েন্টমেন্ট</span>
                                  </div>
                                  <p className="text-sm">{message.content}</p>
                                </div>
                              )}

                              {message.type === 'file' && message.attachments && (
                                <div className="space-y-2">
                                  {message.attachments.map(attachment => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 p-2 rounded-lg ${
                                        isOwn ? 'bg-blue-500/50 hover:bg-blue-500/70' : 'bg-slate-100 hover:bg-slate-200'
                                      }`}
                                    >
                                      <span>📎</span>
                                      <span className="text-sm truncate">{attachment.name}</span>
                                    </a>
                                  ))}
                                  {message.content && <p className="text-sm">{message.content}</p>}
                                </div>
                              )}

                              {message.type === 'image' && message.attachments?.[0] && (
                                <div>
                                  <img
                                    src={message.attachments[0].url}
                                    alt=""
                                    className="rounded-lg max-w-full"
                                  />
                                  {message.content && <p className="text-sm mt-2">{message.content}</p>}
                                </div>
                              )}
                            </div>

                            {/* Time & Status */}
                            <div className={`flex items-center gap-1 mt-1 text-xs text-slate-400 ${
                              isOwn ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatTime(message.createdAt)}</span>
                              {isOwn && (
                                <span>{message.readAt ? '✓✓' : '✓'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/20 bg-white/30">
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1 text-sm">
                      <span>📎</span>
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button
                        onClick={() => setSelectedFiles(files => files.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Attach Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                  >
                    📎
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg p-2 space-y-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded flex items-center gap-2"
                      >
                        📁 ফাইল
                      </button>
                      <button
                        onClick={() => {
                          fileInputRef.current?.setAttribute('accept', 'image/*');
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded flex items-center gap-2"
                      >
                        🖼️ ছবি
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Text Input */}
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="বার্তা লিখুন..."
                    className="w-full px-4 py-2 bg-white rounded-xl border-0 resize-none focus:ring-2 focus:ring-blue-500"
                    rows={1}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={isSending || (!messageInput.trim() && selectedFiles.length === 0)}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '📤'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="font-medium">একটি কথোপকথন নির্বাচন করুন</p>
              <p className="text-sm">বাম দিক থেকে একজন ডাক্তার নির্বাচন করুন</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureMessaging;

