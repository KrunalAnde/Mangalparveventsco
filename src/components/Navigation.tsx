import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Contact,
  Users,
  Calculator,
  Receipt,
  CheckSquare,
  BarChart3,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'events'
  | 'customers'
  | 'vendors'
  | 'quotes'
  | 'finance'
  | 'tasks'
  | 'reports';

export type TabType = TabKey;

interface NavigationProps {
  activeTab: TabKey;
  onTabChange?: (tab: TabKey) => void;
  onSelectTab?: (tab: TabKey) => void;
  eventCount?: number;
  customerCount?: number;
  taskPendingCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  eventCount = 0,
  customerCount = 0,
  taskPendingCount = 0,
}) => {
  const handleSelect = (tab: TabKey) => {
    if (onTabChange) onTabChange(tab);
    if (onSelectTab) onSelectTab(tab);
  };
  const tabs: { id: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events & Bookings', icon: Calendar, badge: eventCount },
    { id: 'customers', label: 'Customers', icon: Contact, badge: customerCount },
    { id: 'vendors', label: 'Vendors & Availability', icon: Users },
    { id: 'quotes', label: 'Costing & Quotes', icon: Calculator },
    { id: 'finance', label: 'Invoices & Payments', icon: Receipt },
    { id: 'tasks', label: 'Execution Board', icon: CheckSquare, badge: taskPendingCount },
    { id: 'reports', label: 'Reports & Audit Log', icon: BarChart3 },
  ];

  return (
    <nav className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar transition-colors duration-200" id="main_navigation">
      <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav_tab_${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
