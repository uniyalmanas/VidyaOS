import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
  persistAnnouncementToFirestore,
  subscribeToChatChannels,
  subscribeToChatMessages,
  persistChatMessageToFirestore,
  persistChatChannelToFirestore,
  toggleChatReactionFirestore
} from '../../lib/firestoreService';

export interface CommunicationContextType {
  announcements: Announcement[];
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'orgId' | 'createdAt' | 'createdBy'>) => Announcement;
  notifications: NotificationItem[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  activeChatChannelId: string;
  setActiveChatChannelId: (channelId: string) => void;
  /** Resolves to the saved message, or null if the cloud write failed. */
  sendChatMessage: (channelId: string, content: string, tag?: ChatMessageTag, attachments?: ChatMessageAttachment[]) => Promise<ChatMessage | null>;
  addChatReaction: (messageId: string, emoji: string) => Promise<void>;
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
  // Announcements are Firestore-backed. The old localStorage mirror used a
  // single global key (not org-scoped), which flashed another institute's
  // notices on cold start before the listener replaced them.
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    import.meta.env.DEV ? MOCK_ANNOUNCEMENTS : []
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>(import.meta.env.DEV ? [
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
  ] : []);

  // VidyaChat state. Firestore is the single source of truth — localStorage is
  // deliberately NOT used for chat: it is per-browser, so a message a student
  // sent could never reach a teacher's device.
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeChatChannelId, setActiveChatChannelId] = useState<string>('');

  // DEV demo personas have no cloud data yet, so keep a mutable snapshot of the
  // mock channels/messages for the listeners to serve when Firestore is empty.
  // A ref (rather than effect deps) prevents tearing the listeners down every
  // time `batches` refreshes from its own subscription.
  const chatFallbackRef = useRef<{ channels: ChatChannel[]; messages: ChatMessage[] }>({
    channels: [],
    messages: []
  });
  chatFallbackRef.current = {
    channels: getDefaultChannelsForOrg(
      currentOrg.id,
      currentOrg.name,
      batches.filter(b => b.orgId === currentOrg.id)
    ),
    messages: getDefaultMessagesForOrg(currentOrg.id, currentOrg.name, currentOrg.ownerName)
  };

  // Real-time Firestore subscription for announcements
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsubAnnouncements = subscribeToAnnouncements(data => {
      if (data) setAnnouncements(data);
    }, targetOrg);
    return () => {
      unsubAnnouncements();
    };
  }, [currentOrg.id, isPlatformOwner]);

  // Real-time Firestore subscriptions for chat channels + messages
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsubChannels = subscribeToChatChannels(
      setChatChannels,
      targetOrg,
      chatFallbackRef.current.channels
    );
    const unsubMessages = subscribeToChatMessages(
      setChatMessages,
      targetOrg,
      chatFallbackRef.current.messages
    );
    return () => {
      unsubChannels();
      unsubMessages();
    };
  }, [currentOrg.id, isPlatformOwner]);

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

  // Only show messages for channels this role is allowed to see. Previously
  // messages were filtered by org alone, so a student could read faculty-lounge
  // history as long as they knew the channel id.
  const tenantChatMessages = useMemo(() => {
    const visibleChannelIds = new Set(tenantChatChannels.map(c => c.id));
    return chatMessages.filter(
      m => m.orgId === currentOrg.id && visibleChannelIds.has(m.channelId)
    );
  }, [chatMessages, tenantChatChannels, currentOrg.id]);

  const tenantNotifications = useMemo(() => {
    if (isPlatformOwner) return notifications;
    return notifications.filter(n => n.orgId === currentOrg.id);
  }, [notifications, currentOrg.id, isPlatformOwner]);

  // Keep the selected channel valid as channels stream in, or when the active
  // organisation changes and the old channel id no longer exists.
  useEffect(() => {
    if (tenantChatChannels.length === 0) return;
    if (!tenantChatChannels.some(c => c.id === activeChatChannelId)) {
      setActiveChatChannelId(tenantChatChannels[0].id);
    }
  }, [tenantChatChannels, activeChatChannelId]);

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

  /**
   * Sends a chat message to Firestore and returns it, or `null` if the cloud
   * write failed. The write is awaited before local state is touched so a
   * failure surfaces as an error toast instead of a message that silently
   * disappears on the next reload.
   */
  const sendChatMessage = async (
    channelId: string,
    content: string,
    tag: ChatMessageTag = 'general',
    attachments?: ChatMessageAttachment[]
  ): Promise<ChatMessage | null> => {
    const targetChannel = chatChannels.find(c => c.id === channelId && c.orgId === currentOrg.id);
    if (!targetChannel) {
      onShowToast('Action blocked: Cross-institute messaging is strictly prohibited.', 'error');
      return null;
    }
    if (
      targetChannel.allowedRoles &&
      targetChannel.allowedRoles.length > 0 &&
      !targetChannel.allowedRoles.includes(currentUser.role)
    ) {
      onShowToast(`You do not have permission to post in #${targetChannel.name}.`, 'error');
      return null;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const createdAtMs = now.getTime();

    const newMsg: ChatMessage = {
      id: `msg-${createdAtMs}-${Math.random().toString(36).substring(2, 7)}`,
      channelId,
      orgId: currentOrg.id,
      // currentUser.id === Firebase Auth uid on every login path, which is what
      // the `senderId == request.auth.uid` rule in firestore.rules requires.
      senderId: currentUser.id || 'user-unknown',
      senderName: currentUser.name || 'User',
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      content,
      tag,
      attachments,
      createdAt: `Today, ${timeStr}`,
      createdAtMs,
      reactions: {}
    };

    const updatedChannel: ChatChannel = {
      ...targetChannel,
      lastMessage: content.slice(0, 60) + (content.length > 60 ? '...' : ''),
      lastMessageTime: timeStr,
      lastMessageMs: createdAtMs
    };

    try {
      await Promise.all([
        persistChatMessageToFirestore(newMsg),
        persistChatChannelToFirestore(updatedChannel)
      ]);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Chat send failed:', error);
      onShowToast('Message could not be sent. Check your connection and try again.', 'error');
      return null;
    }

    // Optimistic echo — the live listener will reconcile with the server copy.
    setChatMessages(prev => [...prev, newMsg]);
    setChatChannels(prev => prev.map(ch => (ch.id === channelId ? updatedChannel : ch)));

    return newMsg;
  };

  const addChatReaction = async (messageId: string, emoji: string): Promise<void> => {
    const userIdentifier = currentUser.id || currentUser.name;

    // Optimistic local toggle for instant feedback...
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const currentReactions = msg.reactions || {};
      const userList = currentReactions[emoji] || [];
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

    // ...then reconcile against Firestore so the reaction reaches everyone.
    try {
      await toggleChatReactionFirestore(messageId, emoji, userIdentifier);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Reaction sync failed:', error);
      onShowToast('Reaction could not be synced.', 'error');
    }
  };

  const createChatChannel = (channelData: Omit<ChatChannel, 'id' | 'orgId'>): ChatChannel => {
    const newChan: ChatChannel = {
      ...channelData,
      id: `chan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orgId: currentOrg.id
    };
    setChatChannels(prev => [...prev, newChan]);
    setActiveChatChannelId(newChan.id);

    // Rules only let staff create channels, so confirm against Firestore before
    // claiming success — otherwise a student sees "created!" and then an error.
    persistChatChannelToFirestore(newChan)
      .then(() => onShowToast(`Channel #${newChan.name} created!`, 'success'))
      .catch(error => {
        if (import.meta.env.DEV) console.error('Channel create failed:', error);
        setChatChannels(prev => prev.filter(c => c.id !== newChan.id));
        onShowToast(
          'Channel could not be created. Creating channels is limited to admin and faculty accounts.',
          'error'
        );
      });
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
