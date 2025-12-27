
export const getBaseUrl = () => {
    const env = (import.meta as any).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
    if (env?.PROD) return window.location.origin;
    return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();
