import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Phone,
  PhoneOutgoing,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Zap,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/dialer', icon: Phone, label: 'Dialer' },
    { to: '/call-logs', icon: PhoneOutgoing, label: 'Call Logs' },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-3 rounded-xl
          bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl
          shadow-lg border border-surface-200/60 dark:border-surface-800/60
          lg:hidden
          text-surface-700 dark:text-surface-200
          hover:bg-white dark:hover:bg-surface-900
          active:scale-95 transition-all duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-[260px]
          bg-white/80 dark:bg-surface-950/80
          backdrop-blur-2xl
          border-r border-surface-200/60 dark:border-surface-800/60
          transform transition-transform duration-300 ease-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Gradient right border accent */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-500/30 to-transparent pointer-events-none" />

        <div className="flex flex-col h-full relative">
          {/* Logo/Brand area */}
          <div className="px-6 pt-6 pb-5 border-b border-surface-200/40 dark:border-surface-800/40">
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center
                  shadow-[0_4px_16px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]
                  group-hover:scale-105 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute inset-0 w-11 h-11 rounded-2xl bg-gradient-primary blur-lg opacity-50 -z-10 group-hover:opacity-70 transition-opacity" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-gradient-vivid leading-tight">
                  SalesDialer
                </h1>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-surface-400 dark:text-surface-500 mt-0.5">
                  Sales Platform
                </p>
              </div>
            </div>
          </div>

          {/* Section label */}
          <div className="px-6 pt-6 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-surface-400 dark:text-surface-500">
              Workspace
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  group relative flex items-center gap-3
                  px-3.5 py-2.5 rounded-xl
                  font-medium text-[13px]
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-gradient-primary text-white shadow-[0_4px_16px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100/70 dark:hover:bg-surface-800/50'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                        ${isActive ? 'bg-white/20' : 'bg-surface-100/0 group-hover:bg-surface-200/50 dark:group-hover:bg-surface-700/50'}
                      `}
                    >
                      <Icon
                        className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}
                        strokeWidth={2.25}
                      />
                    </span>
                    <span className="flex-1">{label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-80" strokeWidth={2.5} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-3 border-t border-surface-200/40 dark:border-surface-800/40 space-y-1">
            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className="group flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                text-surface-600 dark:text-surface-400
                hover:text-surface-900 dark:hover:text-surface-100
                hover:bg-surface-100/70 dark:hover:bg-surface-800/50
                transition-all duration-200"
              aria-label="Toggle theme"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100/0 group-hover:bg-surface-200/50 dark:group-hover:bg-surface-700/50 transition-all duration-200">
                {isDark ? (
                  <Sun className="w-[18px] h-[18px] group-hover:rotate-45 transition-transform duration-300" strokeWidth={2.25} />
                ) : (
                  <Moon className="w-[18px] h-[18px] group-hover:-rotate-12 transition-transform duration-300" strokeWidth={2.25} />
                )}
              </span>
              <span className="text-[13px] font-medium">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span className="ml-auto text-[10px] font-semibold text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300 transition-colors">
                {isDark ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* User card */}
            <div className="mt-2 p-3 rounded-xl
              bg-gradient-to-br from-surface-100/80 to-surface-50/40
              dark:from-surface-800/60 dark:to-surface-900/40
              backdrop-blur-sm
              border border-surface-200/60 dark:border-surface-700/60
              shadow-sm">
              <div className="flex items-center gap-3">
                <div className="avatar-gradient">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center">
                    <span className="text-sm font-extrabold text-gradient-vivid">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                text-red-500/90 hover:text-red-600 dark:hover:text-red-400
                hover:bg-red-50/80 dark:hover:bg-red-950/40
                border border-transparent hover:border-red-200/60 dark:hover:border-red-900/40
                transition-all duration-200"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50/0 group-hover:bg-red-100/60 dark:group-hover:bg-red-950/40 transition-all duration-200">
                <LogOut className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" strokeWidth={2.25} />
              </span>
              <span className="text-[13px] font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
