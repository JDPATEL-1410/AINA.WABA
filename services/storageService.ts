import { User, Conversation, Message, MessageStatus, MessageType, Campaign, Agent } from '../types';

const KEYS = {
  CONTACTS: 'waticlone_contacts',
  CONVERSATIONS: 'waticlone_conversations',
  CAMPAIGNS: 'waticlone_campaigns'
};

const DEFAULT_CONTACTS: User[] = [
  { id: '1', name: 'Alice Johnson', phoneNumber: '15550001234', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=random', tags: ['VIP', 'New'] },
  { id: '2', name: 'Bob Smith', phoneNumber: '15550005678', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=random', tags: ['Pending'] },
];

const MOCK_AGENTS: Agent[] = [
    { id: 'me', name: 'Me (Admin)', email: 'admin@company.com', avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff' },
    { id: 'agent1', name: 'Sarah Support', email: 'sarah@company.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Support&background=random' },
    { id: 'agent2', name: 'Mike Sales', email: 'mike@company.com', avatar: 'https://ui-avatars.com/api/?name=Mike+Sales&background=random' },
];

const DEFAULT_CONVERSATIONS: Conversation[] = [
    {
        id: 'c1',
        platform: 'whatsapp',
        contact: DEFAULT_CONTACTS[0],
        unreadCount: 1,
        lastMessageAt: new Date().toISOString(),
        messages: [
            { id: 'm1', text: "Hi, I have a question about my order.", sender: 'them', timestamp: new Date(Date.now() - 3600000).toISOString(), status: MessageStatus.READ, type: MessageType.TEXT },
            { id: 'm2', text: "Sure, Alice! What's your order number?", sender: 'me', timestamp: new Date(Date.now() - 3500000).toISOString(), status: MessageStatus.READ, type: MessageType.TEXT },
            { id: 'm3', text: "#12345", sender: 'them', timestamp: new Date().toISOString(), status: MessageStatus.DELIVERED, type: MessageType.TEXT }
        ]
    }
];

export const storageService = {
  getContacts: (): User[] => {
    const stored = localStorage.getItem(KEYS.CONTACTS);
    if (!stored) {
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(DEFAULT_CONTACTS));
      return DEFAULT_CONTACTS;
    }
    return JSON.parse(stored);
  },

  saveContact: (contact: User) => {
    const contacts = storageService.getContacts();
    const existingIndex = contacts.findIndex(c => c.id === contact.id);
    if (existingIndex >= 0) {
      contacts[existingIndex] = contact;
    } else {
      contacts.push(contact);
    }
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    // Also ensure conversation exists
    storageService.ensureConversation(contact);
  },

  deleteContact: (id: string) => {
    const contacts = storageService.getContacts().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
  },

  getConversations: (): Conversation[] => {
    const stored = localStorage.getItem(KEYS.CONVERSATIONS);
    if (!stored) {
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(DEFAULT_CONVERSATIONS));
      return DEFAULT_CONVERSATIONS;
    }
    const convs = JSON.parse(stored);
    // Sort by last message
    return convs.sort((a: Conversation, b: Conversation) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  },

  getConversation: (id: string): Conversation | undefined => {
    return storageService.getConversations().find(c => c.id === id);
  },

  saveConversation: (conversation: Conversation) => {
    const convs = storageService.getConversations();
    const idx = convs.findIndex(c => c.id === conversation.id);
    if (idx >= 0) {
      convs[idx] = conversation;
    } else {
      convs.push(conversation);
    }
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
  },

  ensureConversation: (contact: User): Conversation => {
      const convs = storageService.getConversations();
      let conv = convs.find(c => c.contact.id === contact.id);
      if (!conv) {
          conv = {
              id: `conv_${contact.id}`,
              platform: 'whatsapp',
              contact: contact,
              messages: [],
              unreadCount: 0,
              lastMessageAt: new Date().toISOString()
          };
          convs.push(conv);
          localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
      }
      return conv;
  },

  addMessage: (conversationId: string, message: Message) => {
    const convs = storageService.getConversations();
    const idx = convs.findIndex(c => c.id === conversationId);
    if (idx >= 0) {
      convs[idx].messages.push(message);
      convs[idx].lastMessageAt = message.timestamp;
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
    }
  },

  // Campaigns
  getCampaigns: (): Campaign[] => {
      const stored = localStorage.getItem(KEYS.CAMPAIGNS);
      if(!stored) return [];
      return JSON.parse(stored).sort((a: Campaign, b: Campaign) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  saveCampaign: (campaign: Campaign) => {
      const campaigns = storageService.getCampaigns();
      const idx = campaigns.findIndex(c => c.id === campaign.id);
      if (idx >= 0) {
          campaigns[idx] = campaign;
      } else {
          campaigns.push(campaign);
      }
      localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  },

  deleteCampaign: (id: string) => {
      const campaigns = storageService.getCampaigns().filter(c => c.id !== id);
      localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  },

  // Mock Agents
  getAgents: (): Agent[] => {
      return MOCK_AGENTS;
  }
};