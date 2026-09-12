import React from 'react';
import { EventItem, Quote, Invoice, Payment, Task, Vendor } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Calculator,
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface DashboardViewProps {
  events: EventItem[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: Task[];
  vendors: Vendor[];
  onSelectEvent: (eventId: string) => void;
  onNewEvent: () => void;
  onGoToTab?: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  quotes,
  invoices,
  payments,
  tasks,
  vendors,
  onSelectEvent,
  onNewEvent,
  onGoToTab,
}) => {
  const { currentRole } = useAuth();

  // Active & Confirmed Events breakdown (case-insensitive safe trimming)
  const isBookingConfirmed = (status?: string) => {
    const s = (status || '').trim().toLowerCase();
    return s === 'confirmed' || s === 'booking confirmed';
  };
  const activeEvents = events.filter((e) => {
    const s = (e.status || '').trim().toLowerCase();
    return s !== 'completed' && s !== 'cancelled';
  });
  const confirmedEvents = activeEvents.filter((e) => isBookingConfirmed(e.status));
  const inExecutionEvents = activeEvents.filter((e) => (e.status || '').trim().toLowerCase() === 'in execution');
  const pipelineEvents = activeEvents.filter(
    (e) => !isBookingConfirmed(e.status) && (e.status || '').trim().toLowerCase() !== 'in execution'
  );

  // Financial Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCollected = payments
    .filter((p) => p.payerType === 'Customer' && p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0);
  const outstandingReceivables = Math.max(0, totalInvoiced - totalCollected);

  // Total Pipeline Revenue: computed per active event using quotes if generated, else budget bands
  const totalPipelineRevenue = activeEvents.reduce((sum, evt) => {
    const evtQuotes = quotes.filter((q) => q.eventId === evt.id);
    if (evtQuotes.length > 0) {
      return sum + evtQuotes[0].grandTotal;
    }
    return sum + (evt.budgetMax || evt.budgetMin || 0);
  }, 0);

  const confirmedEventsCount = confirmedEvents.length + inExecutionEvents.length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Done').length;

  const [eventFilter, setEventFilter] = React.useState<'ALL' | 'CONFIRMED' | 'PIPELINE' | 'EXECUTION'>('ALL');

  const formatINR = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  // Days to next event countdown with safe date parsing
  const now = new Date();
  const sortedUpcomingEvents = [...activeEvents]
    .filter((e) => {
      if (eventFilter === 'CONFIRMED') return isBookingConfirmed(e.status);
      if (eventFilter === 'PIPELINE') return !isBookingConfirmed(e.status) && (e.status || '').trim().toLowerCase() !== 'in execution';
      if (eventFilter === 'EXECUTION') return (e.status || '').trim().toLowerCase() === 'in execution';
      return true;
    })
    .sort((a, b) => {
      const timeA = a.eventDateStart ? new Date(a.eventDateStart).getTime() : 0;
      const timeB = b.eventDateStart ? new Date(b.eventDateStart).getTime() : 0;
      return timeA - timeB;
    });

  return (
    <div className="space-y-6" id="dashboard_view">
      {/* Top Banner / Role Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Warud & Vidarbha Event Operations Hub</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Mangalparv Executive Command Center
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Central multi-vendor orchestration active &bull; <span className="font-semibold text-amber-400">Super Admin Access</span>.
              Full administrative control over bookings, quotes, dynamic invoicing, vendor rate cards, and execution workflows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onNewEvent}
              id="btn_dash_new_event"
              className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Event Wizard</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pipeline & Active Bookings */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Events</span>
              <InfoTooltip
                title="Active Events Lifecycle"
                content="Events currently in the active operations pipeline (excludes completed and cancelled events). Includes Inquiries, Costing, Booking Confirmed, and Live Execution."
              />
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeEvents.length} Active Events</div>
            <div className="text-xs mt-1.5 flex items-center flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{confirmedEvents.length} Confirmed</span>
              </span>
              {inExecutionEvents.length > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  <span>{inExecutionEvents.length} Executing</span>
                </span>
              )}
              <span className="text-slate-500 dark:text-slate-400">&bull; {pipelineEvents.length} Inquiries</span>
            </div>
          </div>
        </div>

        {/* Confirmed Quotations Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quotation Pipeline</span>
              <InfoTooltip
                title="Quotation Pipeline"
                content="Total projected commercial turnover across all active proposals and bookings, calculated from itemized quotes or estimated budget ranges with a target gross profit margin of ~22.5%."
              />
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatINR(totalPipelineRevenue)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
              <span>Target Gross Margin: ~22.5%</span>
            </div>
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receivables Balance</span>
              <InfoTooltip
                title="Customer Receivables"
                content="Total outstanding customer payments under Section 12 (Total Billed Commercial Invoices minus Verified Payment Receipts). Tracks token advances and milestone balances."
              />
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatINR(outstandingReceivables)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Collected: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(totalCollected)}</span>
            </div>
          </div>
        </div>

        {/* Execution Tasks Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operations Tasks</span>
              <InfoTooltip
                title="Operations Execution Tasks"
                content="Live operational checklist items assigned to coordinators and contracted vendors for mandap setup, sound checks, food tastings, and venue clearances."
              />
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingTasksCount} Action Items</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{tasks.filter((t) => t.priority === 'Urgent').length} Urgent</span>
              <span>&bull;</span>
              <span>{vendors.length} Verified Vendors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Events & Quick Status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Upcoming Events & Execution Timeline</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live operational countdown and vendor assignment health</p>
              </div>
              <button
                onClick={() => onGoToTab?.('events')}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>All Events Pipeline ({events.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 no-scrollbar">
              <button
                type="button"
                onClick={() => setEventFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  eventFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Active ({activeEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('CONFIRMED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  eventFilter === 'CONFIRMED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Booking Confirmed ({confirmedEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('PIPELINE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  eventFilter === 'PIPELINE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
              >
                Inquiries & Proposals ({pipelineEvents.length})
              </button>
              {inExecutionEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEventFilter('EXECUTION')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    eventFilter === 'EXECUTION'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                  }`}
                >
                  In Execution ({inExecutionEvents.length})
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedUpcomingEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No events found matching this filter criteria.
                </div>
              ) : (
                sortedUpcomingEvents.map((evt) => {
                  const daysUntil = Math.ceil(
                    (new Date(evt.eventDateStart).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isConfirmed = isBookingConfirmed(evt.status);

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt.id)}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg px-2 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{evt.title}</span>
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Booking Confirmed</span>
                            </span>
                          ) : evt.status === 'In Execution' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                              In Execution
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              {evt.status}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">({evt.eventType})</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                          <span>👤 {evt.customerName}</span>
                          <span>📍 {evt.venueAddress}</span>
                          <span>👥 {evt.guestCount} Guests</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-start sm:self-center">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {new Date(evt.eventDateStart).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              daysUntil <= 30 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {daysUntil > 0 ? `${daysUntil} days to event` : 'Today / In Progress'}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onGoToTab?.('vendors')}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Vendor Directory</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Check availability & rate cards</div>
            </button>

            <button
              onClick={() => onGoToTab?.('quotes')}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Dynamic Cost Sheets</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Internal margins & pricing formulas</div>
            </button>

            <button
              onClick={() => onGoToTab?.('finance')}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Double-Ledger Finance</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customer invoices & vendor payouts</div>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Operational Safeguards & High Priority Alerts */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Commercial Safeguards</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                <span className="font-bold text-amber-900 dark:text-amber-300 block">Double-Booking Guard Active</span>
                <span className="text-amber-800 dark:text-amber-400/90 mt-0.5 block">
                  Vendors cannot be assigned simultaneously to overlapping dates without explicit capacity waiver.
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Locked Commercials</span>
                <span className="text-slate-600 dark:text-slate-400 mt-0.5 block">
                  Once quote is accepted by customer, base vendor cost revisions require new version snapshot.
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Vendor Payout Release Gate</span>
                <span className="text-slate-600 dark:text-slate-400 mt-0.5 block">
                  Accounts release requires coordinator event completion confirmation before final settlement.
                </span>
              </div>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Priority Execution Checklist</h3>
              <button
                onClick={() => onGoToTab?.('tasks')}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
              >
                Board &rarr;
              </button>
            </div>
            <div className="space-y-2.5">
              {tasks.slice(0, 4).map((tsk) => (
                <div key={tsk.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">{tsk.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                        tsk.priority === 'Urgent'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          : tsk.priority === 'High'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tsk.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between items-center">
                    <span>👤 {tsk.ownerName}</span>
                    <span>Due: {tsk.dueAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
