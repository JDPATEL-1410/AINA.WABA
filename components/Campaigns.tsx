
import React, { useState, useEffect, useMemo } from 'react';
import { Send, FileText, CheckCircle, Clock, AlertCircle, RefreshCw, Plus, Trash2, Layout, MessagesSquare, X, Users, Play, BarChart as BarChartIcon, Image as ImageIcon, Video, Link, Phone, MessageSquare, Smartphone, Info, Calendar, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockWhatsappService } from '../services/mockWhatsappService';
import { whatsappApiService } from '../services/whatsappApiService';
import { storageService } from '../services/storageService';
import { Template, NewTemplateParams, Campaign, User, TemplateComponent, TemplateButton } from '../types';

export const Campaigns: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'TEMPLATES' | 'ANALYTICS'>('CAMPAIGNS');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [contacts, setContacts] = useState<User[]>([]);
    
    // Campaign Creation State
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
    const [newCampaign, setNewCampaign] = useState<{
        name: string;
        templateId: string;
        audienceFilter: string; // 'ALL' or 'TAG:...'
        headerMediaUrl: string; // For templates with Image/Video headers
        scheduledAt: string; // Date string for scheduling
    }>({ name: '', templateId: '', audienceFilter: 'ALL', headerMediaUrl: '', scheduledAt: '' });
    
    const [isSending, setIsSending] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Template Creation State (Builder)
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateCategory, setTemplateCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
    const [templateLanguage, setTemplateLanguage] = useState('en_US');
    const [templateBody, setTemplateBody] = useState('');
    
    // Advanced Template Components
    const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
    const [headerText, setHeaderText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [buttonType, setButtonType] = useState<'NONE' | 'QUICK_REPLY' | 'CALL_TO_ACTION'>('NONE');
    
    // Buttons Data
    const [quickReplies, setQuickReplies] = useState<string[]>(['']); // Max 3
    const [ctaButtons, setCtaButtons] = useState<{type: 'URL' | 'PHONE_NUMBER', text: string, value: string}[]>([{type: 'URL', text: '', value: ''}]); // Max 2

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        loadTemplates();
        setCampaigns(storageService.getCampaigns());
        setContacts(storageService.getContacts());
    };

    const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        const credentials = whatsappApiService.getCredentials();
        let data: Template[] = [];

        if (credentials && credentials.businessAccountId && credentials.accessToken) {
             try {
                data = await whatsappApiService.getTemplates(credentials);
             } catch (e) {
                 console.error("Failed to load templates", e);
             }
        }
        
        // Fallback to mock if no real templates found or no credentials
        if (data.length === 0) {
             data = await mockWhatsappService.getTemplates();
        }

        setTemplates(data);
        if (data.length > 0 && !newCampaign.templateId) {
            setNewCampaign(prev => ({ ...prev, templateId: data[0].id }));
        }
        setIsLoadingTemplates(false);
    };

    const getAudienceCount = (filter: string) => {
        if (filter === 'ALL') return contacts.length;
        if (filter.startsWith('TAG:')) {
            const tag = filter.split('TAG:')[1];
            return contacts.filter(c => c.tags.includes(tag)).length;
        }
        return 0;
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const handleSendCampaign = async () => {
        if (!newCampaign.name || !newCampaign.templateId) {
            setErrorMsg("Please fill in all campaign fields.");
            return;
        }

        const template = templates.find(t => t.id === newCampaign.templateId);
        if (!template) {
            setErrorMsg("Selected template not found.");
            return;
        }

        // Validate Media Header if present
        const headerComp = template.components?.find(c => c.type === 'HEADER');
        if (headerComp && (headerComp.format === 'IMAGE' || headerComp.format === 'VIDEO') && !newCampaign.headerMediaUrl) {
            setErrorMsg(`Please provide a ${headerComp.format} URL for the header.`);
            return;
        }

        const audienceCount = getAudienceCount(newCampaign.audienceFilter);
        if (audienceCount === 0) {
            setErrorMsg("Selected audience is empty.");
            return;
        }

        // Validate Scheduled Date
        if (newCampaign.scheduledAt) {
            const scheduledTime = new Date(newCampaign.scheduledAt).getTime();
            if (scheduledTime < Date.now()) {
                setErrorMsg("Scheduled time must be in the future.");
                return;
            }
        }

        setIsSending(true);
        setErrorMsg(null);
        
        try {
            const credentials = whatsappApiService.getCredentials();

            // Define Target Audience
            let targets: User[] = contacts;
            if (newCampaign.audienceFilter.startsWith('TAG:')) {
                const tag = newCampaign.audienceFilter.split('TAG:')[1];
                targets = contacts.filter(c => c.tags.includes(tag));
            }

            const isScheduled = !!newCampaign.scheduledAt;

            // Create Campaign Record
            const campaignRecord: Campaign = {
                id: Math.random().toString(36).substr(2, 9),
                name: newCampaign.name,
                templateName: template.name,
                language: template.language,
                audienceFilter: newCampaign.audienceFilter,
                status: isScheduled ? 'SCHEDULED' : 'SENDING',
                scheduledAt: isScheduled ? newCampaign.scheduledAt : undefined,
                stats: { total: targets.length, sent: 0, failed: 0 },
                createdAt: new Date().toISOString()
            };
            
            storageService.saveCampaign(campaignRecord);
            setCampaigns(prev => [campaignRecord, ...prev]);

            if (isScheduled) {
                // If scheduled, stop here (mock scheduling logic)
                setShowSuccess(true);
                setNewCampaign({ name: '', templateId: templates[0]?.id || '', audienceFilter: 'ALL', headerMediaUrl: '', scheduledAt: '' });
                setTimeout(() => setShowSuccess(false), 3000);
                setIsSending(false);
                return;
            }

            // Execute Sending (Loop)
            let sentCount = 0;
            let failedCount = 0;

            for (const contact of targets) {
                try {
                    const firstName = contact.name.split(' ')[0];
                    const components: any[] = [];

                    // Construct Header Component
                    if (headerComp) {
                        if (headerComp.format === 'IMAGE') {
                            components.push({
                                type: 'header',
                                parameters: [{ type: 'image', image: { link: newCampaign.headerMediaUrl } }]
                            });
                        } else if (headerComp.format === 'VIDEO') {
                            components.push({
                                type: 'header',
                                parameters: [{ type: 'video', video: { link: newCampaign.headerMediaUrl } }]
                            });
                        } else if (headerComp.format === 'TEXT' && headerComp.text?.includes('{{1}}')) {
                             // Assuming generic header var logic for simplicity
                             components.push({
                                type: 'header',
                                parameters: [{ type: 'text', text: 'Valued Customer' }] 
                            });
                        }
                    }

                    // Construct Body Component (Default logic: {{1}} = First Name)
                    // Check if body has variables
                    const bodyComp = template.components?.find(c => c.type === 'BODY');
                    if (bodyComp && bodyComp.text?.includes('{{1}}')) {
                        components.push({
                            type: "body",
                            parameters: [
                                { type: "text", text: firstName }
                            ]
                        });
                    }

                    if (credentials && credentials.accessToken && credentials.phoneNumberId) {
                        await whatsappApiService.sendTemplateMessage(
                            credentials, 
                            contact.phoneNumber, 
                            template.name, 
                            template.language,
                            components
                        );
                    } else {
                        // Simulate delay
                        await new Promise(r => setTimeout(r, 500));
                    }
                    sentCount++;
                } catch (e) {
                    failedCount++;
                    console.error(`Failed to send to ${contact.phoneNumber}`, e);
                }
                
                // Update Progress locally
                campaignRecord.stats.sent = sentCount;
                campaignRecord.stats.failed = failedCount;
                storageService.saveCampaign({...campaignRecord});
                setCampaigns(prev => prev.map(c => c.id === campaignRecord.id ? campaignRecord : c));
            }

            campaignRecord.status = 'COMPLETED';
            storageService.saveCampaign({...campaignRecord});
            setCampaigns(prev => prev.map(c => c.id === campaignRecord.id ? campaignRecord : c));

            setShowSuccess(true);
            setIsCreatingCampaign(false);
            setNewCampaign({ name: '', templateId: templates[0]?.id || '', audienceFilter: 'ALL', headerMediaUrl: '', scheduledAt: '' });
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (e: any) {
            setErrorMsg(e.message || "Failed to send campaign");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteCampaign = (id: string) => {
        if(!window.confirm("Are you sure you want to delete this campaign history?")) return;
        storageService.deleteCampaign(id);
        setCampaigns(prev => prev.filter(c => c.id !== id));
    };

    const handleCreateTemplate = async () => {
        if(!templateName || !templateBody) {
            setErrorMsg("Name and Body Text are required");
            return;
        }
        setIsCreatingTemplate(true);
        try {
            const credentials = whatsappApiService.getCredentials();
            if(!credentials?.businessAccountId) throw new Error("API Credentials Required. Please configure in Settings.");

            const components: TemplateComponent[] = [];

            // 1. Header
            if (headerType !== 'NONE') {
                const headerComp: TemplateComponent = { type: 'HEADER', format: headerType as any };
                if (headerType === 'TEXT') headerComp.text = headerText;
                components.push(headerComp);
            }

            // 2. Body
            components.push({ type: 'BODY', text: templateBody });

            // 3. Footer
            if (footerText) {
                components.push({ type: 'FOOTER', text: footerText });
            }

            // 4. Buttons
            if (buttonType === 'QUICK_REPLY') {
                const buttons: TemplateButton[] = quickReplies.filter(t => t).map(text => ({
                    type: 'QUICK_REPLY',
                    text: text
                }));
                if (buttons.length > 0) components.push({ type: 'BUTTONS', buttons });
            } else if (buttonType === 'CALL_TO_ACTION') {
                const buttons: TemplateButton[] = ctaButtons.filter(b => b.text && b.value).map(b => ({
                    type: b.type,
                    text: b.text,
                    url: b.type === 'URL' ? b.value : undefined,
                    phone_number: b.type === 'PHONE_NUMBER' ? b.value : undefined
                }));
                if (buttons.length > 0) components.push({ type: 'BUTTONS', buttons });
            }

            const newTemplatePayload: NewTemplateParams = {
                name: templateName.toLowerCase().replace(/\s+/g, '_'),
                category: templateCategory,
                language: templateLanguage,
                components: components,
                allow_category_change: true
            };

            await whatsappApiService.createTemplate(credentials, newTemplatePayload);
            setShowSuccess(true);
            
            // Reset Form
            setTemplateName('');
            setTemplateBody('');
            setTemplateCategory('MARKETING');
            setHeaderType('NONE');
            setFooterText('');
            setButtonType('NONE');
            setQuickReplies(['']);
            setCtaButtons([{type: 'URL', text: '', value: ''}]);

            loadTemplates();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setIsCreatingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (name: string) => {
        if(!window.confirm(`Are you sure you want to delete template: ${name}?`)) return;
        try {
            const credentials = whatsappApiService.getCredentials();
            if(!credentials?.businessAccountId) throw new Error("API Credentials Required");
            await whatsappApiService.deleteTemplate(credentials, name);
            loadTemplates();
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    // Analytics Calculations
    const analytics = useMemo(() => {
        const completed = campaigns.filter(c => c.status === 'COMPLETED' || c.status === 'FAILED');
        const total = completed.length;
        const totalTargeted = completed.reduce((acc, c) => acc + c.stats.total, 0);
        const totalSent = completed.reduce((acc, c) => acc + c.stats.sent, 0);
        const totalFailed = completed.reduce((acc, c) => acc + c.stats.failed, 0);
        const avgSuccessRate = totalTargeted > 0 ? Math.round((totalSent / totalTargeted) * 100) : 0;

        const chartData = completed.slice(0, 10).map(c => ({
            name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
            Sent: c.stats.sent,
            Failed: c.stats.failed,
            Total: c.stats.total
        })).reverse(); 

        const pieData = [
            { name: 'Successful', value: totalSent, color: '#25D366' },
            { name: 'Failed', value: totalFailed, color: '#ef4444' }
        ];

        return { total, totalTargeted, totalSent, totalFailed, avgSuccessRate, chartData, pieData, completed };
    }, [campaigns]);

    const currentTemplate = templates.find(t => t.id === newCampaign.templateId);
    const credentials = whatsappApiService.getCredentials();
    const usingRealApi = !!(credentials && credentials.businessAccountId);
    const uniqueTags = Array.from(new Set(contacts.flatMap(c => c.tags)));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Campaigns & Marketing</h1>
                    <p className="text-gray-500">Create rich marketing templates and send broadcasts</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={loadTemplates} 
                        className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                        Sync Templates
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('CAMPAIGNS')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'CAMPAIGNS' ? 'border-wa text-wa' : 'border-transparent text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        <Send className="w-4 h-4" />
                        Campaigns
                    </button>
                    <button
                        onClick={() => setActiveTab('TEMPLATES')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'TEMPLATES' ? 'border-wa text-wa' : 'border-transparent text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        <Layout className="w-4 h-4" />
                        Template Builder
                    </button>
                    <button
                        onClick={() => setActiveTab('ANALYTICS')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'ANALYTICS' ? 'border-wa text-wa' : 'border-transparent text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Analytics
                    </button>
                </nav>
            </div>

            {/* Status Messages */}
            {usingRealApi && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Connected to WhatsApp API.
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errorMsg}
                    </div>
                    <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4"/></button>
                </div>
            )}
            
            {showSuccess && (
                <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Action completed successfully!
                </div>
            )}

            {activeTab === 'CAMPAIGNS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Create Campaign Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-wa" /> New Campaign
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input 
                                    type="text" 
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent" 
                                    placeholder="e.g. Summer Sale Blast" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                                <select 
                                    value={newCampaign.audienceFilter}
                                    onChange={(e) => setNewCampaign({...newCampaign, audienceFilter: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="ALL">All Contacts</option>
                                    {uniqueTags.map(tag => (
                                        <option key={tag} value={`TAG:${tag}`}>Tag: {tag}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Targeting {getAudienceCount(newCampaign.audienceFilter)} contacts
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                                <select 
                                    value={newCampaign.templateId}
                                    onChange={(e) => setNewCampaign({...newCampaign, templateId: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    disabled={isLoadingTemplates}
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dynamic Fields based on Template */}
                            {currentTemplate?.components?.some(c => c.type === 'HEADER' && (c.format === 'IMAGE' || c.format === 'VIDEO')) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Header Media URL ({currentTemplate.components.find(c => c.type === 'HEADER')?.format})
                                    </label>
                                    <input 
                                        type="url"
                                        value={newCampaign.headerMediaUrl}
                                        onChange={(e) => setNewCampaign({...newCampaign, headerMediaUrl: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Direct link to the media file required for the header.</p>
                                </div>
                            )}

                            {/* Scheduling */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" /> Schedule (Optional)
                                </label>
                                <input 
                                    type="datetime-local"
                                    value={newCampaign.scheduledAt}
                                    onChange={(e) => setNewCampaign({...newCampaign, scheduledAt: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent"
                                    min={getMinDateTime()}
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank to send immediately.</p>
                            </div>

                            {currentTemplate && (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Template Preview</h4>
                                    <div className="space-y-2 text-sm text-gray-800">
                                        {currentTemplate.components?.map((c, i) => {
                                            if (c.type === 'HEADER') return <div key={i} className="font-bold text-gray-900 border-b border-blue-200 pb-1 mb-1">{c.format === 'TEXT' ? c.text : `[${c.format} HEADER]`}</div>;
                                            if (c.type === 'BODY') return <div key={i} className="whitespace-pre-wrap">{c.text}</div>;
                                            if (c.type === 'FOOTER') return <div key={i} className="text-xs text-gray-500 pt-1">{c.text}</div>;
                                            if (c.type === 'BUTTONS') return <div key={i} className="flex gap-2 mt-2">{c.buttons?.map((b, idx) => <span key={idx} className="bg-white border border-blue-200 px-2 py-1 rounded text-xs text-blue-600">{b.text}</span>)}</div>;
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button 
                                    onClick={handleSendCampaign}
                                    disabled={isSending}
                                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
                                        ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-wa text-white hover:bg-wa-dark shadow-md'}
                                    `}
                                >
                                    {isSending ? (
                                        <><Clock className="w-5 h-5 animate-spin" /> Processing...</>
                                    ) : (
                                        newCampaign.scheduledAt ? <><Calendar className="w-5 h-5" /> Schedule Campaign</> : <><Send className="w-5 h-5" /> Launch Campaign</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Campaign History List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Campaign History</h3>
                        {campaigns.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <BarChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No campaigns yet. Launch your first one!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {campaigns.map(camp => (
                                    <div key={camp.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">{camp.name}</h4>
                                                <p className="text-sm text-gray-500">Template: {camp.templateName}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                                    ${camp.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                                      camp.status === 'SCHEDULED' ? 'bg-orange-100 text-orange-700' : 
                                                      camp.status === 'SENDING' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                    {camp.status}
                                                </span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(camp.id); }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title={camp.status === 'SCHEDULED' ? 'Cancel Schedule' : 'Delete Campaign'}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar (Only show if not scheduled) */}
                                        {camp.status !== 'SCHEDULED' && (
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                                <div 
                                                    className="bg-wa h-2.5 rounded-full transition-all duration-500" 
                                                    style={{ width: `${(camp.stats.sent / camp.stats.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-gray-50 rounded-lg p-2">
                                                <span className="block text-xl font-bold text-gray-900">{camp.stats.total}</span>
                                                <span className="text-xs text-gray-500 uppercase">Target</span>
                                            </div>
                                            {camp.status === 'SCHEDULED' ? (
                                                <div className="col-span-2 bg-orange-50 rounded-lg p-2 flex items-center justify-center gap-2 text-orange-800">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        Scheduled for: {new Date(camp.scheduledAt!).toLocaleString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-green-50 rounded-lg p-2">
                                                        <span className="block text-xl font-bold text-green-700">{camp.stats.sent}</span>
                                                        <span className="text-xs text-green-600 uppercase">Sent</span>
                                                    </div>
                                                    <div className="bg-red-50 rounded-lg p-2">
                                                        <span className="block text-xl font-bold text-red-700">{camp.stats.failed}</span>
                                                        <span className="text-xs text-red-600 uppercase">Failed</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                                            <span>Audience: {camp.audienceFilter}</span>
                                            <span>Created: {new Date(camp.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'TEMPLATES' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
                     {/* Builder Form */}
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-wa" /> Template Builder
                            </h3>
                            {!usingRealApi && <span className="text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded">API Not Configured</span>}
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Basics */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">1. Basics</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                        <input 
                                            type="text" 
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono" 
                                            placeholder="e.g. summer_promo" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                        <select 
                                            value={templateCategory}
                                            onChange={(e) => setTemplateCategory(e.target.value as any)}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                        >
                                            <option value="MARKETING">Marketing</option>
                                            <option value="UTILITY">Utility</option>
                                            <option value="AUTHENTICATION">Authentication</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Header */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">2. Header (Optional)</h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Header Type</label>
                                    <div className="flex gap-2">
                                        {['NONE', 'TEXT', 'IMAGE', 'VIDEO'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setHeaderType(type as any)}
                                                className={`px-3 py-1.5 rounded text-xs font-medium border ${headerType === type ? 'bg-wa text-white border-wa' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {headerType === 'TEXT' && (
                                    <input 
                                        type="text" 
                                        value={headerText}
                                        onChange={(e) => setHeaderText(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                        placeholder="Enter header text..." 
                                    />
                                )}
                                {(headerType === 'IMAGE' || headerType === 'VIDEO') && (
                                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                        Media will be uploaded when you send the campaign.
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Body */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">3. Body</h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Message Text</label>
                                    <textarea 
                                        value={templateBody}
                                        onChange={(e) => setTemplateBody(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-wa focus:border-transparent h-32" 
                                        placeholder="Hello {{1}}, check out our new offers..." 
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Use {'{{1}}'}, {'{{2}}'} for variables.</p>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Footer */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">4. Footer (Optional)</h4>
                                <input 
                                    type="text" 
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                    placeholder="e.g. Reply STOP to unsubscribe" 
                                />
                            </div>

                            <hr className="border-gray-100" />

                            {/* Buttons */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">5. Buttons (Optional)</h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Button Type</label>
                                    <div className="flex gap-2 mb-3">
                                        {['NONE', 'QUICK_REPLY', 'CALL_TO_ACTION'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setButtonType(type as any)}
                                                className={`px-3 py-1.5 rounded text-xs font-medium border ${buttonType === type ? 'bg-wa text-white border-wa' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {type.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {buttonType === 'QUICK_REPLY' && (
                                        <div className="space-y-2">
                                            {quickReplies.map((qr, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input 
                                                        value={qr}
                                                        onChange={(e) => {
                                                            const newQr = [...quickReplies];
                                                            newQr[idx] = e.target.value;
                                                            setQuickReplies(newQr);
                                                        }}
                                                        maxLength={25}
                                                        className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" 
                                                        placeholder={`Button ${idx + 1}`} 
                                                    />
                                                    {quickReplies.length > 1 && (
                                                        <button onClick={() => setQuickReplies(quickReplies.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                    )}
                                                </div>
                                            ))}
                                            {quickReplies.length < 3 && (
                                                <button onClick={() => setQuickReplies([...quickReplies, ''])} className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                    <Plus className="w-3 h-3"/> Add Button
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {buttonType === 'CALL_TO_ACTION' && (
                                        <div className="space-y-3">
                                            {ctaButtons.map((btn, idx) => (
                                                <div key={idx} className="border border-gray-200 rounded p-3 space-y-2 bg-gray-50">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-gray-500">Action {idx + 1}</span>
                                                        {ctaButtons.length > 1 && <button onClick={() => setCtaButtons(ctaButtons.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 className="w-3 h-3"/></button>}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <select 
                                                            value={btn.type}
                                                            onChange={(e) => {
                                                                const newCta = [...ctaButtons];
                                                                newCta[idx].type = e.target.value as any;
                                                                setCtaButtons(newCta);
                                                            }}
                                                            className="border border-gray-300 rounded p-2 text-xs"
                                                        >
                                                            <option value="URL">Website</option>
                                                            <option value="PHONE_NUMBER">Phone</option>
                                                        </select>
                                                        <input 
                                                            value={btn.text}
                                                            onChange={(e) => {
                                                                const newCta = [...ctaButtons];
                                                                newCta[idx].text = e.target.value;
                                                                setCtaButtons(newCta);
                                                            }}
                                                            placeholder="Button Text"
                                                            className="col-span-2 border border-gray-300 rounded p-2 text-xs"
                                                        />
                                                    </div>
                                                    <input 
                                                        value={btn.value}
                                                        onChange={(e) => {
                                                            const newCta = [...ctaButtons];
                                                            newCta[idx].value = e.target.value;
                                                            setCtaButtons(newCta);
                                                        }}
                                                        placeholder={btn.type === 'URL' ? 'https://example.com' : '+15551234567'}
                                                        className="w-full border border-gray-300 rounded p-2 text-xs font-mono"
                                                    />
                                                </div>
                                            ))}
                                            {ctaButtons.length < 2 && (
                                                <button onClick={() => setCtaButtons([...ctaButtons, {type: 'URL', text: '', value: ''}])} className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                    <Plus className="w-3 h-3"/> Add Action
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <button 
                                onClick={handleCreateTemplate}
                                disabled={isCreatingTemplate || !usingRealApi}
                                className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                            >
                                {isCreatingTemplate ? <Clock className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                                Submit Template for Review
                            </button>
                        </div>
                     </div>

                     {/* Live Preview */}
                     <div className="flex flex-col items-center justify-center bg-gray-100 rounded-xl border border-gray-200 p-8">
                        <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wide">Live Preview</h3>
                        
                        {/* Smartphone Frame */}
                        <div className="w-[300px] bg-white rounded-[30px] border-[8px] border-gray-800 overflow-hidden shadow-2xl relative">
                            {/* Top Bar */}
                            <div className="h-14 bg-wa-dark flex items-center px-4 gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                                <div className="flex-1">
                                    <div className="h-2 w-24 bg-white/20 rounded mb-1"></div>
                                    <div className="h-1.5 w-16 bg-white/10 rounded"></div>
                                </div>
                            </div>
                            
                            {/* Chat Area */}
                            <div className="h-[450px] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] p-3 overflow-y-auto">
                                <div className="bg-white rounded-lg rounded-tl-none p-2 shadow-sm max-w-[90%]">
                                    {/* Header */}
                                    {headerType !== 'NONE' && (
                                        <div className="mb-2 rounded-lg overflow-hidden">
                                            {headerType === 'TEXT' && <p className="font-bold text-sm text-gray-900">{headerText || 'Header Text'}</p>}
                                            {headerType === 'IMAGE' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400"><ImageIcon className="w-8 h-8"/></div>}
                                            {headerType === 'VIDEO' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400"><Play className="w-8 h-8"/></div>}
                                        </div>
                                    )}
                                    
                                    {/* Body */}
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {templateBody || 'Your message text will appear here...'}
                                    </p>
                                    
                                    {/* Footer */}
                                    {footerText && (
                                        <p className="text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100">{footerText}</p>
                                    )}
                                    
                                    {/* Timestamp */}
                                    <div className="text-[9px] text-gray-400 text-right mt-1">12:00 PM</div>
                                </div>

                                {/* Buttons */}
                                {buttonType !== 'NONE' && (
                                    <div className="mt-1 space-y-1 max-w-[90%]">
                                        {buttonType === 'QUICK_REPLY' && quickReplies.filter(Boolean).map((qr, i) => (
                                            <div key={i} className="bg-white rounded-lg p-2.5 text-center text-wa font-medium text-sm shadow-sm cursor-pointer">
                                                {qr}
                                            </div>
                                        ))}
                                        {buttonType === 'CALL_TO_ACTION' && ctaButtons.filter(b => b.text).map((btn, i) => (
                                            <div key={i} className="bg-white rounded-lg p-2.5 text-center text-blue-500 font-medium text-sm shadow-sm cursor-pointer flex items-center justify-center gap-2">
                                                {btn.type === 'URL' ? <Link className="w-3 h-3"/> : <Phone className="w-3 h-3"/>}
                                                {btn.text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
            )}
            
            {activeTab === 'ANALYTICS' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Summary Cards with enhanced UI */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Sent Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Sent</p>
                                <h3 className="text-2xl font-bold text-gray-900">{analytics.totalSent.toLocaleString()}</h3>
                                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full mt-2 inline-block">Messages delivered</span>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Campaigns Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Campaigns</p>
                                <h3 className="text-2xl font-bold text-gray-900">{analytics.total.toLocaleString()}</h3>
                                <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-full mt-2 inline-block">Total Completed</span>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                                <Layout className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Success Rate Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Avg Success Rate</p>
                                <h3 className="text-2xl font-bold text-gray-900">{analytics.avgSuccessRate}%</h3>
                                <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-3">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${analytics.avgSuccessRate}%` }}></div>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Failed Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Failed</p>
                                <h3 className="text-2xl font-bold text-gray-900">{analytics.totalFailed.toLocaleString()}</h3>
                                <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full mt-2 inline-block">Delivery failures</span>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/20">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Charts with enhanced UI */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Bar Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Campaigns Performance</h3>
                            <div className="h-80">
                                {analytics.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                                            <Tooltip 
                                                cursor={{fill: '#f9fafb'}}
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                                            <Bar dataKey="Sent" fill="#25D366" radius={[4, 4, 0, 0]} name="Successful" />
                                            <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p>No campaign data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <h3 className="text-lg font-bold text-gray-900 mb-6">Overall Delivery</h3>
                             <div className="h-80 relative">
                                {analytics.totalSent > 0 || analytics.totalFailed > 0 ? (
                                     <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={110}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {analytics.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                     </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p>No data available</p>
                                    </div>
                                )}
                                {/* Center text for Pie Chart */}
                                {(analytics.totalSent > 0 || analytics.totalFailed > 0) && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-bold text-gray-900">{analytics.avgSuccessRate}%</span>
                                        <span className="text-xs text-gray-500 uppercase font-medium">Success</span>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Detailed List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">Detailed Campaign Metrics</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-xl">Campaign Name</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-center">Target</th>
                                        <th className="px-6 py-4 text-center">Sent</th>
                                        <th className="px-6 py-4 text-center">Failed</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl">Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {analytics.completed.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                No completed campaigns found.
                                            </td>
                                        </tr>
                                    ) : (
                                        analytics.completed.map((camp) => (
                                            <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">{camp.name}</td>
                                                <td className="px-6 py-4 text-gray-500">{new Date(camp.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{camp.stats.total}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-green-600 font-bold">{camp.stats.sent}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {camp.stats.failed > 0 ? (
                                                        <span className="text-red-500 font-bold">{camp.stats.failed}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                        ${(camp.stats.total > 0 && (camp.stats.sent/camp.stats.total) >= 0.9) ? 'bg-green-100 text-green-800' : 
                                                          (camp.stats.total > 0 && (camp.stats.sent/camp.stats.total) >= 0.5) ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                        {camp.stats.total > 0 ? Math.round((camp.stats.sent / camp.stats.total) * 100) : 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
