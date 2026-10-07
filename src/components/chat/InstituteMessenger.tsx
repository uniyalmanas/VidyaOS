import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Hash,
  Send,
  Smile,
  Paperclip,
  Search,
  Plus,
  Users,
  Lock,
  Megaphone,
  MessageSquare,
  HelpCircle,
  FileText,
  Pin,
  Check,
  X,
  Sparkles,
  ChevronDown,
  UserCheck,
  HeartHandshake,
  GraduationCap,
  Shield,
  Download,
  AlertCircle
} from 'lucide-react';
import { ChatChannel, ChatMessage, ChatMessageTag, UserRole } from '../../types';
import { ConsoleButton, ConsoleCard, StatusChip } from '../ui';
import { uploadFileToStorage } from '../../lib/firebase';

interface InstituteMessengerProps {
  initialChannelId?: string;
  defaultChannelFilter?: 'all' | 'batch' | 'direct' | 'faculty';
  className?: string;
}

export const InstituteMessenger: React.FC<InstituteMessengerProps> = ({
  initialChannelId,
  defaultChannelFilter = 'all',
  className = ''
}) => {
  const {
    currentOrg,
    currentUser,
    chatChannels,
    chatMessages,
    activeChatChannelId,
    setActiveChatChannelId,
    sendChatMessage,
    addChatReaction,
    createChatChannel,
    batches,
    showToast
  } = useApp();

  const [activeChannelId, setLocalActiveChannelId] = useState<string>(
    initialChannelId || activeChatChannelId || chatChannels[0]?.id || ''
  );

  const [messageInput, setMessageInput] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<ChatMessageTag>('general');
  const [channelSearch, setChannelSearch] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<ChatMessageTag | 'all'>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState<boolean>(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; type: 'pdf' | 'image' | 'doc'; url?: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  // New channel form state
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newChannelDisplayName, setNewChannelDisplayName] = useState<string>('');
  const [newChannelType, setNewChannelType] = useState<ChatChannel['type']>('batch');
  const [newChannelDesc, setNewChannelDesc] = useState<string>('');
  const [newChannelPrivate, setNewChannelPrivate] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync active channel
  useEffect(() => {
    if (initialChannelId) {
      setLocalActiveChannelId(initialChannelId);
    } else if (activeChatChannelId) {
      setLocalActiveChannelId(activeChatChannelId);
    }
  }, [initialChannelId, activeChatChannelId, currentOrg.id]);

  // Resolve to the active channel for this org only. Falls back to the first
  // channel once Firestore has streamed them in; may legitimately be undefined
  // while loading, so callers must null-check.
  const activeChannel =
    chatChannels.find(c => c.id === activeChannelId && c.orgId === currentOrg.id) ||
    chatChannels.find(c => c.orgId === currentOrg.id);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChannelId]);

  // Filter messages for active channel
  const channelMessages = chatMessages.filter(m => {
    if (m.channelId !== activeChannel?.id) return false;
    if (tagFilter !== 'all' && m.tag !== tagFilter) return false;
    return true;
  });

  // Filter channels by search
  const filteredChannels = chatChannels.filter(c => {
    if (!channelSearch.trim()) return true;
    const q = channelSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q);
  });

  // Group channels by type
  const announcementChannels = filteredChannels.filter(c => c.type === 'announcements');
  const batchChannels = filteredChannels.filter(c => c.type === 'batch');
  const directChannels = filteredChannels.filter(c => c.type === 'direct');
  const facultyChannels = filteredChannels.filter(c => c.type === 'faculty');

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChannel) return;
    if (!messageInput.trim() && !attachedFile) return;

    const attachments = attachedFile ? [attachedFile] : undefined;
    const saved = await sendChatMessage(activeChannel.id, messageInput.trim(), selectedTag, attachments);

    // Keep the draft if the cloud write failed so the message isn't lost.
    if (!saved) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setMessageInput('');
    setAttachedFile(null);
    setSelectedTag('general');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Real attachment upload. The paperclip used to fabricate a hard-coded file
   * ("Class_..._FormulaNotes.pdf", 412 KB) without ever opening a picker — so a
   * message claimed to carry a PDF that did not exist and could not be
   * downloaded by anyone. Now it opens a picker and uploads for real.
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!activeChannel || !currentOrg.id) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const type: 'pdf' | 'image' | 'doc' =
      ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? 'image' : 'doc';

    if (file.size > 10 * 1024 * 1024) {
      showToast('Attachments must be under 10 MB.', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `chat/${currentOrg.id}/${Date.now()}_${safeName}`;
      const url = await uploadFileToStorage(path, file, file.type || undefined);
      setAttachedFile({
        name: file.name,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        type,
        url
      });
      if (inputRef.current) inputRef.current.focus();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Attachment upload failed:', error);
      showToast(
        'Attachment upload failed. Cloud Storage may not be enabled for this project yet.',
        'error'
      );
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelDisplayName.trim()) return;

    const slug = newChannelName.trim()
      ? newChannelName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : newChannelDisplayName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const created = createChatChannel({
      name: slug,
      displayName: newChannelDisplayName,
      type: newChannelType,
      description: newChannelDesc || `Discussion channel for ${newChannelDisplayName}`,
      isPrivate: newChannelPrivate,
      allowedRoles: newChannelPrivate ? ['CENTER_ADMIN', 'TEACHER'] : undefined
    });

    setLocalActiveChannelId(created.id);
    setActiveChatChannelId(created.id);
    setShowNewChannelModal(false);
    setNewChannelName('');
    setNewChannelDisplayName('');
    setNewChannelDesc('');
    setNewChannelPrivate(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
            <GraduationCap className="w-3 h-3 text-amber-600" />
            Teacher
          </span>
        );
      case 'CENTER_ADMIN':
      case 'PLATFORM_OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/40">
            <Shield className="w-3 h-3 text-blue-600" />
            Admin
          </span>
        );
      case 'PARENT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
            <HeartHandshake className="w-3 h-3 text-emerald-600" />
            Parent
          </span>
        );
      case 'STUDENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/40">
            Student
          </span>
        );
    }
  };

  const getTagBadge = (tag?: ChatMessageTag) => {
    if (!tag || tag === 'general') return null;
    switch (tag) {
      case 'doubt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
            ❓ Doubt
          </span>
        );
      case 'homework':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
            📚 Homework
          </span>
        );
      case 'notice':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            📢 Notice
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
            🚨 Urgent
          </span>
        );
      default:
        return null;
    }
  };

  const quickEmojis = ['👍', '❤️', '💡', '👏', '❓', '🎯', '🙏'];

  return (
    <div className={`flex flex-col md:flex-row h-[720px] rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] overflow-hidden shadow-xl ${className}`}>
      {/* 1. LEFT SLACK-STYLE CHANNELS SIDEBAR */}
      <div className="w-full md:w-72 bg-[#F8F9FA] dark:bg-[#202124] border-r border-[#DADCE0] dark:border-[#3C4043] flex flex-col flex-shrink-0">
        {/* Workspace Brand Header */}
        <div className="p-3.5 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-google-sans font-bold text-sm text-[#202124] dark:text-[#E8EAED] truncate">
                {currentOrg.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                VidyaChat · Slack for Education
              </span>
            </div>
          </div>
          {(currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'TEACHER') && (
            <button
              onClick={() => setShowNewChannelModal(true)}
              className="p-1.5 rounded-lg hover:bg-[#E8EAED] dark:hover:bg-[#303134] text-[#5F6368] dark:text-[#9AA0A6] transition cursor-pointer"
              title="Create New Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Channel Search */}
        <div className="p-2.5 border-b border-[#DADCE0]/60 dark:border-[#3C4043]/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#80868B]" />
            <input
              type="text"
              value={channelSearch}
              onChange={e => setChannelSearch(e.target.value)}
              placeholder="Jump to channel or batch..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] placeholder-[#80868B] focus:outline-none focus:ring-1 focus:ring-[#FFA000]"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4 text-xs">
          {/* Announcements */}
          {announcementChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] flex items-center justify-between">
                <span>Announcements</span>
                <span className="text-[9px] font-mono">{announcementChannels.length}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {announcementChannels.map(ch => {
                  const isActive = ch.id === activeChannel?.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setLocalActiveChannelId(ch.id);
                        setActiveChatChannelId(ch.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#188038] text-white font-bold shadow-xs'
                          : 'hover:bg-[#E8EAED] dark:hover:bg-[#282A2C] text-[#3C4043] dark:text-[#C4C7C5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Megaphone className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#188038]'}`} />
                        <span className="truncate">{ch.displayName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Batch Channels */}
          {batchChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] flex items-center justify-between">
                <span>Batch & Class Groups</span>
                <span className="text-[9px] font-mono">{batchChannels.length}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {batchChannels.map(ch => {
                  const isActive = ch.id === activeChannel?.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setLocalActiveChannelId(ch.id);
                        setActiveChatChannelId(ch.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#FFA000] text-slate-950 font-bold shadow-xs'
                          : 'hover:bg-[#E8EAED] dark:hover:bg-[#282A2C] text-[#3C4043] dark:text-[#C4C7C5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-[#FFA000]'}`} />
                        <span className="truncate">{ch.displayName}</span>
                      </div>
                      {ch.unreadCount && ch.unreadCount > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                          {ch.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct & Parent Desk */}
          {directChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] flex items-center justify-between">
                <span>Parent-Teacher Desk</span>
                <span className="text-[9px] font-mono">{directChannels.length}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {directChannels.map(ch => {
                  const isActive = ch.id === activeChannel?.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setLocalActiveChannelId(ch.id);
                        setActiveChatChannelId(ch.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#1A73E8] text-white font-bold shadow-xs'
                          : 'hover:bg-[#E8EAED] dark:hover:bg-[#282A2C] text-[#3C4043] dark:text-[#C4C7C5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <HeartHandshake className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#1A73E8]'}`} />
                        <span className="truncate">{ch.displayName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Faculty Only (Hidden from parents and students) */}
          {facultyChannels.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] flex items-center justify-between">
                <span>Staff & Faculty</span>
                <Lock className="w-3 h-3 text-[#80868B]" />
              </div>
              <div className="space-y-0.5 mt-0.5">
                {facultyChannels.map(ch => {
                  const isActive = ch.id === activeChannel?.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setLocalActiveChannelId(ch.id);
                        setActiveChatChannelId(ch.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#7C3AED] text-white font-bold shadow-xs'
                          : 'hover:bg-[#E8EAED] dark:hover:bg-[#282A2C] text-[#3C4043] dark:text-[#C4C7C5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#7C3AED]'}`} />
                        <span className="truncate">{ch.displayName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Current User Active Identity Pill */}
        <div className="p-3 border-t border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
            />
            <div className="truncate">
              <div className="font-bold text-xs text-[#202124] dark:text-[#E8EAED] truncate leading-tight">
                {currentUser.name}
              </div>
              <div className="mt-0.5">
                {getRoleBadge(currentUser.role)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CHAT CANVAS & THREAD */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1E1F20]">
        {/* Top Channel Header */}
        <div className="px-5 py-3.5 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-[#FFA000]" />
              <h2 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED] truncate">
                {activeChannel?.displayName || 'Channel'}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 select-none">
                <Shield className="w-2.5 h-2.5 text-emerald-600" />
                {currentOrg.name} Isolated
              </span>
              {activeChannel?.isPrivate && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Staff Only
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] truncate mt-0.5">
              {activeChannel?.description}
            </p>
          </div>

          {/* Tag Filter Pills */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-[#80868B] uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'doubt', label: '❓ Doubts' },
              { id: 'homework', label: '📚 Homework' },
              { id: 'notice', label: '📢 Notices' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTagFilter(t.id as any)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  tagFilter === t.id
                    ? 'bg-[#202124] dark:bg-[#E8EAED] text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-[#F1F3F4] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#E8EAED]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Feed Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Welcome Banner */}
          <div className="text-center py-4 border-b border-[#DADCE0]/50 dark:border-[#3C4043]/50 mb-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-[#FFA000] mb-2">
              <Hash className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
              Welcome to {activeChannel?.displayName}!
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-md mx-auto mt-0.5">
              This is the official discussion room for {currentOrg.name}. Ask questions, share problem solutions, and collaborate freely.
            </p>
          </div>

          {/* Messages */}
          {channelMessages.map(msg => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 group hover:bg-[#F8F9FA] dark:hover:bg-[#242628] p-2.5 rounded-xl transition -mx-2.5"
              >
                {/* Avatar */}
                <img
                  src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={msg.senderName}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[#DADCE0] dark:border-[#3C4043]"
                />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-[#202124] dark:text-[#E8EAED]">
                      {msg.senderName}
                    </span>
                    {getRoleBadge(msg.senderRole)}
                    {getTagBadge(msg.tag)}
                    <span className="text-[10px] text-[#80868B]">
                      {msg.createdAt}
                    </span>
                    {msg.pinned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <p className="text-xs text-[#3C4043] dark:text-[#E8EAED] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-1.5 flex flex-wrap gap-2">
                      {msg.attachments.map((att, idx) => {
                        const card = (
                          <>
                            <FileText className="w-4 h-4 text-rose-500" />
                            <div>
                              <div className="font-semibold text-xs text-[#202124] dark:text-[#E8EAED]">{att.name}</div>
                              {att.size && <div className="text-[10px] text-[#80868B]">{att.size}</div>}
                            </div>
                            <Download className="w-3.5 h-3.5 text-[#5F6368] ml-2" />
                          </>
                        );
                        const cardClass =
                          'flex items-center gap-2 p-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-xs hover:border-[#FFA000] transition shadow-2xs';

                        return att.url ? (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`${cardClass} cursor-pointer`}
                            title={`Open ${att.name}`}
                          >
                            {card}
                          </a>
                        ) : (
                          <div
                            key={idx}
                            className={`${cardClass} opacity-70 cursor-not-allowed`}
                            title="File link unavailable"
                          >
                            {card}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Emoji Reactions Pill Bar */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {msg.reactions &&
                      Object.entries(msg.reactions).map(([emoji, users]) => {
                        const hasReacted = users.includes(currentUser.id || currentUser.name);
                        return (
                          <button
                            key={emoji}
                            onClick={() => addChatReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition cursor-pointer border ${
                              hasReacted
                                ? 'bg-amber-100 dark:bg-amber-950/60 border-[#FFA000] text-amber-900 dark:text-amber-200 font-bold'
                                : 'bg-[#F1F3F4] dark:bg-[#282A2C] border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:border-[#BDC1C6]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[11px] font-mono">{users.length}</span>
                          </button>
                        );
                      })}

                    {/* Quick Reaction Hover Bar */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pl-1">
                      {quickEmojis.slice(0, 4).map(em => (
                        <button
                          key={em}
                          onClick={() => addChatReaction(msg.id, em)}
                          className="p-1 rounded hover:bg-[#E8EAED] dark:hover:bg-[#303134] text-xs transition cursor-pointer"
                          title={`React with ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. RICH SLACK-GRADE COMPOSER */}
        <div className="p-3.5 border-t border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#202124]">
          {/* Tag Selector & Post-as banner */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#80868B] uppercase">Tag Message:</span>
              {[
                { tag: 'general', label: '💬 General' },
                { tag: 'doubt', label: '❓ Ask Doubt' },
                { tag: 'homework', label: '📚 Homework' },
                { tag: 'notice', label: '📢 Notice' }
              ].map(t => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setSelectedTag(t.tag as any)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    selectedTag === t.tag
                      ? 'bg-[#FFA000] text-slate-950 font-bold shadow-2xs'
                      : 'bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] hidden sm:inline">
              Sending as <strong className="text-[#202124] dark:text-[#E8EAED]">{currentUser.name}</strong>
            </span>
          </div>

          {/* Attachment Preview Chip */}
          {attachedFile && (
            <div className="mb-2 flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#282A2C] border border-[#FFA000] text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FFA000]" />
                <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{attachedFile.name}</span>
                <span className="text-[10px] text-[#80868B]">({attachedFile.size})</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-[#F1F3F4] dark:hover:bg-[#3C4043] rounded"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          )}

          {/* Input Box & Toolbar */}
          <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] focus-within:ring-2 focus-within:ring-[#FFA000]/40 focus-within:border-[#FFA000] transition">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={`Message #${activeChannel?.name || 'channel'}... (Enter to send, Shift+Enter for new line)`}
              className="w-full p-3 bg-transparent text-xs text-[#202124] dark:text-[#E8EAED] placeholder-[#80868B] focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-[#DADCE0]/50 dark:border-[#3C4043]/50">
              <div className="flex items-center gap-1.5 relative">
                {/* Real file attachment — opens a picker and uploads to Cloud Storage */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile || !activeChannel}
                  className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isUploadingFile ? 'Uploading…' : 'Attach a file (PDF, image or document)'}
                >
                  <Paperclip className={`w-4 h-4 ${isUploadingFile ? 'animate-pulse' : ''}`} />
                </button>

                {/* Emoji Bar Dropdown */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition cursor-pointer"
                  title="Add Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-2 shadow-xl flex gap-1 z-20">
                    {quickEmojis.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setMessageInput(prev => prev + em);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1.5 hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] rounded text-base"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!messageInput.trim() && !attachedFile}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  messageInput.trim() || attachedFile
                    ? 'bg-[#188038] text-white hover:bg-[#137333] shadow-xs'
                    : 'bg-[#F1F3F4] dark:bg-[#282A2C] text-[#80868B] cursor-not-allowed'
                }`}
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CREATE CHANNEL MODAL */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-2xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADCE0] dark:border-[#3C4043]">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-[#FFA000]" />
                <h3 className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                  Create Channel
                </h3>
              </div>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="p-1 hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Channel Title *
                </label>
                <input
                  type="text"
                  required
                  value={newChannelDisplayName}
                  onChange={e => setNewChannelDisplayName(e.target.value)}
                  placeholder="e.g. Class 12 JEE Physics Doubts"
                  className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:ring-2 focus:ring-[#FFA000]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Channel Slug
                </label>
                <div className="flex items-center rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] px-3 py-2">
                  <span className="text-[#80868B] mr-1">#</span>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="c12-jee-physics"
                    className="w-full bg-transparent text-[#202124] dark:text-[#E8EAED] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Channel Category
                </label>
                <select
                  value={newChannelType}
                  onChange={e => setNewChannelType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:ring-2 focus:ring-[#FFA000]"
                >
                  <option value="batch">Batch / Class Doubts</option>
                  <option value="direct">Parent-Teacher Desk</option>
                  <option value="announcements">Institute Announcements</option>
                  <option value="faculty">Faculty & Staff Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Description / Topic
                </label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Daily doubt clearing, problem solving and tests discussion"
                  className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:ring-2 focus:ring-[#FFA000]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privChannel"
                  checked={newChannelPrivate}
                  onChange={e => setNewChannelPrivate(e.target.checked)}
                  className="rounded border-[#DADCE0] text-[#FFA000] focus:ring-[#FFA000]"
                />
                <label htmlFor="privChannel" className="text-xs text-[#202124] dark:text-[#E8EAED] font-medium cursor-pointer">
                  Private Channel (Only Faculty and Admins can view)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  type="submit"
                >
                  Create Channel
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
