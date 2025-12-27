
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CreditCard, Shield, 
  Settings, LogOut, Webhook, Activity, Lock,
  Menu, X
} from 'lucide-react';
import { authService } from '../services/authService';

export const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        // Strict Role Check
        if (!user || !['SUPER_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN'].includes(user.role)) {
            navigate('/login');
        }
    }, [user, navigate]);

    if (!user) return null;

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'] },
        { path: '/admin/users', icon: Users, label: 'Manage Users', roles: ['SUPER_ADMIN', 'SUPPORT_ADMIN'] },
        { path: '/admin/plans', icon: CreditCard, label: 'Plans & Billing', roles: ['SUPER_ADMIN', 'FINANCE_ADMIN'] },
        { path: '/admin/webhooks', icon: Webhook, label: 'Webhooks Monitor', roles: ['SUPER_ADMIN', 'SUPPORT_ADMIN'] },
        { path: '/admin/compliance', icon: Shield, label: 'Compliance & Safety', roles: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'] },
        { path: '/admin/audit', icon: Activity, label: 'Audit Logs', roles: ['SUPER_ADMIN'] },
        { path: '/admin/settings', icon: Settings, label: 'System Settings', roles: ['SUPER_ADMIN'] },
    ];

    // Filter items based on role
    const allowedItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl lg:shadow-none`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-2 text-white font-bold tracking-wider">
                        <div className="bg-red-600 p-1.5 rounded-lg"><Lock className="w-4 h-4" /></div>
                        <span>ADMIN<span className="text-red-500">PNL</span></span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400"><X className="w-5 h-5"/></button>
                </div>

                <div className="px-6 py-6">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Main Menu</div>
                    <nav className="space-y-1">
                        {allowedItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium
                                    ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                `}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-3 mb-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-white truncate">{user.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide">{user.role.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => authService.logout()}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors justify-center border border-transparent hover:border-slate-700"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-slate-200 lg:hidden flex items-center justify-between p-4 shadow-sm z-40">
                    <span className="font-bold text-slate-900">Admin Panel</span>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 bg-slate-100 rounded-lg"><Menu className="w-6 h-6"/></button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
