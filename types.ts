

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  TEMPLATE = 'template',
  DOCUMENT = 'document',
  FLOW = 'flow', 
  INTERACTIVE = 'interactive',
  LOCATION = 'location',
  CONTACTS = 'contacts'
}

export type Platform = 'whatsapp' | 'messenger';

export type UserRole = 'SUPER_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN' | 'COMPLIANCE_ADMIN' | 'USER';

export interface SaaSUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  credits: number;
  currency?: string; // Default INR
  createdAt: string;
  expiresAt?: string;
  apiCredentials?: ApiCredentials;
}

export interface ApiCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  businessAccountId?: string;
  facebookPageId?: string;
  facebookPageAccessToken?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  userId: string;
  platform: Platform;
  eventType: string;
  payloadSnippet: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  statusCode: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT' | 'PURCHASE';
  description: string;
  referenceId?: string;
  date: string;
  balanceAfter?: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  contact_limit: number;
  daily_message_limit: number;
  features: string[];
  is_active: boolean;
}

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
  status: MessageStatus;
  type: MessageType;
  mediaUrl?: string;
  reaction?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: any;
}

export interface Conversation {
  id: string;
  platform: Platform;
  contact: User;
  messages: Message[];
  unreadCount: number;
  lastMessageAt: string;
  assignedTo?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  phoneNumber: string; 
  email?: string;
  tags: string[];
}

export interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  body?: string;
  components: any[];
}

export interface Flow {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';
  categories: string[];
}

export interface Campaign {
  id: string;
  name: string;
  templateName: string;
  language: string;
  audienceFilter: string; 
  status: 'DRAFT' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  scheduledAt?: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
  };
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// --- New Types for WABA & Templates ---

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
  example?: any;
}

export interface NewTemplateParams {
  name: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  allow_category_change?: boolean;
}

export interface BusinessProfile {
  messaging_product: 'whatsapp';
  address: string;
  description: string;
  vertical: string;
  email: string;
  websites: string[];
  profile_picture_url: string;
}

export interface WhatsAppPhoneNumber {
  verified_name: string;
  code_verification_status: string;
  display_phone_number: string;
  quality_rating: string;
  id: string;
}

export interface WabaUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ConversationalAutomation {
  enable_welcome_message: boolean;
  prompts: string[];
  commands: any[];
}

export interface ExtendedCreditAllocationConfig {
  config_id: string;
}

export interface WabaSchedule {
  id: string;
  // details
}

export interface SubscribedApp {
  name: string;
  id: string;
  link: string;
  whatsapp_business_api_data?: any;
}

export interface WabaDetails {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
}

export interface WabaActivity {
    id: string;
    event: string;
    timestamp: string;
}

export interface WabaSolution {
    id: string;
    name: string;
    status: string;
}

export interface WhatsAppQrCode {
    code: string;
    prefilled_message: string;
    deep_link_url: string;
    qr_image_url: string;
}

export interface WabaAnalyticsDataPoint {
    start: number;
    end: number;
    sent: number;
    delivered: number;
}

export interface BusinessComplianceInfo {
    status: string;
    can_send_message: boolean;
}

// --- AUTOMATION / CHATBOT ---
export interface AutomationRule {
    id: string;
    name: string;
    trigger_type: 'KEYWORD_MATCH' | 'EXACT_MATCH' | 'WELCOME_MESSAGE';
    keywords: string[]; // e.g. ["price", "cost"]
    response_type: 'TEXT' | 'TEMPLATE' | 'FLOW';
    response_content: string; // Text body or Template Name
    is_active: boolean;
    created_at: string;
}
