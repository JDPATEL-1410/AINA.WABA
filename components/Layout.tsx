
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Users, 
  Send, 
  Settings, 
  LogOut,
  Menu,
  X,
  Zap,
  Workflow,
  Shield,
  ChevronRight,
  CreditCard,
  Package,
  Bot
} from 'lucide-react';
import { authService } from '../services/authService';
import { SaaSUser } from '../types';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SaaSUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
          navigate('/login');
          return;
      }
      setUser(currentUser);
  }, [navigate]);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['USER', 'SUPER_ADMIN'] },
    { path: '/inbox', icon: MessageSquare, label: 'Team Inbox', roles: ['USER'] },
    { path: '/contacts', icon: Users, label: 'Contacts', roles: ['USER'] },
    { path: '/campaigns', icon: Send, label: 'Campaigns', roles: ['USER'] },
    { path: '/automation', icon: Bot, label: 'Automation', roles: ['USER'] },
    { path: '/flows', icon: Workflow, label: 'Flows', roles: ['USER'] },
    { path: '/billing', icon: CreditCard, label: 'Billing & Credits', roles: ['USER'] },
    // Admin Only Routes
    { path: '/admin/users', icon: Shield, label: 'Manage Users', roles: ['SUPER_ADMIN'] },
    { path: '/admin/plans', icon: Package, label: 'Manage Plans', roles: ['SUPER_ADMIN'] },
  ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none flex flex-col`}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-wa to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-900/20">
                <Zap className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-white">WatiClone</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{user.role === 'SUPER_ADMIN' ? 'Reseller' : user.plan}</span>
              </div>
            </div>
            <button onClick={toggleMenu} className="lg:hidden text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ease-in-out mb-1
                  ${isActive 
                    ? 'bg-gradient-to-r from-wa to-emerald-600 text-white shadow-md shadow-emerald-900/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3.5">
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${({ isActive }: any) => isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                </div>
                {/* Active Indicator Dot */}
                <NavLink to={item.path} className={({ isActive }) => isActive ? "block" : "hidden"}>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                </NavLink>
              </NavLink>
            ))}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            {user.role === 'USER' && (
                <NavLink 
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 mb-2
                    ${isActive 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                `}
                >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
                </NavLink>
            )}
            
            <div className="mt-2 pt-4 border-t border-slate-800 flex items-center justify-between px-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">{user.name}</span>
                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                        <span className="text-[10px] text-yellow-400 font-mono">{user.credits} CR</span>
                    </div>
                </div>
                <button 
                    onClick={() => authService.logout()}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50/50">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 lg:hidden flex items-center justify-between p-4 shadow-sm z-40">
          <div className="flex items-center gap-2">
            <div className="bg-wa p-1.5 rounded-lg">
                <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">WatiClone</span>
          </div>
          <button onClick={toggleMenu} className="text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth">
           <div className="max-w-7xl mx-auto">
               <Outlet />
           </div>
        </main>
      </div>
    </div>
  );
};
