
import React, { useEffect, useState } from 'react';
import {
    Search, Filter, MoreVertical, Coins, Ban, LogIn, CheckCircle, XCircle,
    ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { SaaSUser } from '../types';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../services/apiConfig';

export const AdminClients: React.FC = () => {
    const [clients, setClients] = useState<SaaSUser[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    // Credit Modal State
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<SaaSUser | null>(null);
    const [creditAmount, setCreditAmount] = useState<string>('');
    const [creditType, setCreditType] = useState<'ADD' | 'DEDUCT'>('ADD');
    const [creditReason, setCreditReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await adminService.getClients();
            setClients(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleImpersonate = (client: SaaSUser) => {
        if (window.confirm(`⚠️ Security Warning\n\nYou are about to log in as ${client.name}.\nAll actions will be recorded in the audit log.\n\nContinue?`)) {
            localStorage.setItem('wati_user', JSON.stringify(client));
            window.location.href = '/';
        }
    };

    const openCreditModal = (client: SaaSUser) => {
        setSelectedClient(client);
        setCreditAmount('');
        setCreditType('ADD');
        setCreditReason('');
        setIsCreditModalOpen(true);
    };

    const handleSubmitCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient || !creditAmount) return;

        setIsProcessing(true);
        const amount = parseFloat(creditAmount);
        const finalAmount = creditType === 'ADD' ? amount : -amount;

        try {
            const admin = authService.getCurrentUser();
            // Call API
            const response = await fetch(`${API_BASE_URL}/api/users/${selectedClient.id}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmount,
                    reason: creditReason || 'Manual Adjustment',
                    adminId: admin?.id
                })
            });

            if (!response.ok) throw new Error('Failed to update credits');

            alert(`Successfully ${creditType === 'ADD' ? 'added' : 'deducted'} ₹${amount} for ${selectedClient.name}`);
            setIsCreditModalOpen(false);
            loadClients(); // Refresh table
        } catch (error) {
            alert("Error processing transaction");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleStatus = async (client: SaaSUser) => {
        const newStatus = client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (!window.confirm(`Change status of ${client.name} to ${newStatus}?`)) return;

        try {
            await fetch(`${API_BASE_URL}/api/users/${client.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            loadClients();
        } catch (e) { alert("Failed to change status"); }
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
                    <p className="text-gray-500">Manage tenants, wallet balances, and access control</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadClients} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors">Add Client</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Client Entity</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Wallet Balance</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(client => (
                                <tr key={client.id} className="hover:bg-gray-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                {client.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{client.name}</div>
                                                <div className="text-xs text-gray-500">{client.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleStatus(client)} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors
                                            ${client.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>
                                            {client.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {client.status}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100 uppercase tracking-wide">
                                            {client.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-gray-900 text-base">₹{client.credits?.toLocaleString()}</span>
                                            {client.credits < 100 && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => openCreditModal(client)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors"
                                                title="Manage Wallet"
                                            >
                                                <Coins className="w-4 h-4" /> Add Credit
                                            </button>
                                            <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                                            <button
                                                onClick={() => handleImpersonate(client)}
                                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Log In As Client"
                                            >
                                                <LogIn className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="More Actions"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Wallet Modal */}
            {isCreditModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-gray-900">Manage Wallet</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedClient.name}</p>
                            </div>
                            <button onClick={() => setIsCreditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                        </div>

                        <form onSubmit={handleSubmitCredit} className="p-6 space-y-5">
                            {/* Balance Display */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 text-white flex justify-between items-center shadow-md">
                                <span className="text-sm text-slate-300 font-medium">Current Balance</span>
                                <span className="text-2xl font-bold font-mono tracking-tight">₹{selectedClient.credits?.toLocaleString()}</span>
                            </div>

                            {/* Type Toggle */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setCreditType('ADD')}
                                    className={`py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${creditType === 'ADD' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Add Credit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreditType('DEDUCT')}
                                    className={`py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${creditType === 'DEDUCT' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <ArrowDownLeft className="w-4 h-4" /> Deduct
                                </button>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (INR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        required
                                        value={creditAmount}
                                        onChange={(e) => setCreditAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg font-mono text-lg font-bold text-gray-900 focus:border-slate-900 focus:ring-0 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reason / Reference</label>
                                <input
                                    type="text"
                                    required
                                    value={creditReason}
                                    onChange={(e) => setCreditReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-slate-900 focus:ring-0"
                                    placeholder="e.g. Invoice #1023 Payment"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className={`w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                                        ${creditType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                    `}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : (creditType === 'ADD' ? <Coins className="w-5 h-5" /> : <Ban className="w-5 h-5" />)}
                                    {creditType === 'ADD' ? 'Process Credit' : 'Process Deduction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
