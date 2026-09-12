import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  EventItem,
  Vendor,
  Customer,
  EventVendorAssignment,
  Quote,
  Invoice,
  Payment,
  Task,
  AuditLog,
} from './types';
import {
  seedDatabaseIfEmpty,
  subscribeToEvents,
  subscribeToVendors,
  subscribeToCustomers,
  subscribeToAssignments,
  subscribeToQuotes,
  subscribeToInvoices,
  subscribeToPayments,
  subscribeToTasks,
  subscribeToAuditLogs,
} from './services/firestoreService';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { EventsView } from './components/EventsView';
import { EventDetailWorkspace } from './components/EventDetailWorkspace';
import { NewEventWizard } from './components/NewEventWizard';
import { CustomersView } from './components/CustomersView';
import { VendorsView } from './components/VendorsView';
import { QuotesView } from './components/QuotesView';
import { FinanceView } from './components/FinanceView';
import { ExecutionBoard } from './components/ExecutionBoard';
import { ReportsAuditView } from './components/ReportsAuditView';
import { Loader2 } from 'lucide-react';

function MangalparvApp() {
  const { currentUser, userProfile, isAuthenticating } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState<boolean>(false);
  const [wizardCustomerId, setWizardCustomerId] = useState<string | undefined>(undefined);

  // Firestore real-time collections state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignments, setAssignments] = useState<EventVendorAssignment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(true);

  // Initial bootstrap and subscriptions
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await seedDatabaseIfEmpty();
      } catch (err) {
        console.error('Seed error:', err);
      }
      if (isMounted) {
        setIsLoadingInitialData(false);
      }
    }

    init();

    // Subscribe to all 9 real-time collections
    const unsubEvents = subscribeToEvents(setEvents);
    const unsubVendors = subscribeToVendors(setVendors);
    const unsubCustomers = subscribeToCustomers(setCustomers);
    const unsubAssignments = subscribeToAssignments(setAssignments);
    const unsubQuotes = subscribeToQuotes(setQuotes);
    const unsubInvoices = subscribeToInvoices(setInvoices);
    const unsubPayments = subscribeToPayments(setPayments);
    const unsubTasks = subscribeToTasks(setTasks);
    const unsubAudit = subscribeToAuditLogs(setAuditLogs);

    return () => {
      isMounted = false;
      unsubEvents();
      unsubVendors();
      unsubCustomers();
      unsubAssignments();
      unsubQuotes();
      unsubInvoices();
      unsubPayments();
      unsubTasks();
      unsubAudit();
    };
  }, []);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentTab('events');
  };

  const handleEventCreated = (newEventId: string) => {
    setSelectedEventId(newEventId);
    setCurrentTab('events');
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    if (tab !== 'events') {
      setSelectedEventId(null);
    }
  };

  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Application Header */}
      <Header
        events={events}
        customers={customers}
        vendors={vendors}
        tasks={tasks}
        onSelectEvent={handleSelectEvent}
        onNavigateTab={handleTabChange}
      />

      {/* Primary Navigation */}
      <Navigation
        activeTab={currentTab}
        onTabChange={handleTabChange}
        eventCount={
          events.filter((e) => {
            const s = (e.status || '').trim().toLowerCase();
            return s !== 'completed' && s !== 'cancelled';
          }).length
        }
        customerCount={customers.length}
        taskPendingCount={tasks.filter((t) => t.status !== 'Done').length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isLoadingInitialData ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Connecting to Firestore real-time database...
            </p>
          </div>
        ) : selectedEventId && currentEvent ? (
          <EventDetailWorkspace
            event={currentEvent}
            vendors={vendors}
            assignments={assignments}
            quotes={quotes}
            invoices={invoices}
            payments={payments}
            tasks={tasks}
            onBack={() => setSelectedEventId(null)}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                events={events}
                vendors={vendors}
                quotes={quotes}
                invoices={invoices}
                payments={payments}
                tasks={tasks}
                onSelectEvent={handleSelectEvent}
                onNewEvent={() => setIsNewEventModalOpen(true)}
                onGoToTab={handleTabChange}
              />
            )}

            {currentTab === 'events' && (
              <EventsView
                events={events}
                onSelectEvent={handleSelectEvent}
                onNewEvent={() => setIsNewEventModalOpen(true)}
              />
            )}

            {currentTab === 'customers' && (
              <CustomersView
                customers={customers}
                events={events}
                currentUserName={userProfile?.name || currentUser?.displayName || 'Administrator'}
                onSelectEvent={handleSelectEvent}
                onNewEventForCustomer={(customerId) => {
                  setWizardCustomerId(customerId);
                  setIsNewEventModalOpen(true);
                }}
              />
            )}

            {currentTab === 'vendors' && (
              <VendorsView
                vendors={vendors}
                assignments={assignments}
                events={events}
              />
            )}

            {currentTab === 'quotes' && (
              <QuotesView
                quotes={quotes}
                events={events}
                onSelectEvent={handleSelectEvent}
              />
            )}

            {currentTab === 'finance' && (
              <FinanceView
                invoices={invoices}
                payments={payments}
                events={events}
                assignments={assignments}
                vendors={vendors}
              />
            )}

            {currentTab === 'tasks' && (
              <ExecutionBoard tasks={tasks} events={events} />
            )}

            {currentTab === 'reports' && (
              <ReportsAuditView
                events={events}
                assignments={assignments}
                quotes={quotes}
                auditLogs={auditLogs}
                vendors={vendors}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-serif text-slate-600 dark:text-slate-400">
            मंगलपर्व &bull; Mangalparv Event Operating System &bull; Warud, Dist. Amravati
          </div>
          <div>
            Built with Google Cloud Firestore &amp; Firebase Authentication &bull; Super Admin: krunalande1998@gmail.com
          </div>
        </div>
      </footer>

      {/* New Event Wizard Modal */}
      <NewEventWizard
        customers={customers}
        defaultCustomerId={wizardCustomerId}
        isOpen={isNewEventModalOpen}
        onClose={() => {
          setIsNewEventModalOpen(false);
          setWizardCustomerId(undefined);
        }}
        onEventCreated={handleEventCreated}
        currentUserName={userProfile?.name || currentUser?.displayName || 'Administrator'}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MangalparvApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
