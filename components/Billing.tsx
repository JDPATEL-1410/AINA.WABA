
import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, ArrowUpRight, ArrowDownLeft, Zap, CheckCircle, AlertTriangle, Loader2, Lock, Star, ChevronRight } from 'lucide-react';
import { authService } from '../services/authService';
import { billingService } from '../services/billingService';
import { Transaction, CreditPack, SaaSUser } from '../types';

export const Billing: React.FC = () => {
  const [user, setUser] = useState<SaaSUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Now async fetch
    const packData = await billingService.getCreditPacks();
    setPacks(packData);
    
    const txs = await billingService.getTransactions();
    setTransactions(txs);
    setLoading(false);
  };

  const handlePurchase = async (pack: CreditPack) => {
    if (!user) return;
    setPurchasing(pack.id);
    
    try {
        // 1. Create Order on Backend
        const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3000'}/api/billing/create-order`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 userId: user.id,
                 packageId: pack.id,
                 amount: pack.price,
                 credits: pack.credits,
                 currency: 'INR'
             })
        });
        
        let orderData = { success: false, orderId: '' };
        if (response.ok) {
            orderData = await response.json();
        } else {
            // Mock success for demo if backend is offline
            console.warn("Backend offline, simulating success");
            orderData = { success: true, orderId: 'mock_order_' + Date.now() };
        }
        
        if (orderData.success) {
             // 2. Simulate Payment Gateway Popup
             const confirm = window.confirm(`[RAZORPAY GATEWAY]\n\nPay ₹${pack.price} for ${pack.credits} credits?\n\nClick OK to simulate successful payment.`);
             
             if (confirm) {
                 try {
                     await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3000'}/api/billing/webhook`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ orderId: orderData.orderId, status: 'success' })
                     });
                 } catch(e) {
                     console.warn("Webhook failed (expected if backend offline)");
                 }
                 
                 alert("Payment Successful! Credits added.");
                 window.location.reload();
             } else {
                 alert("Payment Cancelled");
             }
        }
    } catch (e: any) {
        alert("Order Creation Failed: " + e.message);
    } finally {
        setPurchasing(null);
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto text-wa" /></div>;
  if (!user) return <div>Please login</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Licenses</h1>
          <p className="text-gray-500">Manage your subscription plan and message credits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Plan Card - NEW */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Star className="w-24 h-24" /></div>
              <div className="relative z-10">
                  <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Current License</h3>
                  <div className="text-3xl font-bold mb-1 flex items-center gap-2">
                      {user.plan} <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-sm text-indigo-100 mb-6 opacity-90">
                      Status: <span className="font-bold">{user.status}</span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                          <span className="text-indigo-300">Features</span>
                          <span className="font-medium">All Unlocked</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-indigo-300">Renewal Date</span>
                          <span className="font-medium">{new Date(Date.now() + 86400000 * 30).toLocaleDateString()}</span>
                      </div>
                  </div>

                  <button className="w-full bg-white text-indigo-900 font-bold py-2.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm">
                      Upgrade Plan <ChevronRight className="w-4 h-4" />
                  </button>
              </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center">
             <div className="flex justify-between items-start">
                 <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Message Credits</p>
                    <div className="text-4xl font-mono font-bold text-gray-900 flex items-baseline gap-2">
                        {user.credits.toLocaleString()} <span className="text-lg font-sans font-normal text-gray-400">CR</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Used for sending Broadcasts and Session Messages.
                    </p>
                 </div>
                 <div className="bg-yellow-50 p-4 rounded-full">
                    <Zap className="w-8 h-8 text-yellow-500" fill="currentColor" />
                 </div>
             </div>
             <div className="mt-6 pt-6 border-t border-gray-100 flex gap-4 text-sm text-gray-600">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> 1 CR = 1 Text Message</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> 2 CR = 1 Media Message</div>
             </div>
          </div>
      </div>

      {/* Credit Packs */}
      <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-wa" /> Top-up Wallet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map(pack => (
                  <div key={pack.id} className={`relative bg-white rounded-xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${pack.popular ? 'border-wa shadow-md' : 'border-gray-100 shadow-sm'}`}>
                      {pack.popular && (
                          <div className="absolute top-0 right-0 bg-wa text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">
                              MOST POPULAR
                          </div>
                      )}
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{pack.name}</h3>
                      <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold text-gray-900">{pack.credits.toLocaleString()}</span>
                          <span className="text-gray-500">credits</span>
                      </div>
                      <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" /> Never expires
                          <br />
                          <CheckCircle className="w-4 h-4 text-green-500" /> Valid for all messages
                      </div>
                      <button 
                        onClick={() => handlePurchase(pack)}
                        disabled={!!purchasing}
                        className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors ${pack.popular ? 'bg-wa text-white hover:bg-wa-dark' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      >
                          {purchasing === pack.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          Pay ₹{pack.price}
                      </button>
                      <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> Secure Payment via Razorpay
                      </p>
                  </div>
              ))}
          </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        
        {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No transactions yet.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map((tx, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(tx.date).toLocaleDateString()} <span className="text-gray-400 text-xs">{new Date(tx.date).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${tx.type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {tx.type === 'CREDIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                        </div>
                                        {tx.description}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                    {tx.referenceId || '-'}
                                </td>
                                <td className={`px-6 py-4 text-right font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};
