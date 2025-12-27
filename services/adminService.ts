
import { SaaSUser, AuditLog, WebhookLog } from '../types';

import { API_BASE_URL } from './apiConfig';

const BACKEND_URL = `${API_BASE_URL}/api`;

export const adminService = {
    getStats: async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/stats`);
            return await res.json();
        } catch (e) {
            // Fallback for demo
            return {
                totalUsers: 120,
                activeUsers: 115,
                totalMessages24h: 15430,
                revenueMonth: 45000,
                webhookFailures: 23,
                deliveryRate: 98.2
            };
        }
    },

    getClients: async (): Promise<SaaSUser[]> => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`);
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (e) {
            // Mock for demo if backend is down
            return [
                { id: '1', name: 'Acme Corp', email: 'contact@acme.com', role: 'USER', plan: 'ENTERPRISE', status: 'ACTIVE', credits: 4500, createdAt: new Date().toISOString() },
                { id: '2', name: 'Beta Ltd', email: 'info@beta.com', role: 'USER', plan: 'STARTER', status: 'SUSPENDED', credits: 12, createdAt: new Date().toISOString() }
            ];
        }
    },

    getAuditLogs: async (): Promise<AuditLog[]> => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/audit-logs`);
            return await res.json();
        } catch (e) { return []; }
    },

    getWebhookLogs: async (): Promise<WebhookLog[]> => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/webhook-logs`);
            return await res.json();
        } catch (e) { return []; }
    }
};
