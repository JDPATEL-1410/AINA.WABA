

import {
    ApiCredentials,
    Message,
    MessageStatus,
    MessageType,
    Template,
    NewTemplateParams,
    Flow,
    WabaDetails,
    WhatsAppQrCode,
    WhatsAppPhoneNumber,
    WabaUser,
    BusinessProfile,
    ConversationalAutomation,
    ExtendedCreditAllocationConfig,
    WabaSchedule,
    SubscribedApp,
    WabaAnalyticsDataPoint,
    WabaActivity,
    WabaSolution,
    BusinessComplianceInfo
} from '../types';
import { authService } from './authService';
import { API_BASE_URL } from './apiConfig';

const BACKEND_URL = `${API_BASE_URL}/api`;

export const whatsappApiService = {
    getCredentials: (): ApiCredentials | null => {
        const stored = localStorage.getItem('waticlone_creds');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            accessToken: '',
            phoneNumberId: '',
            wabaId: '',
            businessAccountId: '',
            facebookPageId: '',
            facebookPageAccessToken: ''
        };
    },

    saveCredentials: (creds: ApiCredentials) => {
        localStorage.setItem('waticlone_creds', JSON.stringify(creds));
    },

    // --- MESSAGING ---

    sendMessage: async (credentials: ApiCredentials, to: string, text: string): Promise<Message> => {
        const user = authService.getCurrentUser();

        const response = await fetch(`${BACKEND_URL}/messages/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.id || '' // Identify tenant for billing
            },
            body: JSON.stringify({ to, text })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        return {
            id: data.messages?.[0]?.id || Math.random().toString(),
            text,
            sender: 'me',
            timestamp: new Date().toISOString(),
            status: MessageStatus.SENT,
            type: MessageType.TEXT
        };
    },

    sendFlowMessage: async (credentials: ApiCredentials, to: string, flowId: string, screen: string = "SIGN_UP", cta: string = "Book Now"): Promise<Message> => {
        // NOTE: Flow messages should also check credits, but for brevity we are focusing on text.
        const response = await fetch(`${BACKEND_URL}/messages/interactive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to,
                type: 'flow',
                flow_id: flowId,
                flow_cta: cta,
                screen: screen,
                headerText: "Customer Service",
                bodyText: "Please complete this quick form.",
                footerText: "Thank you"
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        return {
            id: data.messages?.[0]?.id || Math.random().toString(),
            text: `[Sent Flow: ${cta}]`,
            sender: 'me',
            timestamp: new Date().toISOString(),
            status: MessageStatus.SENT,
            type: MessageType.FLOW
        };
    },

    sendTemplateMessage: async (credentials: ApiCredentials, to: string, templateName: string, lang: string, components: any[] = []): Promise<any> => {
        const response = await fetch(`${BACKEND_URL}/messages/template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, templateName, language: lang, components })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);
        return data;
    },

    uploadMedia: async (credentials: ApiCredentials, file: File): Promise<{ id: string }> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BACKEND_URL.replace('/api', '')}/api/media/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);
        return { id: data.id };
    },

    sendMediaMessage: async (credentials: ApiCredentials, to: string, type: 'image' | 'document', mediaId: string, caption?: string, filename?: string): Promise<any> => {
        const response = await fetch(`${BACKEND_URL}/messages/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, type, mediaId, caption, filename })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        return {
            id: data.messages?.[0]?.id || Math.random().toString(),
            text: caption || `Sent ${type}`,
            sender: 'me',
            timestamp: new Date().toISOString(),
            status: MessageStatus.SENT,
            type: type === 'image' ? MessageType.IMAGE : MessageType.DOCUMENT,
        };
    },

    // --- DATA FETCHING (Proxied) ---

    getTemplates: async (credentials: ApiCredentials): Promise<Template[]> => {
        const response = await fetch(`${BACKEND_URL}/proxy/templates`);
        const data = await response.json();
        return data.data || [];
    },

    getBusinessProfile: async (credentials: ApiCredentials): Promise<BusinessProfile> => {
        const response = await fetch(`${BACKEND_URL}/whatsapp/profile`);
        const data = await response.json();
        return data.data?.[0] || {};
    },

    updateBusinessProfile: async (credentials: ApiCredentials, profile: Partial<BusinessProfile>): Promise<void> => {
        const response = await fetch(`${BACKEND_URL}/whatsapp/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        if (!response.ok) throw new Error('Failed to update profile');
    },

    // --- FLOWS ---

    getFlows: async (credentials: ApiCredentials): Promise<Flow[]> => {
        const response = await fetch(`${BACKEND_URL}/flows`);
        const data = await response.json();
        return data.data || [];
    },

    createFlow: async (credentials: ApiCredentials, name: string, categories: string[]): Promise<Flow> => {
        const response = await fetch(`${BACKEND_URL}/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, categories })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        return {
            id: data.id,
            name: name,
            status: 'DRAFT',
            categories: categories
        };
    },

    updateFlowJson: async (credentials: ApiCredentials, flowId: string, json: any) => {
        const response = await fetch(`${BACKEND_URL}/flows/${flowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    },

    publishFlow: async (credentials: ApiCredentials, flowId: string) => {
        const response = await fetch(`${BACKEND_URL}/flows/${flowId}/publish`, { method: 'POST' });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    },

    // --- MOCKED / NOT IMPLEMENTED IN SERVER YET (Keeping minimal for compilation) ---

    sendImageMessage: async (credentials: ApiCredentials, to: string, url: string) => { throw new Error("Use uploadMedia + sendMediaMessage"); },
    createTemplate: async (credentials: ApiCredentials, params: NewTemplateParams) => ({}),
    deleteTemplate: async (credentials: ApiCredentials, name: string) => ({}),
    sendReaction: async (credentials: ApiCredentials, messageId: string, emoji: string) => ({}),
    sendLocationMessage: async (credentials: ApiCredentials, to: string, lat: number, long: number, name?: string, addr?: string) => ({}),
    sendInteractiveButtons: async (credentials: ApiCredentials, to: string, text: string, buttons: any[]) => ({}),
    markAsRead: async (credentials: ApiCredentials, messageId: string) => ({}),
    getAnalytics: async (credentials: ApiCredentials, start: number, end: number, granularity: string): Promise<WabaAnalyticsDataPoint[]> => ([]),
    updateBusinessStatus: async (credentials: ApiCredentials, status: string) => ({}),
    getPhoneNumberDetails: async (credentials: ApiCredentials): Promise<WhatsAppPhoneNumber | null> => (null),
    getBusinessComplianceInfo: async (credentials: ApiCredentials): Promise<BusinessComplianceInfo> => ({ status: 'APPROVED', can_send_message: true }),
    updateBusinessComplianceInfo: async (credentials: ApiCredentials, info: BusinessComplianceInfo) => ({}),
    getBusinessPublicKey: async (credentials: ApiCredentials): Promise<string> => (""),
    setBusinessPublicKey: async (credentials: ApiCredentials, key: string) => ({}),
    getBusinessCallingSettings: async (credentials: ApiCredentials): Promise<any> => ({}),
    updateBusinessCallingSettings: async (credentials: ApiCredentials, enabled: boolean) => ({}),
    getCommerceSettings: async (credentials: ApiCredentials): Promise<any> => ({}),
    updateCommerceSettings: async (credentials: ApiCredentials, visible: boolean) => ({}),
    getConversationalAutomation: async (credentials: ApiCredentials): Promise<ConversationalAutomation> => ({ enable_welcome_message: false, prompts: [], commands: [] }),
    updateConversationalAutomation: async (credentials: ApiCredentials, automation: ConversationalAutomation) => ({}),
    getPhoneNumbers: async (credentials: ApiCredentials): Promise<WhatsAppPhoneNumber[]> => ([]),
    addPhoneNumber: async (credentials: ApiCredentials, cc: string, phone: string, name: string) => ({}),
    registerPhoneNumber: async (credentials: ApiCredentials, phoneId: string, pin: string) => ({}),
    deregisterPhoneNumber: async (credentials: ApiCredentials, phoneId: string) => ({}),
    requestVerificationCode: async (credentials: ApiCredentials, phoneId: string, method: string, language: string) => ({}),
    verifyCode: async (credentials: ApiCredentials, phoneId: string, code: string) => ({}),
    getAssignedUsers: async (credentials: ApiCredentials): Promise<WabaUser[]> => ([]),
    getExtendedCreditAllocationConfig: async (credentials: ApiCredentials): Promise<ExtendedCreditAllocationConfig | null> => (null),
    getWabaSchedules: async (credentials: ApiCredentials): Promise<WabaSchedule[]> => ([]),
    getSubscribedApps: async (credentials: ApiCredentials): Promise<SubscribedApp[]> => ([]),
    subscribeApp: async (credentials: ApiCredentials) => ({}),
    unsubscribeApp: async (credentials: ApiCredentials) => ({}),
    getWabaDetails: async (credentials: ApiCredentials): Promise<WabaDetails | null> => (null),
    getWabaActivities: async (credentials: ApiCredentials): Promise<WabaActivity[]> => ([]),
    getWabaSolutions: async (credentials: ApiCredentials): Promise<WabaSolution[]> => ([]),
    getSolutionDetails: async (credentials: ApiCredentials, solutionId: string) => ({}),
    acceptSolutionRequest: async (credentials: ApiCredentials, solutionId: string) => ({}),
    rejectSolutionRequest: async (credentials: ApiCredentials, solutionId: string) => ({}),
    sendDeactivationRequest: async (credentials: ApiCredentials, solutionId: string) => ({}),
    acceptDeactivationRequest: async (credentials: ApiCredentials, solutionId: string) => ({}),
    rejectDeactivationRequest: async (credentials: ApiCredentials, solutionId: string) => ({}),
    generateWabaAccessToken: async (credentials: ApiCredentials): Promise<string> => (""),
    getQrCodes: async (credentials: ApiCredentials): Promise<WhatsAppQrCode[]> => ([]),
    createQrCode: async (credentials: ApiCredentials, message: string) => ({}),
    updateQrCode: async (credentials: ApiCredentials, code: string, message: string) => ({}),
    deleteQrCode: async (credentials: ApiCredentials, code: string) => ({}),
    debugToken: async (accessToken: string): Promise<any> => ({ data: { is_valid: true, scopes: [] } })
};
