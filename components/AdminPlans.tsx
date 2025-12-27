
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Tag, Loader2, DollarSign, Package, Check, Layers, Coins } from 'lucide-react';
import { billingService } from '../services/billingService';
import { CreditPack, SubscriptionPlan } from '../types';

export const AdminPlans: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'SUBSCRIPTION' | 'CREDITS'>('SUBSCRIPTION');
    const [packs, setPacks] = useState<CreditPack[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    
    // New Forms - Defaults to INR
    const [newPack, setNewPack] = useState({ name: '', credits: 1000, price: 500, currency: 'INR', is_popular: false });
    const [newPlan, setNewPlan] = useState({ 
        name: '', price: 999, currency: 'INR', contact_limit: 1000, daily_message_limit: 500, features: '' 
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [packsData, plansData] = await Promise.all([
                billingService.getCreditPacks(),
                billingService.getSubscriptionPlans()
            ]);
            setPacks(packsData);
            setPlans(plansData);
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const getApiUrl = () => (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

    const handleCreatePack = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await fetch(`${getApiUrl()}/api/billing/packs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPack)
            });
            setIsModalOpen(false);
            setNewPack({ name: '', credits: 1000, price: 500, currency: 'INR', is_popular: false });
            loadData();
        } catch (e) { alert("Failed to create pack (Backend might be offline)"); } finally { setCreating(false); }
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await fetch(`${getApiUrl()}/api/billing/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPlan,
                    features: newPlan.features.split(',').map(f => f.trim()).filter(Boolean)
                })
            });
            setIsModalOpen(false);
            setNewPlan({ name: '', price: 999, currency: 'INR', contact_limit: 1000, daily_message_limit: 500, features: '' });
            loadData();
        } catch (e) { alert("Failed to create plan (Backend might be offline)"); } finally { setCreating(false); }
    };

    const handleDelete = async (id: string | number, type: 'pack' | 'plan') => {
        if(!window.confirm(`Delete this ${type}?`)) return;
        try {
            await fetch(`${getApiUrl()}/api/billing/${type}s/${id}`, { method: 'DELETE' });
            loadData();
        } catch (e) { alert("Failed to delete"); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Plans & Pricing</h1>
                    <p className="text-gray-500">Configure subscription tiers and credit top-ups</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add New {activeTab === 'SUBSCRIPTION' ? 'Plan' : 'Pack'}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('SUBSCRIPTION')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'SUBSCRIPTION' ? 'border-wa text-wa' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Layers className="w-4 h-4" /> Subscription Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('CREDITS')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'CREDITS' ? 'border-wa text-wa' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Coins className="w-4 h-4" /> Credit Packs
                    </button>
                </nav>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-wa w-8 h-8" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    {activeTab === 'SUBSCRIPTION' ? (
                                        <>
                                            <th className="px-6 py-4">Price / Month</th>
                                            <th className="px-6 py-4">Limits</th>
                                            <th className="px-6 py-4">Features</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4">Credits</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Type</th>
                                        </>
                                    )}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === 'SUBSCRIPTION' ? (
                                    plans.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No active plans.</td></tr> :
                                    plans.map((plan) => (
                                        <tr key={plan.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{plan.name}</td>
                                            <td className="px-6 py-4 text-green-600 font-medium">₹{plan.price}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-500">
                                                    <div>Contacts: <span className="font-mono font-bold text-gray-700">{plan.contact_limit}</span></div>
                                                    <div>Daily Msgs: <span className="font-mono font-bold text-gray-700">{plan.daily_message_limit}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                                {plan.features?.join(', ')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDelete(plan.id, 'plan')} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    packs.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No active packs.</td></tr> :
                                    packs.map((pack) => (
                                        <tr key={pack.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{pack.name}</td>
                                            <td className="px-6 py-4 font-mono">{pack.credits.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-medium text-green-600">₹{pack.price}</td>
                                            <td className="px-6 py-4">
                                                {pack.popular && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center w-fit gap-1"><Tag className="w-3 h-3" /> POPULAR</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDelete(pack.id, 'pack')} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">{activeTab === 'SUBSCRIPTION' ? 'Create Subscription Plan' : 'Create Credit Pack'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={activeTab === 'SUBSCRIPTION' ? handleCreatePlan : handleCreatePack} className="p-6 space-y-4">
                            {activeTab === 'SUBSCRIPTION' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                                        <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" placeholder="e.g. ENTERPRISE" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (Monthly ₹)</label>
                                            <input required type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Limit</label>
                                            <input required type="number" value={newPlan.contact_limit} onChange={e => setNewPlan({...newPlan, contact_limit: parseInt(e.target.value)})} className="w-full border rounded-lg p-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Daily Message Limit</label>
                                        <input required type="number" value={newPlan.daily_message_limit} onChange={e => setNewPlan({...newPlan, daily_message_limit: parseInt(e.target.value)})} className="w-full border rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
                                        <textarea value={newPlan.features} onChange={e => setNewPlan({...newPlan, features: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" rows={2} placeholder="Priority Support, API Access..." />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pack Name</label>
                                        <input required type="text" value={newPack.name} onChange={e => setNewPack({...newPack, name: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" placeholder="e.g. Mega Bundle" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                                            <input required type="number" value={newPack.credits} onChange={e => setNewPack({...newPack, credits: parseInt(e.target.value)})} className="w-full border rounded-lg p-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                            <input required type="number" value={newPack.price} onChange={e => setNewPack({...newPack, price: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <input type="checkbox" id="popular" checked={newPack.is_popular} onChange={e => setNewPack({...newPack, is_popular: e.target.checked})} className="rounded text-wa focus:ring-wa" />
                                        <label htmlFor="popular" className="text-sm text-gray-700 font-medium">Mark as Popular</label>
                                    </div>
                                </>
                            )}
                            <div className="pt-4">
                                <button type="submit" disabled={creating} className="w-full bg-wa text-white py-2.5 rounded-lg hover:bg-wa-dark font-medium flex items-center justify-center gap-2">
                                    {creating ? <Loader2 className="animate-spin w-4 h-4"/> : <Plus className="w-4 h-4"/>} Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
