import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  Tag,
  AlertTriangle,
  X,
  Check,
  User,
  Users,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Customer, EventItem } from '../types';
import { saveCustomer, updateCustomer, deleteCustomer } from '../services/firestoreService';
import { PhoneInputField } from './PhoneInputField';
import { formatToIndianMobile, getWhatsAppNumber, getTelNumber } from '../utils/phoneUtils';

interface CustomersViewProps {
  customers: Customer[];
  events: EventItem[];
  currentUserName?: string;
  onSelectEvent?: (eventId: string) => void;
  onNewEventForCustomer?: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  events,
  currentUserName = 'Administrator',
  onSelectEvent,
  onNewEventForCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE_EVENTS' | 'WARUD' | 'REFERRAL'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'NAME' | 'EVENTS'>('NEWEST');

  // Modals state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add form fields (defaults to +91 country code)
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('+91 ');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSource, setNewSource] = useState('Direct Referral / Community');
  const [newNotes, setNewNotes] = useState('');

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Map each customer to their linked events
  const customerEventsMap = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    customers.forEach((c) => map.set(c.id, []));
    events.forEach((ev) => {
      const list = map.get(ev.customerId) || [];
      list.push(ev);
      map.set(ev.customerId, list);
    });
    return map;
  }, [customers, events]);

  // Statistics
  const totalCustomers = customers.length;
  const customersWithActiveEvents = customers.filter((c) => {
    const evs = customerEventsMap.get(c.id) || [];
    return evs.some((e) => {
      const s = (e.status || '').toLowerCase();
      return s !== 'completed' && s !== 'cancelled';
    });
  }).length;
  const warudClientsCount = customers.filter(
    (c) => (c.address || '').toLowerCase().includes('warud')
  ).length;

  // Filter and search
  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.source && c.source.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const evs = customerEventsMap.get(c.id) || [];
      if (selectedFilter === 'ACTIVE_EVENTS') {
        return evs.some((e) => {
          const s = (e.status || '').toLowerCase();
          return s !== 'completed' && s !== 'cancelled';
        });
      }
      if (selectedFilter === 'WARUD') {
        return (c.address || '').toLowerCase().includes('warud');
      }
      if (selectedFilter === 'REFERRAL') {
        return (c.source || '').toLowerCase().includes('referral') || (c.source || '').toLowerCase().includes('mouth');
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'EVENTS') {
        const evA = (customerEventsMap.get(a.id) || []).length;
        const evB = (customerEventsMap.get(b.id) || []).length;
        return evB - evA;
      }
      // NEWEST
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [customers, searchTerm, selectedFilter, sortBy, customerEventsMap]);

  // Open Edit Modal
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    // Ensure default +91 country code if missing
    setEditMobile(formatToIndianMobile(customer.mobile) || '+91 ');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
    setEditSource(customer.source || '');
    setEditNotes(customer.notes || '');
    setErrorMessage('');
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editName.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }
    if (!editMobile.trim()) {
      setErrorMessage('Mobile number is required.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const formattedMobile = formatToIndianMobile(editMobile);
      await updateCustomer(
        editingCustomer.id,
        {
          name: editName.trim(),
          mobile: formattedMobile,
          email: editEmail.trim() || undefined,
          address: editAddress.trim() || undefined,
          source: editSource.trim() || undefined,
          notes: editNotes.trim() || undefined,
        },
        currentUserName,
        true
      );
      setEditingCustomer(null);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setErrorMessage(err.message || 'Failed to update customer in database.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setErrorMessage('');
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await deleteCustomer(
        deletingCustomer.id,
        deletingCustomer.name,
        currentUserName,
        true
      );
      setDeletingCustomer(null);
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      setErrorMessage(err.message || 'Failed to delete customer from database.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }
    if (!newMobile.trim() || newMobile.trim() === '+91') {
      setErrorMessage('A valid mobile number is required.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const generatedId = `cust_${Date.now()}`;
      const formattedMobile = formatToIndianMobile(newMobile);
      const newRecord: Customer = {
        id: generatedId,
        name: newName.trim(),
        mobile: formattedMobile,
        email: newEmail.trim() || undefined,
        address: newAddress.trim() || undefined,
        source: newSource.trim() || undefined,
        notes: newNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveCustomer(newRecord, currentUserName);
      setShowAddModal(false);
      // Reset form
      setNewName('');
      setNewMobile('+91 ');
      setNewEmail('');
      setNewAddress('');
      setNewSource('Direct Referral / Community');
      setNewNotes('');
    } catch (err: any) {
      console.error('Failed to add customer:', err);
      setErrorMessage(err.message || 'Failed to add customer.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6" id="customers_directory_section">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              S02 / CRM
            </span>
            <span className="text-xs text-slate-500 font-semibold">Client Master Database</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
            Customer Directory &amp; Accounts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
            Manage existing client records, contact channels with default +91 country code, edit customer details, and track linked event bookings across Warud, Morshi, and Amravati.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setErrorMessage('');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            id="btn_add_new_customer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Customers</span>
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {totalCustomers}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered client accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Bookings</span>
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            {customersWithActiveEvents}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">With ongoing / upcoming events</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Warud Local Base</span>
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-400 font-mono">
            {warudClientsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Local town families &amp; orgs</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Linked Events</span>
            <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-400 font-mono">
            {events.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Historical &amp; active records</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Search input with default +91 search support */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, mobile (+91), email, or city..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'ALL'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('ACTIVE_EVENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'ACTIVE_EVENTS'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            With Active Events ({customersWithActiveEvents})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('WARUD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'WARUD'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Warud Local ({warudClientsCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('REFERRAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilter === 'REFERRAL'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Referrals
          </button>

          {/* Sort selector */}
          <div className="ml-auto pl-2 flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="NEWEST">Newest Added</option>
              <option value="NAME">Name (A-Z)</option>
              <option value="EVENTS">Most Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              No Customers Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? `No existing customer matched your query "${searchTerm}".`
                : 'No customer records are currently listed under this filter.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  setErrorMessage('');
                }}
                className="px-3.5 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                + Add Customer
              </button>
            </div>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const linkedEvents = customerEventsMap.get(customer.id) || [];
            const activeEvents = linkedEvents.filter((e) => {
              const s = (e.status || '').toLowerCase();
              return s !== 'completed' && s !== 'cancelled';
            });
            const formattedPhone = formatToIndianMobile(customer.mobile);
            const waNumber = getWhatsAppNumber(customer.mobile);
            const telNumber = getTelNumber(customer.mobile);

            return (
              <div
                key={customer.id}
                id={`customer_card_${customer.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* Card Top / Avatar + Title */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
                        {customer.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                          {customer.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {customer.id}
                          </span>
                          {customer.source && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-medium truncate max-w-[130px]">
                              {customer.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit & Delete Icons in header */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(customer)}
                        title="Edit customer details"
                        className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(customer)}
                        title="Delete customer from database"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Methods (with default +91 and WhatsApp) */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-xs">🇮🇳</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {formattedPhone || customer.mobile || 'No Mobile'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {telNumber && (
                          <a
                            href={telNumber}
                            title="Call customer"
                            className="p-1 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Message on WhatsApp"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {customer.email && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 px-1">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <a
                          href={`mailto:${customer.email}`}
                          className="hover:text-amber-600 truncate text-[11px]"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}

                    {customer.address && (
                      <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 px-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="text-[11px] line-clamp-2">{customer.address}</span>
                      </div>
                    )}

                    {customer.notes && (
                      <div className="mt-2 p-2 bg-amber-50/70 dark:bg-amber-950/20 rounded-lg text-[11px] text-amber-900 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="font-bold">Notes: </span>
                        {customer.notes}
                      </div>
                    )}
                  </div>

                  {/* Linked Events Overview */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Event Bookings ({linkedEvents.length})
                      </span>
                      {activeEvents.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          {activeEvents.length} Active
                        </span>
                      )}
                    </div>

                    {linkedEvents.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1">
                        No events booked yet for this customer.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {linkedEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => onSelectEvent && onSelectEvent(ev.id)}
                            className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] cursor-pointer transition-colors"
                          >
                            <div className="truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {ev.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {ev.eventType} &bull; {ev.eventDateStart}
                              </span>
                            </div>
                            <span
                              className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                ev.status === 'Confirmed' || ev.status === 'Booking Confirmed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : ev.status === 'In Execution'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                  : ev.status === 'Completed'
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}
                            >
                              {ev.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(customer)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(customer)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {onNewEventForCustomer && (
                    <button
                      type="button"
                      onClick={() => onNewEventForCustomer(customer.id)}
                      className="px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="Create new event booking for this customer"
                    >
                      <span>+ Book Event</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Customer Details</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {editingCustomer.name}
                </h3>
                <p className="text-xs text-slate-300">ID: {editingCustomer.id}</p>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setEditingCustomer(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Customer / Client Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Adv. Rameshwar Deshmukh"
                  required
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Mobile Number with default +91 country code input */}
              <PhoneInputField
                id="edit_customer_mobile"
                label="Mobile Phone Number *"
                value={editMobile}
                onChange={setEditMobile}
                required
                placeholder="94221 88290"
                helperText="System default country code is +91 (India)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Source
                  </label>
                  <input
                    type="text"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    placeholder="e.g. Direct Referral, Instagram"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address / City / Tehsil
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Station Road, Warud, Dist. Amravati"
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Preferences &amp; Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Family background, preferred rituals, budget expectations, VIP arrangements..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Saving Changes...' : 'Save Customer Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="bg-red-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">
                  Delete Customer from Database?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setDeletingCustomer(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete customer record{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  &ldquo;{deletingCustomer.name}&rdquo;
                </strong>{' '}
                ({deletingCustomer.id}) from the Firestore database?
              </p>

              {/* Check if linked events exist */}
              {(() => {
                const linked = customerEventsMap.get(deletingCustomer.id) || [];
                if (linked.length > 0) {
                  return (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Warning: {linked.length} Linked Event(s) Found</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px]">
                        This client has {linked.length} associated event record(s):
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5 max-h-24 overflow-y-auto">
                        {linked.map((ev) => (
                          <li key={ev.id}>
                            {ev.title} ({ev.eventType} - {ev.status})
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                        Deleting this customer will remove their client account from Firestore and archive their details in linked event audit logs.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Deleting...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-200 uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Customer Onboarding</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  Add Customer to Master Database
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Family Head Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Adv. Rameshwar Deshmukh"
                  required
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Mobile with default +91 country code input */}
              <PhoneInputField
                id="new_customer_mobile"
                label="Mobile Phone Number *"
                value={newMobile}
                onChange={setNewMobile}
                required
                placeholder="94220 12345"
                helperText="System default country code is +91 (India)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Source
                  </label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="Direct Referral, Word of mouth"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address / City / Tehsil
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Station Road, Warud, Dist. Amravati"
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Preferences &amp; Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Prefers traditional Marathi rituals, specific catering choices, VIP guests..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Saving...' : 'Add Customer to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
