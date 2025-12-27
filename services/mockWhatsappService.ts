
import { Conversation, Message, MessageStatus, MessageType, User, Template, Flow } from '../types';

// Mock Data Generators
const generateId = () => Math.random().toString(36).substr(2, 9);

const MOCK_CONTACTS: User[] = [
  { id: '1', name: 'Alice Johnson', phoneNumber: '+1234567890', avatar: 'https://picsum.photos/200/200?random=1', tags: ['vip', 'new'] },
  { id: '2', name: 'Bob Smith', phoneNumber: '+1987654321', avatar: 'https://picsum.photos/200/200?random=2', tags: ['pending'] },
  { id: '3', name: 'Messenger User', phoneNumber: '1000222333444', avatar: 'https://picsum.photos/200/200?random=4', tags: ['facebook'] },
];

const MOCK_TEMPLATES: Template[] = [
  { 
    id: 't1', 
    name: 'welcome_message', 
    language: 'en_US', 
    category: 'MARKETING', 
    status: 'APPROVED', 
    body: 'Hello {{1}}, welcome to our service! We are excited to have you.',
    components: [
      { type: 'BODY', text: 'Hello {{1}}, welcome to our service! We are excited to have you.' }
    ]
  },
  { 
    id: 't2', 
    name: 'order_update', 
    language: 'en_US', 
    category: 'UTILITY', 
    status: 'APPROVED', 
    body: 'Hi {{1}}, your order #{{2}} has been shipped and is on its way.',
    components: [
      { type: 'BODY', text: 'Hi {{1}}, your order #{{2}} has been shipped and is on its way.' }
    ]
  },
];

let MOCK_FLOWS: Flow[] = [
    { id: 'f1', name: 'Appointment Booking', status: 'PUBLISHED', categories: ['APPOINTMENT'] },
    { id: 'f2', name: 'Customer Survey', status: 'DRAFT', categories: ['SURVEY'] }
];

const MOCK_CONVERSATIONS: Conversation[] = [
    // WhatsApp Conversations
    {
        id: 'c1',
        platform: 'whatsapp',
        contact: MOCK_CONTACTS[0],
        unreadCount: 2,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        messages: [
            { id: generateId(), text: "Hello!", sender: 'them', timestamp: new Date(Date.now() - 3600000).toISOString(), status: MessageStatus.READ, type: MessageType.TEXT },
            { id: generateId(), text: "How can I help?", sender: 'me', timestamp: new Date(Date.now() - 3500000).toISOString(), status: MessageStatus.READ, type: MessageType.TEXT },
        ]
    },
    // Facebook Messenger Conversation
    {
        id: 'c3',
        platform: 'messenger',
        contact: MOCK_CONTACTS[2],
        unreadCount: 1,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        messages: [
             { id: generateId(), text: "Is this open now?", sender: 'them', timestamp: new Date(Date.now() - 3600000).toISOString(), status: MessageStatus.DELIVERED, type: MessageType.TEXT },
        ]
    }
];

export const mockWhatsappService = {
  getConversations: async (): Promise<Conversation[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_CONVERSATIONS]), 500);
    });
  },

  getTemplates: async (): Promise<Template[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_TEMPLATES]), 400);
    });
  },

  getFlows: async (): Promise<Flow[]> => {
      return new Promise((resolve) => resolve([...MOCK_FLOWS]));
  },

  createFlow: async (name: string, categories: string[]): Promise<Flow> => {
      return new Promise((resolve) => {
          const newFlow: Flow = {
              id: generateId(),
              name,
              status: 'DRAFT',
              categories
          };
          MOCK_FLOWS.push(newFlow);
          setTimeout(() => resolve(newFlow), 500);
      });
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: generateId(),
          text,
          sender: 'me',
          timestamp: new Date().toISOString(),
          status: MessageStatus.SENT,
          type: MessageType.TEXT
        });
      }, 300);
    });
  }
};
