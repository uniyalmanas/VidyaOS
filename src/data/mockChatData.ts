import { ChatChannel, ChatMessage } from '../types';

export const INITIAL_CHAT_CHANNELS: ChatChannel[] = [
  {
    id: 'chan-announcements',
    orgId: 'org-apex',
    name: 'announcements',
    displayName: '📢 Institute Announcements',
    type: 'announcements',
    description: 'Official institute-wide circulars, holiday notices, and exam schedules',
    lastMessage: 'Gandhi Jayanti holiday schedule observed on Oct 2nd...',
    lastMessageTime: '10:15 AM',
    unreadCount: 0
  },
  {
    id: 'chan-c10-math',
    orgId: 'org-apex',
    name: 'c10-math-doubts',
    displayName: '📐 Class 10 Math Doubts',
    type: 'batch',
    batchId: 'batch-c10-math',
    description: 'Daily doubt clearing, formula revisions & homework discussions for Class 10 CBSE Math',
    lastMessage: 'Dividing both numerator and denominator by sin ? simplifies it...',
    lastMessageTime: '11:42 AM',
    unreadCount: 2
  },
  {
    id: 'chan-c12-phy',
    orgId: 'org-apex',
    name: 'c12-physics-adv',
    displayName: '⚡ Class 12 Physics & JEE Sprint',
    type: 'batch',
    batchId: 'batch-c12-phy',
    description: 'Electrodynamics, Optics & JEE Advanced problem-solving masterclasses',
    lastMessage: 'Formulas for Gauss Law surface integrals posted in vault.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0
  },
  {
    id: 'chan-c11-chem',
    orgId: 'org-apex',
    name: 'c11-chemistry-foundation',
    displayName: '🧪 Class 11 Chemistry Foundation',
    type: 'batch',
    batchId: 'batch-c11-chem',
    description: 'Physical & Organic chemistry concepts, practice problems & NCERT solutions',
    lastMessage: 'Reminder: Practice sheet for Chemical Bonding is due Friday.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0
  },
  {
    id: 'chan-parent-desk',
    orgId: 'org-apex',
    name: 'parent-teacher-connect',
    displayName: '💬 Parent & Teacher Desk',
    type: 'direct',
    description: 'Direct communication desk between parents, guardians, and subject faculty',
    lastMessage: 'Rahul can attend the 6 PM evening batch on Friday.',
    lastMessageTime: '09:30 AM',
    unreadCount: 1
  },
  {
    id: 'chan-faculty-lounge',
    orgId: 'org-apex',
    name: 'faculty-lounge',
    displayName: '☕ Faculty & Admin Lounge',
    type: 'faculty',
    allowedRoles: ['CENTER_ADMIN', 'TEACHER', 'PLATFORM_OWNER'],
    isPrivate: true,
    description: 'Private staff room for faculty meeting notes, test grading sync, and curriculum planning',
    lastMessage: 'Physics Sunday Mock question paper uploaded to print queue.',
    lastMessageTime: '08:50 AM',
    unreadCount: 0
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // 1. Announcements Channel
  {
    id: 'msg-ann-1',
    channelId: 'chan-announcements',
    orgId: 'org-apex',
    senderId: 'admin-1',
    senderName: 'Dr. Rajesh Verma',
    senderRole: 'CENTER_ADMIN',
    senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    content: '📢 **Important Institute Notice:** Gandhi Jayanti holiday schedule will be observed on Oct 2nd. All regular batches will be off. Special marathon revision classes for Class 10 & 12 Board candidates will resume on Oct 3rd at 09:00 AM.',
    tag: 'notice',
    pinned: true,
    createdAt: 'Today, 10:15 AM',
    reactions: { '👍': ['stud-rahul-10', 'teacher-1'], '🎯': ['stud-aarav-10'] }
  },

  // 2. Class 10 Math Doubts Channel
  {
    id: 'msg-c10-1',
    channelId: 'chan-c10-math',
    orgId: 'org-apex',
    senderId: 'stud-rahul-10',
    senderName: 'Rahul Sharma',
    senderRole: 'STUDENT',
    senderAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
    content: 'Sir, in NCERT Trigonometry Exercise 8.4 Question 5 (v), should we convert cosec ? and cot ? into sin and cos first, or use the identity cosec²? = 1 + cot²? directly?',
    tag: 'doubt',
    createdAt: 'Today, 11:30 AM',
    reactions: { '❓': ['stud-aarav-10'] }
  },
  {
    id: 'msg-c10-2',
    channelId: 'chan-c10-math',
    orgId: 'org-apex',
    senderId: 'teacher-1',
    senderName: 'Prof. Ankit Verma',
    senderRole: 'TEACHER',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    content: 'Great question Rahul! Both approaches work, but dividing both numerator and denominator by sin ? first makes it very straightforward to substitute the 1 with (cosec²? - cot²?) = (cosec ? - cot ?)(cosec ? + cot ?). Check Chapter 8 handwritten formula notes in Study Notes vault!',
    tag: 'homework',
    attachments: [
      { name: 'Trig_Identities_Formula_Sheet.pdf', type: 'pdf', size: '240 KB' }
    ],
    createdAt: 'Today, 11:38 AM',
    reactions: { '👍': ['stud-rahul-10', 'stud-aarav-10', 'stud-sneha-10'], '💡': ['stud-sneha-10'] }
  },
  {
    id: 'msg-c10-3',
    channelId: 'chan-c10-math',
    orgId: 'org-apex',
    senderId: 'stud-sneha-10',
    senderName: 'Sneha Patel',
    senderRole: 'STUDENT',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    content: 'Thank you Ankit sir! That identity trick makes factoring out (cosec ? + cot ?) instantaneous. Got the RHS now!',
    tag: 'general',
    createdAt: 'Today, 11:42 AM',
    reactions: { '👏': ['teacher-1'] }
  },

  // 3. Parent & Teacher Desk
  {
    id: 'msg-parent-1',
    channelId: 'chan-parent-desk',
    orgId: 'org-apex',
    senderId: 'parent-1',
    senderName: 'Rajesh Sharma (Father)',
    senderRole: 'PARENT',
    senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    content: 'Namaste Ankit Sir, Rahul has an inter-school basketball tournament this Friday 3 PM to 5 PM. Can he attend the 6:00 PM evening revision batch instead of his usual 4:30 PM slot?',
    tag: 'general',
    createdAt: 'Today, 09:15 AM'
  },
  {
    id: 'msg-parent-2',
    channelId: 'chan-parent-desk',
    orgId: 'org-apex',
    senderId: 'teacher-1',
    senderName: 'Prof. Ankit Verma',
    senderRole: 'TEACHER',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    content: 'Namaste Rajesh ji! Absolutely no problem. I have noted his name for the 6:00 PM batch in Room 2. We will be covering Quadratic Equation word problems then, so he will not miss anything.',
    tag: 'general',
    createdAt: 'Today, 09:30 AM',
    reactions: { '❤️': ['parent-1'], '🙏': ['parent-1'] }
  },

  // 4. Faculty & Admin Lounge
  {
    id: 'msg-fac-1',
    channelId: 'chan-faculty-lounge',
    orgId: 'org-apex',
    senderId: 'admin-1',
    senderName: 'Dr. Rajesh Verma',
    senderRole: 'CENTER_ADMIN',
    senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    content: 'Faculty team, kindly submit your Sunday All-India Mock Test master question sheets to the office desk by Friday 2 PM for xerox bundle prep.',
    tag: 'urgent',
    createdAt: 'Today, 08:30 AM',
    reactions: { '👍': ['teacher-1', 'teacher-2'] }
  },
  {
    id: 'msg-fac-2',
    channelId: 'chan-faculty-lounge',
    orgId: 'org-apex',
    senderId: 'teacher-1',
    senderName: 'Prof. Ankit Verma',
    senderRole: 'TEACHER',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    content: 'Class 10 Math 50-mark paper and Class 12 JEE Advanced Physics questions with step-by-step marking rubrics are uploaded to the staff queue.',
    tag: 'general',
    createdAt: 'Today, 08:50 AM',
    reactions: { '👏': ['admin-1'] }
  }
];

export const getDefaultChannelsForOrg = (
  orgId: string,
  orgName: string,
  batches: { id: string; name: string }[]
): ChatChannel[] => {
  if (orgId === 'org-apex') {
    return INITIAL_CHAT_CHANNELS;
  }

  // Create isolated default channels specifically for this coaching center
  const channels: ChatChannel[] = [
    {
      id: `chan-${orgId}-announcements`,
      orgId,
      name: 'announcements',
      displayName: '📢 Institute Announcements',
      type: 'announcements',
      description: `Official circulars, holiday notices, and exam alerts for ${orgName}`,
      lastMessage: `Welcome to ${orgName} official channel!`,
      lastMessageTime: 'Just now',
      unreadCount: 0
    },
    {
      id: `chan-${orgId}-parent-desk`,
      orgId,
      name: 'parent-teacher-connect',
      displayName: '💬 Parent & Teacher Desk',
      type: 'direct',
      description: `Official direct communication between parents and faculty at ${orgName}`,
      lastMessage: 'Direct communication desk open.',
      lastMessageTime: 'Just now',
      unreadCount: 0
    },
    {
      id: `chan-${orgId}-faculty-lounge`,
      orgId,
      name: 'faculty-lounge',
      displayName: '☕ Faculty & Admin Lounge',
      type: 'faculty',
      allowedRoles: ['CENTER_ADMIN', 'TEACHER', 'PLATFORM_OWNER'],
      isPrivate: true,
      description: `Private staff room for faculty meeting notes and syllabus alignment at ${orgName}`,
      lastMessage: 'Staff discussions and lecture schedule sync.',
      lastMessageTime: 'Just now',
      unreadCount: 0
    }
  ];

  // Add channels for this institute's batches
  batches.forEach(b => {
    channels.push({
      id: `chan-${orgId}-${b.id}`,
      orgId,
      name: b.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      displayName: `📐 ${b.name} Doubts`,
      type: 'batch',
      batchId: b.id,
      description: `Doubt solving, homework assistance & formula notes for ${b.name}`,
      lastMessage: `Batch channel initialized for ${b.name}.`,
      lastMessageTime: 'Just now',
      unreadCount: 0
    });
  });

  return channels;
};

export const getDefaultMessagesForOrg = (
  orgId: string,
  orgName: string,
  ownerName: string
): ChatMessage[] => {
  if (orgId === 'org-apex') {
    return INITIAL_CHAT_MESSAGES;
  }

  return [
    {
      id: `msg-${orgId}-welcome`,
      channelId: `chan-${orgId}-announcements`,
      orgId,
      senderId: `admin-${orgId}`,
      senderName: ownerName || `${orgName} Admin`,
      senderRole: 'CENTER_ADMIN',
      senderAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName || orgName)}`,
      content: `Welcome to **${orgName}** on VidyaChat! 🎉\n\nAll batches, faculty discussions, parent desk queries, and student doubt channels are isolated specifically for our institute. Feel free to ask questions and collaborate.`,
      tag: 'notice',
      pinned: true,
      createdAt: 'Today, Just now',
      reactions: { '👏': [`admin-${orgId}`] }
    }
  ];
};

