import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { EventItem, Vendor, Task, Customer } from '../types';
import { TabType } from './Navigation';
import { formatToIndianMobile } from '../utils/phoneUtils';
import {
  ShieldCheck,
  LogIn,
  LogOut,
  Search,
  X,
  Sun,
  Moon,
  Calendar,
  Contact,
  Users,
  CheckSquare,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
} from 'lucide-react';

interface HeaderProps {
  events?: EventItem[];
  customers?: Customer[];
  vendors?: Vendor[];
  tasks?: Task[];
  onSelectEvent?: (eventId: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onQuickNewEvent?: () => void;
  activeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  events = [],
  customers = [],
  vendors = [],
  tasks = [],
  onSelectEvent,
  onNavigateTab,
}) => {
  const { currentUser, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilterCategory, setSearchFilterCategory] = useState<'all' | 'events' | 'customers' | 'vendors' | 'tasks'>('all');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: '/' or 'Cmd+K' / 'Ctrl+K' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time filtering
  const query = searchQuery.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    if (!query) return [];
    return events
      .filter((e) => {
        const titleMatch = e.title?.toLowerCase().includes(query);
        const customerMatch = e.customerName?.toLowerCase().includes(query);
        const venueMatch = e.venueAddress?.toLowerCase().includes(query);
        const typeMatch = e.eventType?.toLowerCase().includes(query);
        const statusMatch = (e.status || '').toLowerCase().includes(query);
        const notesMatch = e.notes?.toLowerCase().includes(query);
        return titleMatch || customerMatch || venueMatch || typeMatch || statusMatch || notesMatch;
      })
      .slice(0, 6);
  }, [events, query]);

  const filteredCustomers = useMemo(() => {
    if (!query) return [];
    return customers
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(query);
        const phoneMatch = c.mobile?.toLowerCase().includes(query);
        const emailMatch = c.email?.toLowerCase().includes(query);
        const addrMatch = c.address?.toLowerCase().includes(query);
        const notesMatch = c.notes?.toLowerCase().includes(query);
        return nameMatch || phoneMatch || emailMatch || addrMatch || notesMatch;
      })
      .slice(0, 6);
  }, [customers, query]);

  const filteredVendors = useMemo(() => {
    if (!query) return [];
    return vendors
      .filter((v) => {
        const nameMatch = v.businessName?.toLowerCase().includes(query);
        const contactMatch = v.contactName?.toLowerCase().includes(query);
        const catMatch = v.categories?.some((c) => c.toLowerCase().includes(query));
        const areaMatch = v.serviceArea?.toLowerCase().includes(query);
        const phoneMatch = v.mobile?.includes(query);
        return nameMatch || contactMatch || catMatch || areaMatch || phoneMatch;
      })
      .slice(0, 6);
  }, [vendors, query]);

  const filteredTasks = useMemo(() => {
    if (!query) return [];
    return tasks
      .filter((t) => {
        const titleMatch = t.title?.toLowerCase().includes(query);
        const catMatch = t.category?.toLowerCase().includes(query);
        const statusMatch = t.status?.toLowerCase().includes(query);
        const priorityMatch = t.priority?.toLowerCase().includes(query);
        const assigneeMatch = t.assignedTo?.toLowerCase().includes(query);
        return titleMatch || catMatch || statusMatch || priorityMatch || assigneeMatch;
      })
      .slice(0, 6);
  }, [tasks, query]);

  const totalResultsCount =
    filteredEvents.length +
    filteredCustomers.length +
    filteredVendors.length +
    filteredTasks.length;

  const handleSelectEventItem = (eventId: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectEvent) {
      onSelectEvent(eventId);
    }
  };

  const handleSelectCustomerItem = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigateTab) {
      onNavigateTab('customers');
    }
  };

  const handleSelectVendorItem = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigateTab) {
      onNavigateTab('vendors');
    }
  };

  const handleSelectTaskItem = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigateTab) {
      onNavigateTab('tasks');
    }
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-xs transition-colors duration-200" id="app_header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Logo Brand Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-11 h-11 flex-shrink-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-amber-900 dark:from-amber-600 dark:via-orange-700 dark:to-indigo-950 rounded-xl p-1.5 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400 fill-current">
                {/* Festive celebration firework / rangoli motif */}
                <circle cx="50" cy="50" r="12" className="text-amber-400" />
                <path d="M50 15 Q55 35 50 42 Q45 35 50 15" fill="#f59e0b" />
                <path d="M85 50 Q65 55 58 50 Q65 45 85 50" fill="#ea580c" />
                <path d="M50 85 Q45 65 50 58 Q55 65 50 85" fill="#f59e0b" />
                <path d="M15 50 Q35 45 42 50 Q35 55 15 50" fill="#ea580c" />
                <circle cx="28" cy="28" r="5" fill="#fbbf24" />
                <circle cx="72" cy="28" r="6" fill="#f59e0b" />
                <circle cx="76" cy="72" r="5" fill="#f97316" />
                <circle cx="25" cy="74" r="5" fill="#fbbf24" />
              </svg>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', serif" }}>
                  मंगलपर्व <span className="text-amber-600 dark:text-amber-400 text-base sm:text-lg font-sans font-extrabold tracking-wider">EVENT CO.</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                  Warud & Vidarbha
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                सोहळा तुमचा, नियोजन आमचे. &bull; <span className="text-slate-600 dark:text-slate-300 font-semibold">Central Event Operating System</span>
              </p>
            </div>
          </div>

          {/* Central Global Search Bar */}
          <div className="relative flex-1 max-w-lg w-full mx-auto lg:mx-4" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="global_header_search_input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search events, vendors, tasks... (/)"
                className="w-full pl-9 pr-14 py-1.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-700/60 rounded border border-slate-300/60 dark:border-slate-600/60">
                  /
                </kbd>
              )}
            </div>

            {/* Real-Time Search Results Dropdown */}
            {isSearchOpen && query.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden max-h-[75vh] flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Result counts & filter chips */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSearchFilterCategory('all')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                        searchFilterCategory === 'all'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      All ({totalResultsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterCategory('events')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        searchFilterCategory === 'events'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Events ({filteredEvents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterCategory('customers')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        searchFilterCategory === 'customers'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Customers ({filteredCustomers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterCategory('vendors')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        searchFilterCategory === 'vendors'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Vendors ({filteredVendors.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterCategory('tasks')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        searchFilterCategory === 'tasks'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Tasks ({filteredTasks.length})
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">Esc to close</span>
                </div>

                <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-700/60">
                  {totalResultsCount === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      <Search className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-amber-500" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No results found</p>
                      <p className="mt-0.5">No events, vendors, or tasks matched &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  ) : (
                    <>
                      {/* Events Results */}
                      {(searchFilterCategory === 'all' || searchFilterCategory === 'events') && filteredEvents.length > 0 && (
                        <div className="py-1.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-500" />
                            <span>Events ({filteredEvents.length})</span>
                          </div>
                          {filteredEvents.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => handleSelectEventItem(event.id)}
                              className="w-full text-left p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                  {event.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span>Client: {event.customerName}</span>
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{event.venueAddress || 'Warud'}</span>
                                  <span>&bull;</span>
                                  <span>{event.eventDateStart}</span>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex-shrink-0">
                                {event.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Customers Results */}
                      {(searchFilterCategory === 'all' || searchFilterCategory === 'customers') && filteredCustomers.length > 0 && (
                        <div className="py-1.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Contact className="w-3 h-3 text-amber-600" />
                            <span>Customers ({filteredCustomers.length})</span>
                          </div>
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={handleSelectCustomerItem}
                              className="w-full text-left p-2 rounded-lg hover:bg-amber-50/70 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                  {customer.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span className="font-mono text-amber-800 dark:text-amber-300 font-semibold">
                                    {formatToIndianMobile(customer.mobile) || customer.mobile}
                                  </span>
                                  {customer.address && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{customer.address}</span>
                                    </>
                                  )}
                                  {customer.source && (
                                    <>
                                      <span>&bull;</span>
                                      <span>{customer.source}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex-shrink-0">
                                Client
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Vendors Results */}
                      {(searchFilterCategory === 'all' || searchFilterCategory === 'vendors') && filteredVendors.length > 0 && (
                        <div className="py-1.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-500" />
                            <span>Vendors ({filteredVendors.length})</span>
                          </div>
                          {filteredVendors.map((vendor) => (
                            <button
                              key={vendor.id}
                              onClick={handleSelectVendorItem}
                              className="w-full text-left p-2 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {vendor.businessName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span>{vendor.categories?.join(', ')}</span>
                                  <span>&bull;</span>
                                  <span>📍 {vendor.serviceArea}</span>
                                  <span>&bull;</span>
                                  <span>⭐ {vendor.rating}/5</span>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
                                ₹{vendor.baseCost?.toLocaleString('en-IN')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tasks Results */}
                      {(searchFilterCategory === 'all' || searchFilterCategory === 'tasks') && filteredTasks.length > 0 && (
                        <div className="py-1.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-emerald-500" />
                            <span>Tasks ({filteredTasks.length})</span>
                          </div>
                          {filteredTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={handleSelectTaskItem}
                              className="w-full text-left p-2 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                  {task.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span>{task.category}</span>
                                  <span>&bull;</span>
                                  <span>Priority: {task.priority}</span>
                                  {task.dueDate && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.dueDate}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                                task.status === 'Done'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {task.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Controls: Theme Toggle, Role Indicator, Online Status, Auth */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Global Theme Toggle Button */}
            <button
              id="btn_theme_toggle"
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Real-time DB Sync Badge */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Firestore Real-Time</span>
              <span className="sm:hidden">Live</span>
            </div>

            {/* Dedicated Super Admin Access Indicator */}
            <div
              id="header_super_admin_badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950 dark:bg-indigo-900/90 text-indigo-100 border border-indigo-700/80 shadow-2xs text-xs font-bold"
              title="Exclusive Super Admin Access — Full control over bookings, vendors, financials, and pipelines"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Super Admin</span>
            </div>

            {/* Google Auth Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 flex items-center justify-center font-bold text-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                    {currentUser.displayName || 'Operator'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  id="btn_auth_signout"
                  className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                id="btn_auth_google_login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
