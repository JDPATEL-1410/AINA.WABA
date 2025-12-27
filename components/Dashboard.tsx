
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, Users, Send, CheckCircle, RefreshCw, AlertCircle, Database, TrendingUp, TrendingDown } from 'lucide-react';
import { storageService } from '../services/storageService';
import { whatsappApiService } from '../services/whatsappApiService';
import { MessageStatus } from '../types';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; colorFrom: string; colorTo: string; trend?: string }> = ({ title, value, icon: Icon, colorFrom, colorTo, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex items-start justify-between hover:translate-y-[-2px] transition-all duration-300">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1.5">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
      {trend && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-3 bg-emerald-50 px-2 py-1 rounded-full w-fit">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
      )}
    </div>
    <div className={`p-3.5 rounded-xl bg-gradient-to-br ${colorFrom} ${colorTo} shadow-lg shadow-${colorFrom.replace('from-', '')}/20`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeContacts: 0,
    campaignsSent: 0,
    deliveryRate: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isApiData, setIsApiData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    loadDashboardData();
  }, [range]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const credentials = whatsappApiService.getCredentials();
    
    // Attempt to fetch Real API Data
    if (credentials && credentials.businessAccountId && credentials.accessToken) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (range === '7d' ? 7 : 30));

            const apiData = await whatsappApiService.getAnalytics(
                credentials, 
                startDate.getTime(), 
                endDate.getTime(), 
                'DAY'
            );

            if (apiData.length > 0) {
                // Process API Data
                const processedData = apiData.map(point => ({
                    name: new Date(point.start * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    sent: point.sent,
                    delivered: point.delivered,
                    read: 0 
                }));

                const totalSent = apiData.reduce((acc, curr) => acc + curr.sent, 0);
                const totalDelivered = apiData.reduce((acc, curr) => acc + curr.delivered, 0);
                const rate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

                setChartData(processedData);
                setStats(prev => ({
                    ...prev,
                    totalMessages: totalSent,
                    deliveryRate: Math.round(rate * 10) / 10,
                    activeContacts: storageService.getContacts().length,
                    campaignsSent: storageService.getCampaigns().length
                }));
                setIsApiData(true);
                setIsLoading(false);
                return;
            }
        } catch (e) {
            console.error("API Analytics failed, falling back to local", e);
        }
    }

    // Fallback to Local Data
    const convs = storageService.getConversations();
    const campaigns = storageService.getCampaigns();

    let totalMsgs = 0;
    let deliveredMsgs = 0;
    
    const allMessages = convs.flatMap(c => c.messages);
    
    // Filter by date range
    const filterDate = new Date();
    filterDate.setDate(filterDate.getDate() - (range === '7d' ? 7 : 30));
    
    const recentMessages = allMessages.filter(m => new Date(m.timestamp) > filterDate);

    totalMsgs = recentMessages.length;
    deliveredMsgs = recentMessages.filter(m => m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ).length;
    
    const rate = totalMsgs > 0 ? (deliveredMsgs / totalMsgs) * 100 : 0;

    setStats({
      totalMessages: totalMsgs,
      activeContacts: convs.length,
      campaignsSent: campaigns.length,
      deliveryRate: Math.round(rate * 10) / 10
    });

    // Prepare Chart Data
    const days = range === '7d' ? 7 : 30;
    const chartPoints = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - ((days - 1) - i));
        return { 
            dateStr: d.toLocaleDateString(), 
            dayName: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
        };
    });

    const data = chartPoints.map(day => {
        const dayMsgs = allMessages.filter(m => new Date(m.timestamp).toLocaleDateString() === day.dateStr);
        return {
            name: day.dayName,
            sent: dayMsgs.length,
            read: dayMsgs.filter(m => m.status === MessageStatus.READ).length
        };
    });

    setChartData(data);
    setIsApiData(false);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your WhatsApp Business performance</p>
        </div>
        <div className="flex items-center gap-3">
            {isApiData ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                    <Database className="w-3.5 h-3.5" /> Live API
                </span>
            ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
                    <Database className="w-3.5 h-3.5" /> Local Demo
                </span>
            )}
            <div className="relative">
                <select 
                    value={range}
                    onChange={(e) => setRange(e.target.value as '7d' | '30d')}
                    className="bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-wa/20 shadow-sm hover:border-gray-300 transition-colors appearance-none cursor-pointer"
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            <button 
                onClick={loadDashboardData}
                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all shadow-sm active:scale-95"
                title="Refresh Data"
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Messages" 
            value={stats.totalMessages.toLocaleString()} 
            icon={MessageSquare} 
            colorFrom="from-blue-500" 
            colorTo="to-blue-600"
            trend={range === '7d' ? "Last 7 days" : "Last 30 days"} 
        />
        <StatCard 
            title="Active Contacts" 
            value={stats.activeContacts.toLocaleString()} 
            icon={Users} 
            colorFrom="from-violet-500" 
            colorTo="to-violet-600"
            trend="Total Audience" 
        />
        <StatCard 
            title="Campaigns Sent" 
            value={stats.campaignsSent.toLocaleString()} 
            icon={Send} 
            colorFrom="from-orange-500" 
            colorTo="to-orange-600"
            trend="Lifetime" 
        />
        <StatCard 
            title="Delivery Rate" 
            value={`${stats.deliveryRate}%`} 
            icon={CheckCircle} 
            colorFrom="from-emerald-500" 
            colorTo="to-emerald-600"
            trend="Average" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Message Volume</h2>
                <p className="text-sm text-gray-500">Sent vs Delivered messages over time</p>
            </div>
            {!isApiData && (
                <span className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Connect API for live data
                </span>
            )}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Area 
                    type="monotone" 
                    dataKey="sent" 
                    name="Sent"
                    stroke="#25D366" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSent)" 
                />
                {isApiData && (
                    <Area 
                        type="monotone" 
                        dataKey="delivered" 
                        name="Delivered"
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorDelivered)" 
                    />
                )}
                {!isApiData && (
                    <Area 
                        type="monotone" 
                        dataKey="read" 
                        name="Read"
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        fillOpacity={0} 
                        fill="transparent" 
                    />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
             {/* Mocked activity for visual demo */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">New Message Received</p>
                  <p className="text-xs text-gray-500 mt-0.5">Customer {i} replied to campaign...</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{i * 15}m ago</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 rounded-xl border border-gray-200 transition-all active:bg-gray-100">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};
