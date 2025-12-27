
import { SaaSUser } from '../types';

// Fix: Safe access to import.meta.env using optional chaining
const getBaseUrl = () => {
    const env = (import.meta as any).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL + '/api';
    if (env?.PROD) return '/api';
    return 'http://localhost:3000/api';
};

const BACKEND_URL = getBaseUrl();
const LOCAL_STORAGE_USERS_KEY = 'waticlone_mock_users';

const MOCK_ADMIN: SaaSUser = {
    id: 'admin_1',
    name: 'Super Reseller',
    email: 'admin@reseller.com',
    role: 'SUPER_ADMIN',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    credits: 999999,
    createdAt: new Date().toISOString()
};

const DEFAULT_MOCK_USER: any = {
    id: 'user_1',
    name: 'Demo Company A',
    email: 'user@company.com',
    password: 'user123',
    role: 'USER',
    plan: 'STARTER',
    status: 'ACTIVE',
    credits: 50,
    createdAt: new Date().toISOString()
};

// Helper to get local users + default mock
const getLocalUsers = (): any[] => {
    const stored = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    const users = stored ? JSON.parse(stored) : [];
    // Ensure default demo user exists in local list if not present
    if (!users.find((u: any) => u.email === DEFAULT_MOCK_USER.email)) {
        users.push(DEFAULT_MOCK_USER);
    }
    return users;
};

export const authService = {
    // --- AUTHENTICATION ---
    login: async (email: string, password: string): Promise<SaaSUser> => {
        // 1. Check Admin Mock (Always works locally)
        if (email === 'admin@reseller.com' && password === 'admin') {
            const user = MOCK_ADMIN;
            localStorage.setItem('wati_user', JSON.stringify(user));
            return user;
        }

        // 2. Try Backend Login
        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                // Only throw if 401/403, if 404 or 5xx let fallback handle it if network error
                if(response.status === 401 || response.status === 403) {
                     throw new Error(data.error || 'Invalid credentials');
                }
                throw new Error("Network/Server Error");
            }
            
            const user = await response.json();
            localStorage.setItem('wati_user', JSON.stringify(user));
            return user;
        } catch (e: any) {
            // 3. Fallback: Only if it's a NETWORK error or 503
            const isNetworkError = e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('Connection refused') || e.message.includes('Network/Server Error');
            
            if (isNetworkError) {
                console.warn("Backend unreachable. Checking local mock storage for authentication.");
                
                const localUsers = getLocalUsers();
                const foundUser = localUsers.find(u => u.email === email && u.password === password);
                
                if (foundUser) {
                    const { password: _, ...safeUser } = foundUser;
                    localStorage.setItem('wati_user', JSON.stringify(safeUser));
                    return safeUser;
                }
                
                // If not found locally either
                throw new Error("Login failed. Backend is offline and user not found locally.");
            }

            // Rethrow valid auth errors
            throw e;
        }
    },

    logout: () => {
        localStorage.removeItem('wati_user');
        window.location.href = '/#/login';
        window.location.reload();
    },

    getCurrentUser: (): SaaSUser | null => {
        const stored = localStorage.getItem('wati_user');
        return stored ? JSON.parse(stored) : null;
    },

    // --- USER MANAGEMENT (RESELLER) ---
    
    getUsers: async (): Promise<SaaSUser[]> => {
        try {
            const response = await fetch(`${BACKEND_URL}/users`);
            if (!response.ok) throw new Error("Failed to fetch");
            return await response.json();
        } catch (e) {
            console.warn("Backend unreachable. Returning local mock users.");
            return getLocalUsers().map(({ password, ...u }) => u);
        }
    },

    createUser: async (user: Partial<SaaSUser>, password: string): Promise<SaaSUser> => {
        try {
            const response = await fetch(`${BACKEND_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, password, credits: 0 })
            });
            if(!response.ok) throw new Error("Failed to create user");
            return await response.json();
        } catch (e: any) {
             // Fallback: Save to local storage if server is down
             if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                 const newUser = {
                    ...user,
                    id: Math.random().toString(36).substr(2, 9),
                    password, // Store password locally for mock auth
                    credits: 0,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString()
                 };
                 const users = getLocalUsers();
                 users.push(newUser);
                 localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
                 
                 const { password: _, ...safeUser } = newUser as any;
                 return safeUser;
             }
             throw e;
        }
    },

    deleteUser: async (userId: string) => {
        try {
            await fetch(`${BACKEND_URL}/users/${userId}`, { method: 'DELETE' });
        } catch (e: any) {
             if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                 const users = getLocalUsers().filter(u => u.id !== userId);
                 localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
                 return;
             }
             throw e;
        }
    },

    addCredits: async (userId: string, amount: number) => {
        try {
            const response = await fetch(`${BACKEND_URL}/users/${userId}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            if (!response.ok) throw new Error("Failed to update credits");
        } catch (e: any) {
             // Fallback: Update local storage if server is down
             const isNetworkError = e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('Connection refused');
             
             if (isNetworkError) {
                 const users = getLocalUsers();
                 const idx = users.findIndex(u => u.id === userId);
                 if (idx >= 0) {
                     users[idx].credits = (users[idx].credits || 0) + amount;
                     localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
                     console.log("Local credits updated for user", userId, "New Balance:", users[idx].credits);
                     return;
                 }
             }
             throw e;
        }
    }
};
