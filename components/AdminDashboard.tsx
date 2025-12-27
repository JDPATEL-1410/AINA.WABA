
import React, { useEffect, useState } from 'react';
import {
    Users, MessageSquare, DollarSign, Activity,
    TrendingUp, TrendingDown, AlertTriangle, Server
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        adminService.getStats().then(setStats);
    }, []);

    if (!stats) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

    const data = [
        { name: 'Mon', revenue: 4000, msg: 2400 },
        { name: 'Tue', revenue: 3000, msg: 1398 },
        { name: 'Wed', revenue: 2000, msg: 9800 },
        { name: 'Thu', revenue: 2780, msg: 3908 },
        { name: 'Fri', revenue: 1890, msg: 4800 },
        { name: 'Sat', revenue: 2390, msg: 3800 },
        { name: 'Sun', revenue: 3490, msg: 4300 },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
                    <p className="text-gray-500">Real-time platform metrics</p>
                </div>
                <div className="flex gap-2 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> API Operational</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Webhooks Operational</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.activeUsers} / {stats.totalUsers}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Tenants</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MessageSquare className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +5%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.totalMessages24h.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">Messages (24h)</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">MTD</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">₹{stats.revenueMonth.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">Revenue</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                        {stats.webhookFailures > 10 && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">High Alert</span>}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.webhookFailures}</div>
                    <div className="text-xs text-gray-500 mt-1">Webhook Failures</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Traffic & Revenue</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                                <Tooltip />
                                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">System Health</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-gray-600"><Server className="w-4 h-4" /> Database</span>
                            <span className="text-green-600 font-bold">Healthy (12ms)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-green-500 h-1.5 rounded-full w-[98%]"></div></div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-gray-600"><Activity className="w-4 h-4" /> API Latency</span>
                            <span className="text-green-600 font-bold">45ms</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-green-500 h-1.5 rounded-full w-[92%]"></div></div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-gray-600"><AlertTriangle className="w-4 h-4" /> Error Rate</span>
                            <span className="text-gray-600 font-bold">0.04%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-blue-500 h-1.5 rounded-full w-[2%]"></div></div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Recent Alerts</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1"></div>
                                <div className="text-gray-600">Client <strong>Beta Ltd</strong> webhook failure rate &gt; 10%</div>
                            </div>
                            <div className="flex items-start gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1"></div>
                                <div className="text-gray-600">WABA ID 88392 token expiring in 2 days.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
