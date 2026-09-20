export interface PracticeQuestion {
  id: string
  title: string
  level: string
  durationMinutes: number
  description: string
  requirements: string[]
}

export const practiceQuestions: PracticeQuestion[] = [
  {
    id: 'tinyurl',
    title: 'TinyURL',
    level: 'Beginner',
    durationMinutes: 20,
    description: 'Design a public short URL service. Users paste a long URL to get a short URL, which redirects via HTTP 302 when clicked.',
    requirements: [
      '7-character short code',
      'Peak QPS 12,000',
      'p99 < 50ms',
      '99.99% Availability',
    ],
  },
  {
    id: 'instagram-feed',
    title: 'Instagram Feed',
    level: 'Intermediate',
    durationMinutes: 35,
    description: 'Design an image feed system. Users can upload photos, follow other users, and view a chronologically sorted feed.',
    requirements: [
      'DAU: 50,000,000',
      'Upload photos with original and multiple thumbnail sizes',
      'Follow and unfollow users',
      'Fetch chronologically sorted feed with pagination support',
      'Feed p99 < 200ms'
    ],
  },
  {
    id: 'realtime-chat',
    title: 'Realtime Chat (LINE / WhatsApp)',
    level: 'Intermediate-Advanced',
    durationMinutes: 40,
    description: 'Design a real-time chat system supporting 1-on-1 and group conversations, with read receipts and offline push notifications.',
    requirements: [
      'DAU: 100,000,000',
      'Real-time message send/receive',
      'Group chat with up to 500 members',
      'Online status and read receipts',
      'End-to-end p99 < 100ms'
    ],
  },
  {
    id: 'flash-sale',
    title: 'E-commerce Flash Sale',
    level: 'Advanced',
    durationMinutes: 40,
    description: 'Design an e-commerce flash sale system. A single item has only 1,000 units in stock, with 2 million users competing simultaneously at launch.',
    requirements: [
      'Peak QPS: 500,000',
      'Display sale countdown',
      'Place orders and deduct inventory',
      'Strict requirement: No overselling',
      'p99 < 300ms'
    ],
  },
  {
    id: 'notification-service',
    title: 'Notification Service',
    level: 'Advanced',
    durationMinutes: 35,
    description: 'Design a notification system for internal services to call, responsible for sending Emails, SMS, and App Push notifications.',
    requirements: [
      'Multi-channel delivery: Email, SMS, App Push',
      'Manage user preferences and opt-outs',
      'Delivery status tracking and retries',
      'Strict requirement: No message loss, no duplicate deliveries',
      'Transactional < 5s; Marketing allows delay'
    ],
  },
]
