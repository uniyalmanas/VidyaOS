import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Announcement,
  NotificationItem,
  ChatChannel,
  ChatMessage,
  ChatMessageTag,
  ChatMessageAttachment,
  Organization,
  User,
  Batch
} from '../../types';
import { MOCK_ANNOUNCEMENTS } from '../../data/mockData';
import {
  getDefaultChannelsForOrg,
  getDefaultMessagesForOrg
} from '../../data/mockChatData';
import {
  subscribeToAnnouncements,
  persistAnnouncementToFirestore
} from '../../lib/firestoreService';

export interface CommunicationContextType {
  announcements: Announcement[];
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'orgId' | 'createdAt' | 'createdBy'>) => Announcement;
  notifications: NotificationItem[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  activeChatChannelId: string;
  setActiveChatChannelId: (channelId: string) => void;
  sendChatMessage: (channelId: string, content: string, tag?: ChatMessageTag, attachments?: ChatMessageAttachment[]) => ChatMessage;
  addChatReaction: (messageId: string, emoji: string) => void;
  createChatChannel: (channel: Omit<ChatChannel, 'id' | 'orgId'>) => ChatChannel;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

interface CommunicationProviderProps {
  currentOrg: Organization;
  currentUser: User;
  batches: Batch[];
  selectedBranchId: string;
  isPlatformOwner: boolean;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  children: React.ReactNode;
}

export const CommunicationProvider: React.FC<CommunicationProviderProps> = ({
  currentOrg,
  currentUser,
  batches,
  selectedBranchId,
  isPlatformOwner,
  onShowToast,
  children
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('vidyaos_announcements');
    return saved ? JSON.parse(saved) : MOCK_ANNOUNCEMENTS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      orgId: 'org-apex',
      userId: 'user-parent-rajesh',
      title: 'Monthly Coaching Fee Due',
      message: 'October 2026 fee for Rahul Sharma is pending (₹2,000). Click to pay instantly via UPI.',
      type: 'fee',
      timestamp: '2 hours ago',
      read: false,
      linkTab: 'fees'
    },
    {
      id: 'notif-2',
      orgId: 'org-apex',
      userId: 'user-parent-rajesh',
      title: 'Exam Result Published',
      message: 'Class 10 Math Diagnostic test score is published. Rahul scored 44/50 (Rank 2).',
      type: 'exam',
      timestamp: 'Yesterday',
      read: true,
      linkTab: 'results'
    }
  ]);

  // VidyaChat State
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>(() => {
    const saved = localStorage.getItem(`vidyaos_chat_channels_${currentOrg.id}`);
    if (saved) return JSON.parse(saved);
    const orgBatches = batches.filter(b => b.orgId === currentOrg.id);
    return getDefaultChannelsForOrg(currentOrg.id, currentOrg.name, orgBatches);
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`vidyaos_chat_messages_${currentOrg.id}`);
    if (saved) return JSON.parse(saved);
    return getDefaultMessagesForOrg(currentOrg.id, currentOrg.name, currentOrg.ownerName);
  });

  const [activeChatChannelId, setActiveChatChannelId] = useState<string>(() => {
    const orgBatches = batches.filter(b => b.orgId === currentOrg.id);
    const initialChans = getDefaultChannelsForOrg(currentOrg.id, currentOrg.name, orgBatches);
    return initialChans[0]?.id || 'chan-announcements';
  });

  // Sync announcements
  useEffect(() => {
    localStorage.setItem('vidyaos_announcements', JSON.stringify(announcements));
  }, [announcements]);

  // Real-time Firestore Subscriptions for Announcements
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubAnnouncements = subscribeToAnnouncements(data => {
      if (data) setAnnouncements(data);
    }, targetOrg);

    return () => {
      unsubAnnouncements();
    };
  }, [currentOrg.id, isPlatformOwner]);

  // Strict tenant switch handler for VidyaChat
  useEffect(() => {
    const orgBatches = batches.filter(b => b.orgId === currentOrg.id);
    const savedChans = localStorage.getItem(`vidyaos_chat_channels_${currentOrg.id}`);
    const orgChannels: ChatChannel[] = savedChans
      ? JSON.parse(savedChans)
      : getDefaultChannelsForOrg(currentOrg.id, currentOrg.name, orgBatches);

    setChatChannels(orgChannels);

    const savedMsgs = localStorage.getItem(`vidyaos_chat_messages_${currentOrg.id}`);
    const orgMessages: ChatMessage[] = savedMsgs
      ? JSON.parse(savedMsgs)
      : getDefaultMessagesForOrg(currentOrg.id, currentOrg.name, currentOrg.ownerName);

    setChatMessages(orgMessages);

    if (orgChannels.length > 0) {
      setActiveChatChannelId(orgChannels[0].id);
    }
  }, [currentOrg.id]);

  useEffect(() => {
    if (currentOrg.id) {
      localStorage.setItem(`vidyaos_chat_channels_${currentOrg.id}`, JSON.stringify(chatChannels));
    }
  }, [chatChannels, currentOrg.id]);

  useEffect(() => {
    if (currentOrg.id) {
      localStorage.setItem(`vidyaos_chat_messages_${currentOrg.id}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, currentOrg.id]);

  // Multi-Tenant Isolation
  const tenantAnnouncements = useMemo(() => {
    if (isPlatformOwner) return announcements;
    return announcements.filter(a => a.orgId === currentOrg.id && (!a.branchId || selectedBranchId === 'all' || a.branchId === selectedBranchId));
  }, [announcements, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantChatChannels = useMemo(() => {
    return chatChannels.filter(c => {
      if (c.orgId !== currentOrg.id) return false;
      if (c.allowedRoles && c.allowedRoles.length > 0 && !c.allowedRoles.includes(currentUser.role)) {
        return false;
      }
      return true;
    });
  }, [chatChannels, currentOrg.id, currentUser.role]);

  const tenantChatMessages = useMemo(() => {
    return chatMessages.filter(m => m.orgId === currentOrg.id);
  }, [chatMessages, currentOrg.id]);

  const tenantNotifications = useMemo(() => {
    if (isPlatformOwner) return notifications;
    return notifications.filter(n => n.orgId === currentOrg.id);
  }, [notifications, currentOrg.id, isPlatformOwner]);

  const createAnnouncement = (data: Omit<Announcement, 'id' | 'orgId' | 'createdAt' | 'createdBy'>): Announcement => {
    const newAnn: Announcement = {
      ...data,
      id: `ann-${Date.now()}`,
      orgId: currentOrg.id,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    persistAnnouncementToFirestore(newAnn);
    return newAnn;
  };

  const sendChatMessage = (
    channelId: string,
    content: string,
    tag: ChatMessageTag = 'general',
    attachments?: ChatMessageAttachment[]
  ): ChatMessage => {
    const targetChannel = chatChannels.find(c => c.id === channelId && c.orgId === currentOrg.id);
    if (!targetChannel) {
      onShowToast('Action blocked: Cross-institute messaging is strictly prohibited.', 'error');
      return {} as any;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      orgId: currentOrg.id,
      senderId: currentUser.id || 'user-unknown',
      senderName: currentUser.name || 'User',
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      content,
      tag,
      attachments,
      createdAt: `Today, ${timeStr}`,
      reactions: {}
    };

    setChatMessages(prev => [...prev, newMsg]);

    setChatChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          lastMessage: content.slice(0, 60) + (content.length > 60 ? '...' : ''),
          lastMessageTime: timeStr
        };
      }
      return ch;
    }));

    return newMsg;
  };

  const addChatReaction = (messageId: string, emoji: string) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const currentReactions = msg.reactions || {};
      const userList = currentReactions[emoji] || [];
      const userIdentifier = currentUser.id || currentUser.name;
      const exists = userList.includes(userIdentifier);
      const updatedList = exists
        ? userList.filter(id => id !== userIdentifier)
        : [...userList, userIdentifier];

      const newReactions = { ...currentReactions };
      if (updatedList.length > 0) {
        newReactions[emoji] = updatedList;
      } else {
        delete newReactions[emoji];
      }

      return { ...msg, reactions: newReactions };
    }));
  };

  const createChatChannel = (channelData: Omit<ChatChannel, 'id' | 'orgId'>): ChatChannel => {
    const newChan: ChatChannel = {
      ...channelData,
      id: `chan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orgId: currentOrg.id
    };
    setChatChannels(prev => [...prev, newChan]);
    setActiveChatChannelId(newChan.id);
    onShowToast(`Channel #${newChan.name} created!`, 'success');
    return newChan;
  };

  return (
    <CommunicationContext.Provider
      value={{
        announcements: tenantAnnouncements,
        createAnnouncement,
        notifications: tenantNotifications,
        chatChannels: tenantChatChannels,
        chatMessages: tenantChatMessages,
        activeChatChannelId,
        setActiveChatChannelId,
        sendChatMessage,
        addChatReaction,
        createChatChannel
      }}
    >
      {children}
    </CommunicationContext.Provider>
  );
};

export const useCommunication = () => {
  const context = useContext(CommunicationContext);
  if (!context) {
    throw new Error('useCommunication must be used within a CommunicationProvider');
  }
  return context;
};

// Alias for chat-specific consumers
export const useChat = useCommunication;
