
import React, { useState, useEffect } from 'react';
import {
    Save, Facebook, CheckCircle, AlertTriangle, Loader2,
    Terminal, Zap, LogOut, Smartphone, Shield, Copy,
    ChevronRight, Lock, Store, Globe, Mail, MapPin,
    LayoutList, User, Briefcase, HelpCircle
} from 'lucide-react';
import { whatsappApiService } from '../services/whatsappApiService';
import { authService } from '../services/authService';
import { ApiCredentials, WhatsAppPhoneNumber, BusinessProfile } from '../types';

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CONNECTION' | 'PROFILE' | 'PHONE'>('CONNECTION');
    const [credentials, setCredentials] = useState<ApiCredentials>({
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        businessAccountId: '',
        facebookPageId: '',
        facebookPageAccessToken: ''
    });

    // Onboarding Flow State
    const [step, setStep] = useState<'CONNECT' | 'SELECT_PHONE' | 'REGISTER' | 'DONE'>('CONNECT');
    const [availablePhones, setAvailablePhones] = useState<WhatsAppPhoneNumber[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<WhatsAppPhoneNumber | null>(null);
    const [registrationPin, setRegistrationPin] = useState('');

    // Profile State
    const [profile, setProfile] = useState<Partial<BusinessProfile>>({});
    const [loadingProfile, setLoadingProfile] = useState(false);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sdkLoaded, setSdkLoaded] = useState(false);

    useEffect(() => {
        const stored = whatsappApiService.getCredentials();
        if (stored) {
            setCredentials(stored);
            if (stored.phoneNumberId && stored.accessToken) {
                setStep('DONE');
            } else if (stored.wabaId && stored.accessToken) {
                fetchPhoneNumbers(stored.wabaId, stored.accessToken);
            }
        }

        // Load Facebook SDK
        const initFacebook = () => {
            if (window.FB) {
                try {
                    window.FB.init({
                        appId: '1259467762904365', // Updated App ID
                        autoLogAppEvents: true,
                        xfbml: true,
                        version: 'v18.0'
                    });
                    setSdkLoaded(true);
                } catch (e) {
                    console.warn("FB Init warning:", e);
                    setSdkLoaded(true); // Assume loaded if it throws 'already initialized'
                }
            }
        };

        if (!document.getElementById('facebook-jssdk')) {
            window.fbAsyncInit = function () {
                initFacebook();
            };
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";
            document.body.appendChild(script);
        } else {
            // If script is already in DOM (navigating back to this page), ensure init is called
            initFacebook();
        }
    }, []);

    const getBaseUrl = () => (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

    // --- TAB 1: CONNECT FACEBOOK ---
    const launchWhatsAppSignup = () => {
        const user = authService.getCurrentUser();
        if (!user) { setMessage({ type: 'error', text: 'Please login first.' }); return; }

        // ERROR FIX: "FB.login can no longer be called from http pages"
        // If we are on localhost (HTTP), we MUST skip the actual SDK call and simulate.
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            const confirmSim = window.confirm(
                "⚠️ HTTPS REQUIRED\n\n" +
                "Meta requires HTTPS for real Facebook Login.\n\n" +
                "Since you are testing locally, would you like to use SIMULATION MODE to test the dashboard flow?"
            );
            if (confirmSim) {
                setIsProcessing(true);
                setTimeout(() => exchangeToken('mock_demo_code', user.id), 800);
            }
            return;
        }

        // ERROR FIX: "FB.login() called before FB.init()"
        // Ensure SDK is actually loaded before calling login
        if (!window.FB || !sdkLoaded) {
            const confirmSim = window.confirm(
                "Facebook SDK not ready yet (or blocked by ad-blocker).\n\n" +
                "Would you like to SIMULATE a successful connection for this Demo?"
            );
            if (confirmSim) {
                setIsProcessing(true);
                setTimeout(() => exchangeToken('mock_demo_code', user.id), 1000);
            } else {
                setMessage({ type: 'error', text: 'Facebook SDK loading failed. Please check connection.' });
            }
            return;
        }

        setIsProcessing(true);

        const prefilledData = {
            business_name: user.name,
            email: user.email,
            currency: 'USD',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            website_optional: true,
            app_only_install: true
        };

        try {
            window.FB.login(function (response: any) {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    exchangeToken(code, user.id);
                } else {
                    setIsProcessing(false);
                    console.log('User cancelled login or did not fully authorize.');
                }
            }, {
                config_id: '1403545044471651', // Updated with your real Configuration ID
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    feature: 'whatsapp_embedded_signup',
                    sessionInfoVersion: '2',
                    setup: prefilledData
                }
            });
        } catch (e) {
            console.error("FB Login Error", e);
            setIsProcessing(false);
            const confirmSim = window.confirm(
                "Meta API Error: Looking for 'Config ID'. Note: This is DIFFERENT from your App ID.\n\n" +
                "Would you like to SIMULATE a connection for now to continue testing?"
            );
            if (confirmSim) {
                setIsProcessing(true);
                exchangeToken('mock_demo_code', user.id);
            }
        }
    };

    const exchangeToken = async (code: string, userId: string) => {
        try {
            const response = await fetch(`${getBaseUrl()}/api/auth/exchange-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, userId })
            });
            const data = await response.json();
            if (data.success && data.credentials) {
                const newCreds = { ...credentials, ...data.credentials };
                setCredentials(newCreds);
                whatsappApiService.saveCredentials(newCreds);
                await fetchPhoneNumbers(newCreds.wabaId, newCreds.accessToken);
            } else {
                setMessage({ type: 'error', text: 'Failed to connect account.' });
                setIsProcessing(false);
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error.' });
            setIsProcessing(false);
        }
    };

    const fetchPhoneNumbers = async (wabaId: string, accessToken: string) => {
        try {
            const response = await fetch(`${getBaseUrl()}/api/whatsapp/phone-numbers?wabaId=${wabaId}`);
            const data = await response.json();
            if (data.data) {
                setAvailablePhones(data.data);
                setStep('SELECT_PHONE');
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to fetch phone numbers.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectPhone = (phone: WhatsAppPhoneNumber) => {
        setSelectedPhone(phone);
        if (phone.code_verification_status === 'VERIFIED') {
            completeSetup(phone);
        } else {
            setStep('REGISTER');
        }
    };

    const handleRegisterPhone = async () => {
        if (!selectedPhone || !registrationPin || registrationPin.length !== 6) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`${getBaseUrl()}/api/whatsapp/register-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneId: selectedPhone.id, pin: registrationPin })
            });
            const data = await response.json();
            if (data.success) {
                completeSetup(selectedPhone);
            } else {
                setMessage({ type: 'error', text: 'Registration failed.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Error registering.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const completeSetup = (phone: WhatsAppPhoneNumber) => {
        const finalCreds = { ...credentials, phoneNumberId: phone.id };
        setCredentials(finalCreds);
        whatsappApiService.saveCredentials(finalCreds);
        setStep('DONE');
        setMessage({ type: 'success', text: 'Setup Complete!' });
    };

    // --- TAB 2: PROFILE MANAGEMENT ---
    const loadProfile = async () => {
        if (!credentials.accessToken) return;
        setLoadingProfile(true);
        try {
            const data = await whatsappApiService.getBusinessProfile(credentials);
            setProfile(data);
        } catch (e) { console.error(e); }
        finally { setLoadingProfile(false); }
    };

    const handleUpdateProfile = async () => {
        setIsProcessing(true);
        try {
            await whatsappApiService.updateBusinessProfile(credentials, profile);
            setMessage({ type: 'success', text: 'Profile updated successfully on WhatsApp!' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'PROFILE') loadProfile();
    }, [activeTab]);

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings & Integration</h1>
                    <p className="text-gray-500">Manage your WhatsApp Business Account connection</p>
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto"><div className="w-4 h-4">✕</div></button>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('CONNECTION')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === 'CONNECTION' ? 'border-wa text-wa bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Zap className="w-4 h-4" /> Connection
                    </button>
                    <button
                        onClick={() => setActiveTab('PROFILE')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === 'PROFILE' ? 'border-wa text-wa bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Store className="w-4 h-4" /> Business Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('PHONE')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === 'PHONE' ? 'border-wa text-wa bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Smartphone className="w-4 h-4" /> Phone Number
                    </button>
                </div>

                <div className="p-8">
                    {/* CONNECTION TAB */}
                    {activeTab === 'CONNECTION' && (
                        <div className="max-w-xl mx-auto text-center">
                            {step === 'DONE' ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-emerald-900 mb-2">WhatsApp Connected</h3>
                                    <p className="text-emerald-700 mb-6">Your business account is linked.</p>
                                    <div className="grid grid-cols-1 gap-3 text-left bg-white rounded-lg p-4 border border-emerald-100 shadow-sm mb-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase">WABA ID</span>
                                            <div className="font-mono text-sm">{credentials.wabaId}</div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Phone ID</span>
                                            <div className="font-mono text-sm">{credentials.phoneNumberId}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => { setCredentials({} as any); setStep('CONNECT'); whatsappApiService.saveCredentials({} as any); }} className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center justify-center gap-2">
                                        <LogOut className="w-4 h-4" /> Disconnect
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {step === 'CONNECT' && (
                                        <>
                                            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto"><Facebook className="w-8 h-8 text-[#1877F2]" /></div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">Link WhatsApp Account</h3>
                                            <p className="text-gray-500 mb-2">Use official Facebook Login to connect your business.</p>
                                            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg mb-8 max-w-sm mx-auto text-left flex gap-2">
                                                <HelpCircle className="w-4 h-4 shrink-0" />
                                                <p>If the popup doesn't open, ensure your domain is whitelisted in Meta App Settings. For this demo, clicking Continue will simulate a connection if the SDK is blocked.</p>
                                            </div>

                                            <button onClick={launchWhatsAppSignup} disabled={isProcessing} className="w-full bg-[#1877F2] text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#166fe5]">
                                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Facebook className="w-5 h-5" />} Continue with Facebook
                                            </button>
                                        </>
                                    )}
                                    {step === 'SELECT_PHONE' && (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-gray-900">Select Number</h3>
                                            {availablePhones.map(phone => (
                                                <button key={phone.id} onClick={() => handleSelectPhone(phone)} className="w-full p-4 border rounded-xl hover:border-wa flex justify-between items-center">
                                                    <span className="font-mono">{phone.display_phone_number}</span>
                                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {step === 'REGISTER' && (
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-gray-900">Enter PIN</h3>
                                            <input type="text" maxLength={6} value={registrationPin} onChange={e => setRegistrationPin(e.target.value)} className="w-full text-center text-2xl tracking-widest border-2 rounded-xl py-3" placeholder="000000" />
                                            <button onClick={handleRegisterPhone} className="w-full bg-wa text-white py-3 rounded-xl font-bold">Register</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'PROFILE' && (
                        loadingProfile ? <div className="text-center p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-wa" /></div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">About Text</label>
                                        <input value={profile.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Business Description" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                        <div className="flex gap-2">
                                            <MapPin className="w-5 h-5 text-gray-400 mt-2" />
                                            <textarea value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" rows={2} placeholder="Full Address" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry / Vertical</label>
                                        <div className="flex gap-2">
                                            <Briefcase className="w-5 h-5 text-gray-400 mt-2" />
                                            <select value={profile.vertical || ''} onChange={e => setProfile({ ...profile, vertical: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm">
                                                <option value="RETAIL">Retail</option>
                                                <option value="PROFESSIONAL_SERVICES">Professional Services</option>
                                                <option value="FINANCE">Finance</option>
                                                <option value="EDUCATION">Education</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                                        <div className="flex gap-2">
                                            <Mail className="w-5 h-5 text-gray-400 mt-2" />
                                            <input value={profile.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="support@business.com" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label>
                                        <div className="flex gap-2">
                                            <Globe className="w-5 h-5 text-gray-400 mt-2" />
                                            <input value={profile.websites?.[0] || ''} onChange={e => setProfile({ ...profile, websites: [e.target.value] })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="https://..." />
                                        </div>
                                    </div>
                                    <div className="pt-6">
                                        <button onClick={handleUpdateProfile} disabled={isProcessing} className="w-full bg-wa text-white py-3 rounded-lg font-bold shadow-md hover:bg-wa-dark flex items-center justify-center gap-2">
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* PHONE TAB */}
                    {activeTab === 'PHONE' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{credentials.phoneNumberId ? 'Primary Number' : 'No Number Linked'}</h3>
                                        <p className="text-sm text-gray-500 font-mono">{credentials.phoneNumberId || '---'}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Connected</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Quality Rating</div>
                                        <div className="text-lg font-bold text-green-600 flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> HIGH</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Messaging Limit</div>
                                        <div className="text-lg font-bold text-gray-800">1K / 24h</div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Two-Step Verification</h4>
                                    <div className="flex gap-3">
                                        <input type="password" placeholder="New 6-digit PIN" maxLength={6} className="flex-1 border border-gray-300 rounded-lg px-4" />
                                        <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm">Update PIN</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Required for registering your number on new devices.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
