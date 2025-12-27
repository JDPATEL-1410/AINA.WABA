import { Transaction, CreditPack, SubscriptionPlan } from '../types';
import { authService } from './authService';
import { API_BASE_URL } from './apiConfig';

const BACKEND_URL = `${API_BASE_URL}/api`;

// Mock Data for Fallback
const MOCK_PACKS: CreditPack[] = [
    { id: 'p1', name: 'Starter Bundle', credits: 1000, price: 500, currency: 'INR', popular: false },
    { id: 'p2', name: 'Growth Pack', credits: 5000, price: 2000, currency: 'INR', popular: true },
    { id: 'p3', name: 'Enterprise Bulk', credits: 20000, price: 7000, currency: 'INR', popular: false }
];

const MOCK_PLANS: SubscriptionPlan[] = [
    { id: '1', name: 'FREE TRIAL', price: 0, currency: 'INR', contact_limit: 100, daily_message_limit: 50, features: ['Basic Inbox', 'No Broadcasts'], is_active: true },
    { id: '2', name: 'STARTER', price: 999, currency: 'INR', contact_limit: 2000, daily_message_limit: 1000, features: ['Campaigns', 'Basic Automation'], is_active: true },
    { id: '3', name: 'BUSINESS', price: 2499, currency: 'INR', contact_limit: 10000, daily_message_limit: 5000, features: ['Advanced Flows', 'API Access', 'Priority Support'], is_active: true }
];

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'tx1', userId: 'user1', amount: 500, type: 'CREDIT', description: 'Credit Purchase (Starter)', date: new Date().toISOString(), referenceId: 'ord_123' },
    { id: 'tx2', userId: 'user1', amount: -1.5, type: 'DEBIT', description: 'Template Message', date: new Date(Date.now() - 86400000).toISOString(), referenceId: 'msg_1' }
];

export const billingService = {
    getCreditPacks: async (): Promise<CreditPack[]> => {
        try {
            const response = await fetch(`${BACKEND_URL}/billing/packs`);
            if (response.ok) {
                const data = await response.json();
                return data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    credits: p.credits,
                    price: parseFloat(p.price),
                    currency: 'INR', // Force INR
                    popular: p.is_popular
                }));
            }
            throw new Error("API failed");
        } catch (e) {
            console.warn("Billing API offline, using mock data");
            return MOCK_PACKS;
        }
    },

    getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
        try {
            const response = await fetch(`${BACKEND_URL}/billing/plans`);
            if (response.ok) {
                const data = await response.json();
                return data.map((p: any) => ({ ...p, currency: 'INR' }));
            }
            throw new Error("API failed");
        } catch (e) {
            console.warn("Billing API offline, using mock data");
            return MOCK_PLANS;
        }
    },

    getTransactions: async (): Promise<Transaction[]> => {
        const user = authService.getCurrentUser();
        if (!user) return [];

        try {
            const response = await fetch(`${BACKEND_URL}/billing/transactions`, {
                headers: { 'x-user-id': user.id }
            });
            if (!response.ok) throw new Error("API failed");
            return await response.json();
        } catch (e) {
            console.warn("Billing service offline, using mock transactions");
            return MOCK_TRANSACTIONS;
        }
    },

    purchaseCredits: async (packId: string): Promise<boolean> => {
        return true;
    }
};
