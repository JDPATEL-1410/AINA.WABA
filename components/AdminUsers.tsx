
import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Trash2, CheckCircle, XCircle,
    Shield, Loader2, Coins, ArrowUpRight, ArrowDownLeft,
    MoreVertical, AlertTriangle, Ban, RefreshCw
} from 'lucide-react';
import { authService } from '../services/authService';
import { billingService } from '../services/billingService';
import { SaaSUser, SubscriptionPlan } from '../types';

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<SaaSUser[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    // Create User Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', plan: 'TRIAL', role: 'USER' });
    const [creating, setCreating] = useState(false);

    // Credit Modal
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [selectedUserForCredit, setSelectedUserForCredit] = useState<SaaSUser | null>(null);
    const [creditAmount, setCreditAmount] = useState<string>('');
    const [creditAction, setCreditAction] = useState<'ADD' | 'DEDUCT'>('ADD');
    const [creditReason, setCreditReason] = useState('Manual Adjustment');
    const [updatingCredits, setUpdatingCredits] = useState(false);

    // Action Menu State
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

    useEffect(() => {
        loadData();

        // Close menu on click outside
        const handleClickOutside = () => setOpenActionMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [userData, planData] = await Promise.all([
                authService.getUsers(),
                billingService.getSubscriptionPlans()
            ]);
            setUsers(userData);
            setPlans(planData);
            if (planData.length > 0 && newUser.plan === 'TRIAL') {
                setNewUser(prev => ({ ...prev, plan: planData[0].name }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await authService.createUser(
                {
                    name: newUser.name,
                    email: newUser.email,
                    plan: newUser.plan,
                    role: newUser.role as any,
                    status: 'ACTIVE'
                },
                newUser.password
            );
            setIsModalOpen(false);
            setNewUser({ name: '', email: '', password: '', plan: plans[0]?.name || 'TRIAL', role: 'USER' });
            await loadData();
        } catch (error) {
            alert("Failed to create user. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm("Are you sure? This will delete the user and their data.")) return;
        try {
            await authService.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (e) {
            alert("Failed to delete user");
        }
    };

    const handleToggleStatus = async (user: SaaSUser) => {
        const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const action = newStatus === 'ACTIVE' ? 'activate' : 'suspend';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${baseUrl}/api/users/${user.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            } else {
                throw new Error("Failed");
            }
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const openCreditModal = (user: SaaSUser) => {
        setSelectedUserForCredit(user);
        setCreditAmount('');
        setCreditAction('ADD');
        setCreditReason('Bonus Credits');
        setIsCreditModalOpen(true);
    };

    const handleAddCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForCredit || !creditAmount) return;

        const numAmount = parseFloat(creditAmount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setUpdatingCredits(true);
        const finalAmount = creditAction === 'ADD' ? numAmount : -numAmount;

        try {
            const admin = authService.getCurrentUser();
            const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${baseUrl}/api/users/${selectedUserForCredit.id}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmount,
                    reason: creditReason,
                    adminId: admin?.id
                })
            });

            if (!response.ok) throw new Error("API Error");

            setIsCreditModalOpen(false);
            await loadData();
            alert(`Successfully ${creditAction === 'ADD' ? 'added' : 'deducted'} ₹${numAmount}`);
        } catch (error: any) {
            alert("Failed to update credits. Backend might be unreachable.");
        } finally {
            setUpdatingCredits(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage tenants, assign plans, and monitor limits</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-wa text-white px-4 py-2 rounded-lg hover:bg-wa-dark transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create User
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="flex-1 border-none focus:ring-0 text-sm"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                {loading && users.length === 0 ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-wa w-8 h-8" /></div>
                ) : (
                    <div className="overflow-visible">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Company / Name</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Wallet Balance</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users found.</td></tr>
                                ) : filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-gray-900">₹{user.credits?.toLocaleString() || 0}</span>
                                                {user.credits < 100 && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm
                            ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                            >
                                                {user.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {user.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                {user.role === 'SUPER_ADMIN' ? <Shield className="w-4 h-4 text-purple-600" /> : <Users className="w-4 h-4 text-gray-400" />}
                                                <span className="text-xs">{user.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => openCreditModal(user)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Add Credits"
                                                >
                                                    <Coins className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenu(openActionMenu === user.id ? null : user.id);
                                                    }}
                                                    className={`p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ${openActionMenu === user.id ? 'bg-gray-100' : ''}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {openActionMenu === user.id && (
                                                    <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => {
                                                                    openCreditModal(user);
                                                                    setOpenActionMenu(null);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <Coins className="w-4 h-4 text-green-600" /> Manage Wallet
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    handleToggleStatus(user);
                                                                    setOpenActionMenu(null);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                {user.status === 'ACTIVE' ? (
                                                                    <>
                                                                        <Ban className="w-4 h-4 text-orange-500" /> Suspend User
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4 text-green-600" /> Activate User
                                                                    </>
                                                                )}
                                                            </button>

                                                            <div className="border-t border-gray-100 my-1"></div>

                                                            <button
                                                                onClick={() => {
                                                                    handleDeleteUser(user.id);
                                                                    setOpenActionMenu(null);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Delete User
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Create New Tenant</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company/User Name</label>
                                <input required type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="e.g. Acme Corp" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="user@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input required type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="••••••••" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                    <select value={newUser.plan} onChange={e => setNewUser({ ...newUser, plan: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm">
                                        {plans.length > 0 ? plans.map(p => (
                                            <option key={p.id} value={p.name}>{p.name} (₹{p.price})</option>
                                        )) : (
                                            <>
                                                <option value="TRIAL">Trial</option>
                                                <option value="STARTER">Starter</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border rounded-lg p-2.5 text-sm">
                                        <option value="USER">User</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={creating} className="w-full bg-wa text-white py-2.5 rounded-lg hover:bg-wa-dark font-medium flex items-center justify-center gap-2">
                                    {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />} Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCreditModalOpen && selectedUserForCredit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-semibold text-gray-900">Manage Wallet</h3>
                                <p className="text-xs text-gray-500">{selectedUserForCredit.name}</p>
                            </div>
                            <button onClick={() => setIsCreditModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleAddCredits} className="p-6 space-y-5">

                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 text-white flex justify-between items-center shadow-md">
                                <span className="text-sm text-gray-300 font-medium">Current Balance</span>
                                <span className="text-2xl font-bold font-mono">₹{selectedUserForCredit.credits?.toLocaleString() || 0}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setCreditAction('ADD')}
                                    className={`py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${creditAction === 'ADD' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Add Credit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreditAction('DEDUCT')}
                                    className={`py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${creditAction === 'DEDUCT' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <ArrowDownLeft className="w-4 h-4" /> Deduct
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (INR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={creditAmount}
                                        onChange={(e) => setCreditAmount(e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-lg font-mono font-bold focus:border-wa focus:ring-0 transition-colors"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reason / Reference</label>
                                <input
                                    type="text"
                                    value={creditReason}
                                    onChange={(e) => setCreditReason(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wa focus:ring-0"
                                    placeholder="e.g. Manual Adjustment, Bonus"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={updatingCredits || !creditAmount}
                                    className={`w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                ${creditAction === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            `}
                                >
                                    {updatingCredits ? <Loader2 className="animate-spin w-5 h-5" /> : (creditAction === 'ADD' ? <Coins className="w-5 h-5" /> : <Ban className="w-5 h-5" />)}
                                    {creditAction === 'ADD' ? 'Process Credit' : 'Process Deduction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
