import React, { useState } from 'react';
import {
  EventItem,
  Vendor,
  EventVendorAssignment,
  Quote,
  Invoice,
  Payment,
  Task,
  EventStatus,
} from '../types';
import {
  saveEvent,
  deleteEvent,
  assignVendorToEvent,
  saveQuote,
  deleteQuote,
  saveInvoice,
  recordPayment,
  saveTask,
} from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { EventLifecycleStepper } from './EventLifecycleStepper';
import { generateEventSummaryPdf } from '../utils/pdfExport';
import { DeleteEventModal } from './DeleteEventModal';
import { DeleteQuoteModal } from './DeleteQuoteModal';
import { DynamicInvoiceModal } from './DynamicInvoiceModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { InfoTooltip } from './InfoTooltip';
import {
  Calendar,
  IndianRupee,
  Users,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Plus,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  Send,
  Download,
  Percent,
  Check,
  Building,
  Trash2,
  Tag,
  Search,
  Filter,
  Receipt,
  Pencil,
  Edit3,
} from 'lucide-react';

interface EventDetailWorkspaceProps {
  event: EventItem;
  vendors: Vendor[];
  assignments: EventVendorAssignment[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: Task[];
  onBack: () => void;
}

export const EventDetailWorkspace: React.FC<EventDetailWorkspaceProps> = ({
  event,
  vendors,
  assignments,
  quotes,
  invoices,
  payments,
  tasks,
  onBack,
}) => {
  const { currentUser, userProfile } = useAuth();
  const actorName = userProfile?.name || currentUser?.displayName || 'Operator';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'requirements_vendors' | 'cost_sheet' | 'quotes' | 'invoices_payments' | 'tasks'
  >('overview');

  // Filter items for this event
  const eventAssignments = assignments.filter((a) => a.eventId === event.id);
  const eventQuotes = quotes.filter((q) => q.eventId === event.id);
  const eventInvoices = invoices.filter((i) => i.eventId === event.id);
  const eventPayments = payments.filter((p) => p.eventId === event.id);
  const eventTasks = tasks.filter((t) => t.eventId === event.id);

  // Dynamic Pricing State for this event's cost sheet
  const [marginPercent, setMarginPercent] = useState<number>(20);
  const [discountAmount, setDiscountAmount] = useState<number>(15000);
  const [contingencyAmount, setContingencyAmount] = useState<number>(10000);
  const [logisticsAllowance, setLogisticsAllowance] = useState<number>(8000);

  // Master categories list available in Mangalparv (can be added anytime)
  const allAvailableCategories = [
    'Venue',
    'Catering',
    'Decoration',
    'Photography',
    'Sound & DJ',
    'Makeup & Styling',
    'Pandit / Priest',
    'Dessert Counter',
    'Security & Parking',
    'Traditional Shehnai',
  ];

  // Service categories required for this event (includes wizard selections + dynamically added requirements + existing assignments)
  const categories: string[] = (() => {
    let list: string[] = [];
    if (event.requiredServices && Array.isArray(event.requiredServices) && event.requiredServices.length > 0) {
      list = [...event.requiredServices];
    } else if (event.notes && event.notes.includes('[Requirements:')) {
      const match = event.notes.match(/\[Requirements:\s*([^\]]+)\]/);
      if (match && match[1]) {
        const parsed = match[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (parsed.length > 0) list = parsed;
      }
    }
    // Fallback/Union: Also include categories from any existing vendor assignments
    const assignedCats = eventAssignments.map((a) => a.category);
    for (const ac of assignedCats) {
      if (!list.includes(ac)) {
        list.push(ac);
      }
    }
    return list;
  })();

  // Dynamically add unselected service requirement to the event
  const handleAddServiceRequirement = async (newCat: string) => {
    if (!newCat) return;
    const currentServices = event.requiredServices && Array.isArray(event.requiredServices) && event.requiredServices.length > 0
      ? event.requiredServices
      : categories;
    if (currentServices.includes(newCat)) return;
    const updatedServices = [...currentServices, newCat];
    try {
      await saveEvent({
        ...event,
        requiredServices: updatedServices,
        updatedAt: new Date().toISOString(),
      }, actorName);
    } catch (err) {
      console.error('Failed to update required services:', err);
    }
  };

  // Vendor Recommendation Modal state
  const [matchingCategory, setMatchingCategory] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Rate Editing State (Option to change rate of vendor before booking confirmation)
  const [editingRateAssignment, setEditingRateAssignment] = useState<EventVendorAssignment | null>(null);
  const [editAgreedCost, setEditAgreedCost] = useState<number>(0);
  const [editCustomerPrice, setEditCustomerPrice] = useState<number>(0);
  const [editRateNotes, setEditRateNotes] = useState<string>('');
  const [isSavingRate, setIsSavingRate] = useState<boolean>(false);
  const [vendorModalRates, setVendorModalRates] = useState<Record<string, number>>({});

  const handleOpenEditRate = (assignment: EventVendorAssignment) => {
    setEditingRateAssignment(assignment);
    setEditAgreedCost(assignment.agreedCost);
    setEditCustomerPrice(assignment.customerPrice);
    setEditRateNotes(assignment.notes || '');
  };

  const handleSaveEditedRate = async () => {
    if (!editingRateAssignment) return;
    setIsSavingRate(true);
    try {
      const updated: EventVendorAssignment = {
        ...editingRateAssignment,
        agreedCost: editAgreedCost,
        customerPrice: editCustomerPrice,
        notes: editRateNotes,
      };
      const res = await assignVendorToEvent(updated, event.eventDateStart, event.eventDateEnd, actorName);
      if (!res.success && res.error) {
        alert(res.error);
      } else {
        setEditingRateAssignment(null);
      }
    } catch (err) {
      console.error('Failed to update vendor rate:', err);
    } finally {
      setIsSavingRate(false);
    }
  };

  // Dynamic Invoice & Payment Modals & State
  const [showDynamicInvoiceModal, setShowDynamicInvoiceModal] = useState<boolean>(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<boolean>(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState<boolean>(false);

  // Invoices Filtering State
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'All' | 'Pending' | 'Partial' | 'Paid'>('All');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'All' | 'Advance' | 'Milestone' | 'Final'>('All');

  const filteredEventInvoices = eventInvoices.filter((inv) => {
    const q = invoiceSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.title && inv.title.toLowerCase().includes(q)) ||
      (inv.notes && inv.notes.toLowerCase().includes(q));

    const matchesStatus =
      invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter;

    const matchesType =
      invoiceTypeFilter === 'All' || inv.invoiceType === invoiceTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // New Task
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // Calculate Internal Cost and Customer Price from assigned vendors
  const totalAgreedVendorCost = eventAssignments.reduce((sum, a) => sum + (a.agreedCost || 0), 0);
  const totalInternalCost = totalAgreedVendorCost + contingencyAmount + logisticsAllowance;
  const marginAmount = Math.round((totalInternalCost * marginPercent) / 100);
  const sellingBeforeTax = Math.max(0, totalInternalCost + marginAmount - discountAmount);
  const gstTax = Math.round(sellingBeforeTax * 0.18);
  const grandTotalCustomerPrice = sellingBeforeTax + gstTax;

  // Status Progression
  const allStatuses: EventStatus[] = [
    'Draft',
    'Requirement Pending',
    'Costing',
    'Quoted',
    'Negotiating',
    'Booking Confirmed',
    'Confirmed',
    'In Execution',
    'Completed',
  ];

  const handleUpdateStatus = async (newStatus: EventStatus) => {
    await saveEvent({ ...event, status: newStatus, updatedAt: new Date().toISOString() }, actorName);
  };

  // Dynamic Invoice handler
  const handleInvoiceSaved = async (newInv: Invoice, shouldConfirmBooking?: boolean) => {
    await saveInvoice(newInv, actorName);
    if (shouldConfirmBooking) {
      await handleUpdateStatus('Booking Confirmed');
    }
  };

  // Dynamic Payment handler
  const handlePaymentRecorded = async (newPay: Payment, shouldConfirmBooking?: boolean) => {
    await recordPayment(newPay, actorName);
    if (shouldConfirmBooking) {
      await handleUpdateStatus('Booking Confirmed');
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleDownloadSummaryPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      // Brief timeout to ensure UI updates with loading indicator before blocking PDF build
      await new Promise((resolve) => setTimeout(resolve, 80));

      generateEventSummaryPdf({
        event,
        vendors,
        assignments: eventAssignments,
        costSheet: {
          totalAgreedVendorCost,
          contingencyAmount,
          logisticsAllowance,
          totalInternalCost,
          marginPercent,
          marginAmount,
          discountAmount,
          sellingBeforeTax,
          gstTax,
          grandTotalCustomerPrice,
        },
        invoices: eventInvoices,
        payments: eventPayments,
        exportedBy: actorName,
      });

      setPdfSuccessMessage('Event cost sheet & vendor assignments summary PDF generated and downloaded!');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('An error occurred while generating the PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState<boolean>(false);

  const handleDeleteEvent = async (cascade: boolean) => {
    if (event.status === 'Completed') {
      alert('Completed events are finalized in company archives and cannot be deleted.');
      setShowDeleteModal(false);
      return;
    }
    try {
      setIsDeletingEvent(true);
      await deleteEvent(event.id, actorName, cascade);
      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event. Please check connection and try again.');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // Vendor Scoring Engine from PDF Section 9:
  // Score = 30% Availability + 20% Quality + 15% Reliability + 15% Price Fit + 10% Distance + 10% Business Preference
  const scoreVendor = (v: Vendor, cat: string) => {
    const availabilityScore = v.status === 'Suspended' ? 0 : 95;
    const qualityScore = v.qualityScore || 85;
    const reliabilityScore = v.reliabilityScore || 85;
    const priceFitScore = v.baseCost <= event.budgetMax * 0.4 ? 90 : 75;
    const distanceScore = v.serviceArea.toLowerCase().includes('warud') ? 95 : 80;
    const prefBonus = v.status === 'Preferred' ? 95 : 75;

    const weighted =
      availabilityScore * 0.3 +
      qualityScore * 0.2 +
      reliabilityScore * 0.15 +
      priceFitScore * 0.15 +
      distanceScore * 0.1 +
      prefBonus * 0.1;

    return Math.round(weighted);
  };

  // Assign Vendor (supports dynamic service addition & custom agreed rates)
  const handleAssignVendor = async (vendor: Vendor, category: string, customRate?: number) => {
    setAssignmentError(null);
    if (!categories.includes(category)) {
      await handleAddServiceRequirement(category);
    }
    const score = scoreVendor(vendor, category);
    const agreedCost = customRate !== undefined && customRate > 0 ? customRate : (vendor.baseCost || 45000);
    const estimatedPrice = Math.round(agreedCost * 1.25);

    const assignmentId = `asgn_${Date.now()}`;
    const newAssignment: EventVendorAssignment = {
      id: assignmentId,
      eventId: event.id,
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      category,
      requirementId: `req_${category.toLowerCase().replace(/\s+/g, '_')}`,
      quantity: 1,
      agreedCost: agreedCost,
      customerPrice: estimatedPrice,
      selectionScore: score,
      status: 'Proposed',
    };

    const res = await assignVendorToEvent(newAssignment, event.eventDateStart, event.eventDateEnd, actorName);
    if (!res.success && res.error) {
      setAssignmentError(res.error);
    } else {
      setMatchingCategory(null);
    }
  };

  // Confirm Assignment with Double-Booking check
  const handleConfirmAssignment = async (assignment: EventVendorAssignment) => {
    const updated: EventVendorAssignment = {
      ...assignment,
      status: 'Confirmed',
      confirmedAt: new Date().toISOString(),
    };
    const res = await assignVendorToEvent(updated, event.eventDateStart, event.eventDateEnd, actorName);
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  // Generate Quotation Version
  const handleGenerateQuote = async () => {
    const nextVersion = eventQuotes.length + 1;
    const quoteId = `qt_${event.id}_v${nextVersion}`;
    const quoteNumber = `MP-2026-QT-${Math.floor(1000 + Math.random() * 9000)}`;

    const lines = eventAssignments.map((a, idx) => ({
      id: `ql_${idx}`,
      category: a.category,
      description: `${a.vendorName} - Professional Service & Coordination`,
      quantity: a.quantity,
      unitPrice: a.customerPrice,
      amount: a.customerPrice * a.quantity,
    }));

    const newQuote: Quote = {
      id: quoteId,
      eventId: event.id,
      quoteNumber,
      version: nextVersion,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: sellingBeforeTax,
      discount: discountAmount,
      tax: gstTax,
      grandTotal: grandTotalCustomerPrice,
      status: 'Draft',
      terms:
        '1. 30% advance on confirmation. 2. 50% 10 days prior to event. 3. 20% balance on event day. 4. Taxes extra as applicable (18% GST).',
      lines: lines.length > 0 ? lines : [
        { id: 'ql_def', category: 'Event Orchestration', description: `${event.title} Full Package`, quantity: 1, unitPrice: grandTotalCustomerPrice, amount: grandTotalCustomerPrice }
      ],
      createdAt: new Date().toISOString(),
    };

    await saveQuote(newQuote, actorName);
    await handleUpdateStatus('Quoted');
    setActiveTab('quotes');
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const taskId = `task_${Date.now()}`;
    const task: Task = {
      id: taskId,
      eventId: event.id,
      title: newTaskTitle.trim(),
      ownerName: actorName,
      status: 'To Do',
      priority: 'High',
      dueAt: event.eventDateStart,
    };
    await saveTask(task, actorName);
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6" id="event_workspace">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Events List</span>
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
                {event.title}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                  event.status === 'Confirmed' || event.status === 'Booking Confirmed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : event.status === 'In Execution'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : event.status === 'Quoted'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {(event.status === 'Confirmed' || event.status === 'Booking Confirmed') && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{event.status === 'Confirmed' ? 'Booking Confirmed' : event.status}</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
              <span>👤 <strong>Client:</strong> {event.customerName}</span>
              <span>📅 <strong>Dates:</strong> {event.eventDateStart} to {event.eventDateEnd}</span>
              <span>👥 <strong>Guests:</strong> {event.guestCount} pax</span>
              <span>📍 <strong>Venue:</strong> {event.venueAddress}</span>
              <span>💰 <strong>Budget:</strong> {formatINR(event.budgetMin)} - {formatINR(event.budgetMax)}</span>
            </div>
          </div>

          {/* Quick Actions: Summary PDF, Status Stage & Delete */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 self-start lg:self-center">
            <button
              id="header_download_summary_pdf_btn"
              onClick={handleDownloadSummaryPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Generate and download executive PDF with cost sheet & vendor assignments"
            >
              <Download className={`w-3.5 h-3.5 text-amber-400 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Summary PDF'}</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Pipeline Stage:</label>
              <select
                value={event.status}
                onChange={(e) => handleUpdateStatus(e.target.value as EventStatus)}
                className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              >
                {allStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {event.status !== 'Completed' && (
              <button
                id="header_delete_event_btn"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-xs cursor-pointer"
                title="Delete this event from pipeline"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Download Feedback Alert */}
      {pdfSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{pdfSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Horizontal Lifecycle Progress Stepper */}
      <EventLifecycleStepper
        event={event}
        onUpdateStatus={handleUpdateStatus}
        quotesCount={eventQuotes.length}
        assignmentsCount={eventAssignments.length}
        tasksCount={eventTasks.length}
        pendingTasksCount={eventTasks.filter((t) => t.status !== 'Done').length}
      />

      {/* Internal Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Summary' },
          { id: 'requirements_vendors', label: `Requirements & Vendors (${eventAssignments.length})` },
          { id: 'cost_sheet', label: 'Dynamic Cost Sheet' },
          { id: 'quotes', label: `Quotes (${eventQuotes.length})` },
          { id: 'invoices_payments', label: `Invoices & Payments (${eventInvoices.length})` },
          { id: 'tasks', label: `Checklist (${eventTasks.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Event Specifications & Coordinator Notes</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {event.notes || 'No coordinator notes recorded yet.'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Assigned Vendors Status</h3>
                <button
                  onClick={() => setActiveTab('requirements_vendors')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800"
                >
                  Manage Assignments &rarr;
                </button>
              </div>

              {eventAssignments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No vendors assigned yet. Open the "Requirements & Vendors" tab to select verified vendors.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {eventAssignments.map((asgn) => (
                    <div key={asgn.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{asgn.vendorName}</span>
                        <span className="ml-2 text-slate-500">({asgn.category})</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Score: {asgn.selectionScore}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{formatINR(asgn.agreedCost)}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            asgn.status === 'Confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {asgn.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Commercial Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Commercial Snapshot</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Vendor Agreed Base:</span>
                  <span className="font-semibold text-slate-800">{formatINR(totalAgreedVendorCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Internal Cost:</span>
                  <span className="font-semibold text-slate-800">{formatINR(totalInternalCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mangalparv Margin ({marginPercent}%):</span>
                  <span className="font-semibold text-emerald-700">+{formatINR(marginAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Selling (Before Tax):</span>
                  <span className="font-semibold text-slate-900">{formatINR(sellingBeforeTax)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Applicable GST (18%):</span>
                  <span className="font-semibold text-slate-700">+{formatINR(gstTax)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-bold text-slate-900 bg-amber-50 px-2 rounded-lg">
                  <span>Customer Quotation:</span>
                  <span className="text-amber-900">{formatINR(grandTotalCustomerPrice)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="overview_download_pdf_btn"
                  onClick={handleDownloadSummaryPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 text-amber-400 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Summary PDF'}</span>
                </button>

                <button
                  onClick={handleGenerateQuote}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Official Quote &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Requirements & Vendor Selection Engine */}
      {activeTab === 'requirements_vendors' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Service Requirements & Vendor Orchestration
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {categories.length} Active Requirements
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vendor discovery, flexible rate negotiation before confirmation, and double-booking protection. Add unselected services anytime.
              </p>
            </div>

            {/* External "Add Service Requirement" Dropdown */}
            {allAvailableCategories.some((cat) => !categories.includes(cat)) && (
              <div className="flex items-center gap-2">
                <select
                  id="select_add_requirement"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddServiceRequirement(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600/70 rounded-lg px-3 py-2 text-amber-900 dark:text-amber-200 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs cursor-pointer"
                >
                  <option value="" disabled>+ Add Service Requirement</option>
                  {allAvailableCategories
                    .filter((cat) => !categories.includes(cat))
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        + {cat}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {assignmentError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{assignmentError}</span>
            </div>
          )}

          {categories.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Service Categories Configured Yet</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                You can add any service requirement below to begin matching, customizing rates, and assigning verified partner vendors.
              </p>
              <div className="flex justify-center">
                <select
                  id="select_add_first_requirement"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddServiceRequirement(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="" disabled className="text-slate-900 bg-white">+ Choose Service Requirement to Add</option>
                  {allAvailableCategories.map((cat) => (
                    <option key={cat} value={cat} className="text-slate-900 bg-white">
                      + {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const existingAssignment = eventAssignments.find((a) => a.category === cat);
                return (
                  <div
                    key={cat}
                    className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-colors ${
                      existingAssignment
                        ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{cat}</span>
                        {existingAssignment ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              existingAssignment.status === 'Confirmed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {existingAssignment.status}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {existingAssignment ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{existingAssignment.vendorName}</div>
                          <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>Agreed Vendor Rate:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(existingAssignment.agreedCost)}</span>
                              {existingAssignment.status !== 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRate(existingAssignment)}
                                  id={`btn_edit_rate_${existingAssignment.id}`}
                                  className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 cursor-pointer"
                                  title="Change vendor rate before booking confirmation"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Change Rate</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 flex justify-between">
                            <span>Customer Quoted:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(existingAssignment.customerPrice)}</span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 flex justify-between">
                            <span>Fit Score:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{existingAssignment.selectionScore}% Match</span>
                          </div>
                          {existingAssignment.notes && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                              Note: {existingAssignment.notes}
                            </div>
                          )}
                          {existingAssignment.status !== 'Confirmed' && (
                            <div className="text-[10.5px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚡ Rate is flexible &amp; can be updated before booking confirmation.
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Active service requirement. Click below to find verified partners and set custom negotiated rates.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {existingAssignment ? (
                        <>
                          {existingAssignment.status !== 'Confirmed' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleConfirmAssignment(existingAssignment)}
                                className="text-xs font-bold px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                Confirm Booking
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRate(existingAssignment)}
                                className="text-xs font-semibold px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Adjust vendor rate before booking confirmation"
                              >
                                Adjust Rate
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Confirmed
                            </span>
                          )}
                          <button
                            onClick={() => setMatchingCategory(cat)}
                            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Change Vendor
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setMatchingCategory(cat)}
                          className="w-full text-xs font-bold py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Find &amp; Assign Vendor</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vendor Selection Modal (S11 Vendor Recommendation Screen with Rate Customization) */}
          {matchingCategory && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      S11 Vendor Recommendation: {matchingCategory}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Top candidate vendors ranked by quality &amp; availability. Adjust rate according to event requirements.
                    </p>
                  </div>
                  <button
                    onClick={() => setMatchingCategory(null)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3">
                  {vendors
                    .filter((v) =>
                      v.categories.some((c) => c.toLowerCase().includes(matchingCategory.toLowerCase()))
                    )
                    .map((vendor) => {
                      const score = scoreVendor(vendor, matchingCategory);
                      const currentCustomRate =
                        vendorModalRates[vendor.id] !== undefined
                          ? vendorModalRates[vendor.id]
                          : vendor.baseCost || 45000;

                      return (
                        <div
                          key={vendor.id}
                          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 bg-white dark:bg-slate-800/60 transition-all flex flex-col gap-2.5 text-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{vendor.businessName}</span>
                                <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                  {score}% Fit
                                </span>
                              </div>
                              <div className="text-slate-500 dark:text-slate-400">
                                <span>📍 {vendor.serviceArea}</span> &bull; <span>⭐ {vendor.rating} / 5</span> &bull;{' '}
                                <span>Quality: {vendor.qualityScore}%</span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                                Catalog Rate: <strong>{formatINR(vendor.baseCost)}</strong> ({vendor.pricingModel})
                              </div>
                            </div>
                          </div>

                          {/* Editable Event Rate for this Vendor */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Agreed Rate (₹):
                              </label>
                              <input
                                type="number"
                                value={currentCustomRate}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setVendorModalRates((prev) => ({
                                    ...prev,
                                    [vendor.id]: val,
                                  }));
                                }}
                                min="0"
                                className="w-28 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                (Negotiable for scope)
                              </span>
                            </div>

                            <button
                              onClick={() => handleAssignVendor(vendor, matchingCategory, currentCustomRate)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer text-xs"
                            >
                              Assign at {formatINR(currentCustomRate)}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Dynamic Cost Sheet (S12) */}
      {activeTab === 'cost_sheet' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                S12 Dynamic Pricing & Cost Sheet Engine
              </h3>
              <p className="text-xs text-slate-500">
                Transparent separation of vendor cost, contingencies, Mangalparv margin, and statutory taxes
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="costsheet_download_pdf_btn"
                onClick={handleDownloadSummaryPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Generate and download executive PDF with cost sheet & vendor assignments"
              >
                <Download className={`w-3.5 h-3.5 text-amber-400 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Summary PDF'}</span>
              </button>

              <button
                onClick={handleGenerateQuote}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Lock Version & Create Quote</span>
              </button>
            </div>
          </div>

          {/* Live Parameter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Contingency Fund (₹)</label>
                <InfoTooltip
                  title="Contingency Reserve"
                  content="Internal emergency buffer retained for on-ground weather contingencies, urgent electrical generator hire, or unexpected overtime."
                />
              </div>
              <input
                type="number"
                value={contingencyAmount === 0 ? '' : contingencyAmount}
                onChange={(e) => setContingencyAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                step="any"
                min="0"
                placeholder="0"
                className="w-full p-2 bg-white border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Travel & Logistics (₹)</label>
                <InfoTooltip
                  title="Travel & Transport Allowance"
                  content="Dedicated logistics budget for freight, pickup trucks, labor loading/unloading, and crew commute between Warud, Morshi, and Amravati."
                />
              </div>
              <input
                type="number"
                value={logisticsAllowance === 0 ? '' : logisticsAllowance}
                onChange={(e) => setLogisticsAllowance(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                step="any"
                min="0"
                placeholder="0"
                className="w-full p-2 bg-white border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Company Margin (%)</label>
                <InfoTooltip
                  title="Company Gross Margin"
                  content="Operating profit percentage applied over total direct vendor costs and allowances. Industry standard is 18% to 25%."
                />
              </div>
              <input
                type="number"
                value={marginPercent === 0 ? '' : marginPercent}
                onChange={(e) => setMarginPercent(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                step="any"
                min="0"
                max="100"
                placeholder="20"
                className="w-full p-2 bg-white border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Special Discount (₹)</label>
                <InfoTooltip
                  title="Client Promotional Discount"
                  content="Discretionary commercial discount subtracted from the pre-tax selling price to secure customer commitment."
                />
              </div>
              <input
                type="number"
                value={discountAmount === 0 ? '' : discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                step="any"
                min="0"
                placeholder="0"
                className="w-full p-2 bg-white border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Line-by-line Cost breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Assigned Vendor</th>
                  <th className="p-3 text-right">Vendor Agreed Cost</th>
                  <th className="p-3 text-right">Customer Quoted Price</th>
                  <th className="p-3 text-right">Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {eventAssignments.map((a) => {
                  const lineMargin = a.customerPrice - a.agreedCost;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{a.category}</td>
                      <td className="p-3 text-slate-600">{a.vendorName}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatINR(a.agreedCost)}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatINR(a.customerPrice)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">+{formatINR(lineMargin)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="p-3 text-slate-800">Direct Vendor Base Cost Subtotal</td>
                  <td className="p-3 text-right text-slate-900">{formatINR(totalAgreedVendorCost)}</td>
                  <td colSpan={2}></td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-3 text-slate-800">Internal Cost (Vendor Base + Contingency + Travel)</td>
                  <td className="p-3 text-right text-slate-900">{formatINR(totalInternalCost)}</td>
                  <td colSpan={2}></td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-3 text-slate-800">Mangalparv Margin ({marginPercent}%)</td>
                  <td colSpan={2} className="p-3 text-right text-emerald-700">+{formatINR(marginAmount)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-3 text-slate-800">Client Discount</td>
                  <td colSpan={2} className="p-3 text-right text-rose-600">-{formatINR(discountAmount)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-3 text-slate-800">Selling Price (Before 18% GST)</td>
                  <td colSpan={2} className="p-3 text-right text-slate-900 font-extrabold">{formatINR(sellingBeforeTax)}</td>
                  <td></td>
                </tr>
                <tr className="bg-amber-100/70 text-sm">
                  <td colSpan={2} className="p-3 text-amber-950 font-black">Final Customer Package Price (Inc. GST)</td>
                  <td colSpan={2} className="p-3 text-right text-amber-950 font-black">{formatINR(grandTotalCustomerPrice)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Quotes & Revisions (S13 & S14) */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                S13 / S14 Quotation Engine & Revision History
              </h3>
              <p className="text-xs text-slate-500">
                Auditable quotation versions with customer delivery & acceptance milestones
              </p>
            </div>
            <button
              onClick={handleGenerateQuote}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Revision v{eventQuotes.length + 1}</span>
            </button>
          </div>

          {eventQuotes.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
              No formal quotes created yet. Click "Generate Revision" or use the Cost Sheet to build a quote.
            </div>
          ) : (
            <div className="space-y-4">
              {eventQuotes.map((q) => (
                <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{q.quoteNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border">
                          Version {q.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            q.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.status === 'Sent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Valid Until: {q.validUntil} &bull; Created: {new Date(q.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-amber-900">{formatINR(q.grandTotal)}</div>
                      <div className="text-[11px] text-slate-400">Including 18% GST</div>
                    </div>
                  </div>

                  {/* Included Items */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Included Services Package:
                    </span>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                      {q.lines?.map((line) => (
                        <div key={line.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{line.description}</span>
                            <span className="ml-2 text-[11px] text-slate-400">({line.category})</span>
                          </div>
                          <span className="font-bold text-slate-700">{formatINR(line.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500 italic max-w-md">{q.terms}</div>
                    <div className="flex items-center gap-2">
                      {q.status !== 'Accepted' && (
                        <button
                          id={`btn_delete_draft_quote_ws_${q.id}`}
                          onClick={() => setQuoteToDelete(q)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                          title="Delete draft quotation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete Draft</span>
                        </button>
                      )}
                      {q.status !== 'Accepted' && (
                        <button
                          onClick={async () => {
                            await saveQuote({ ...q, status: 'Accepted' }, actorName);
                            await handleUpdateStatus('Confirmed');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                        >
                          Mark Customer Accepted
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Invoices & Payments (S15) */}
      {activeTab === 'invoices_payments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                S15 Invoices, Receipts & Receivable Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Real-time tracking of advance invoices, milestones, and received UPI/NEFT transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn_issue_dynamic_invoice"
                onClick={() => setShowDynamicInvoiceModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Dynamic Invoice</span>
              </button>
              <button
                id="btn_record_payment_receipt"
                onClick={() => setShowRecordPaymentModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Record Receipt</span>
              </button>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Event Invoices ({eventInvoices.length})</h4>
                  <InfoTooltip
                    title="Dynamic Invoices"
                    content="Invoices issued for this event (e.g. MP-INV-2026-308). Receipts recorded against an invoice automatically deduct from its due balance."
                  />
                </div>
                <span className="text-[11px] text-slate-500">Itemized line items & milestone stages</span>
              </div>
              <div className="text-xs text-slate-500">
                Total Invoiced: <strong className="text-slate-900">{formatINR(eventInvoices.reduce((s, i) => s + (i.total || 0), 0))}</strong>
                &bull; Collected: <strong className="text-emerald-700">{formatINR(eventInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0))}</strong>
              </div>
            </div>

            {/* Filter Controls for Invoices */}
            {eventInvoices.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    placeholder="Search by invoice # (e.g. MP-INV-2026-308), stage, or notes..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['All', 'Pending', 'Partial', 'Paid'] as const).map((st) => {
                    const count =
                      st === 'All'
                        ? eventInvoices.length
                        : eventInvoices.filter((i) => i.status === st).length;
                    const isSelected = invoiceStatusFilter === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setInvoiceStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Stage / Type Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={invoiceTypeFilter}
                    onChange={(e) => setInvoiceTypeFilter(e.target.value as any)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="All">All Stages</option>
                    <option value="Advance">Advance Invoices</option>
                    <option value="Milestone">Milestone Invoices</option>
                    <option value="Final">Final Invoices</option>
                  </select>

                  {(invoiceSearchQuery || invoiceStatusFilter !== 'All' || invoiceTypeFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSearchQuery('');
                        setInvoiceStatusFilter('All');
                        setInvoiceTypeFilter('All');
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {eventInvoices.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No invoices issued yet. Click "Issue Dynamic Invoice" above to generate an advance, milestone, or final invoice.
              </div>
            ) : filteredEventInvoices.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No invoices matching your filter criteria. Try clearing search filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEventInvoices.map((inv) => {
                  const paid = inv.paidAmount || 0;
                  const balanceDue = Math.max(0, inv.total - paid);
                  const percentPaid = Math.min(100, Math.round((paid / (inv.total || 1)) * 100));

                  // Find payments recorded against this invoice
                  const linkedPayments = eventPayments.filter(
                    (p) =>
                      p.invoiceId === inv.id ||
                      (p.invoiceNumber && p.invoiceNumber === inv.invoiceNumber)
                  );

                  return (
                    <div key={inv.id} className="py-4 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Prominent Invoice Number Badge */}
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-amber-700" />
                              <span>{inv.invoiceNumber}</span>
                            </span>

                            {inv.title && <span className="font-semibold text-slate-800">&bull; {inv.title}</span>}

                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {inv.invoiceType} Stage
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'Partial'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {inv.status}
                            </span>

                            {inv.lines && inv.lines.length > 0 && (
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                {inv.lines.length} {inv.lines.length === 1 ? 'item' : 'items'}
                              </span>
                            )}
                          </div>

                          <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                            <span>Due Date: <strong className="text-slate-700">{inv.dueDate}</strong></span>
                            <span>&bull; Subtotal: {formatINR(inv.subtotal)}</span>
                            <span>&bull; GST ({inv.gstRate ?? 18}%): {formatINR(inv.tax)}</span>
                            {inv.notes && <span className="italic text-slate-400">&bull; {inv.notes}</span>}
                          </div>
                        </div>

                        {/* Totals & Action */}
                        <div className="flex items-center gap-4 self-start lg:self-auto">
                          <div className="text-right">
                            <div className="font-black text-slate-900 text-base">{formatINR(inv.total)}</div>
                            <div className="text-slate-500 text-[11px]">
                              Paid: <span className="text-emerald-700 font-bold">{formatINR(paid)}</span>
                              {balanceDue > 0 ? (
                                <span className="text-rose-600 font-semibold ml-1.5">
                                  (Due: {formatINR(balanceDue)})
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold ml-1.5">
                                  (Cleared)
                                </span>
                              )}
                            </div>
                          </div>

                          {balanceDue > 0 ? (
                            <button
                              id={`btn_record_receipt_for_${inv.id}`}
                              onClick={() => {
                                setSelectedInvoiceForPayment(inv);
                                setShowRecordPaymentModal(true);
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                              title={`Record customer receipt directly against ${inv.invoiceNumber}`}
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Record Receipt</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Settled in Full</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar for Invoice */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Collection Progress: {percentPaid}%</span>
                          <span>{formatINR(paid)} / {formatINR(inv.total)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              percentPaid >= 100
                                ? 'bg-emerald-500'
                                : percentPaid > 0
                                ? 'bg-blue-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </div>

                      {/* Linked Receipts Audit Chips */}
                      {linkedPayments.length > 0 && (
                        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-slate-400" />
                            <span>Linked Receipts ({linkedPayments.length}):</span>
                          </span>
                          {linkedPayments.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs"
                            >
                              <span className="font-bold text-slate-900">{p.receiptNumber}</span>
                              <span className="font-bold text-emerald-700">+{formatINR(p.amount)}</span>
                              <span className="text-[10px] text-slate-400">({p.method})</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(p.paidAt).toLocaleDateString('en-IN')}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payments List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Payment Transaction Audit Receipts ({eventPayments.length})
                </h4>
                <InfoTooltip
                  title="Audit Receipts"
                  content="All verified customer transactions logged in the ledger, with explicit dynamic invoice linkage (e.g. MP-INV-2026-308)."
                />
              </div>
              <span className="text-[11px] text-slate-500">Categorized by Advance, Milestone & Final settlements</span>
            </div>
            {eventPayments.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No payments recorded yet. Click "Record Receipt" to log customer advance or balance payment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {eventPayments.map((p) => {
                  const pType = p.paymentType || (p.notes?.toLowerCase().includes('advance') ? 'Advance' : 'Milestone');
                  const linkedInv = eventInvoices.find(
                    (i) => i.id === p.invoiceId || (p.invoiceNumber && i.invoiceNumber === p.invoiceNumber)
                  );
                  const displayInvNum = p.invoiceNumber || linkedInv?.invoiceNumber;

                  return (
                    <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{p.receiptNumber}</span>
                          
                          {/* Prominent Linked Invoice Badge */}
                          {displayInvNum ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-black bg-amber-50 text-amber-900 border border-amber-300"
                              title={`Executed against dynamic invoice ${displayInvNum}`}
                            >
                              <FileText className="w-3 h-3 text-amber-700" />
                              <span>Invoice: {displayInvNum}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              General Ledger
                            </span>
                          )}

                          {/* Payment Type Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              pType === 'Advance'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : pType === 'Milestone'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : pType === 'Final'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {pType} Payment
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {p.method}
                          </span>
                          <span className="text-slate-500">Ref: {p.transactionRef}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                          <span>{new Date(p.paidAt).toLocaleString('en-IN')}</span>
                          {p.notes && <span className="italic text-slate-400">&bull; {p.notes}</span>}
                        </div>
                      </div>
                      <div className="font-black text-emerald-700 text-sm self-start sm:self-auto">
                        +{formatINR(p.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Invoice Modal */}
          <DynamicInvoiceModal
            isOpen={showDynamicInvoiceModal}
            onClose={() => setShowDynamicInvoiceModal(false)}
            event={event}
            quotes={eventQuotes}
            assignments={eventAssignments}
            existingInvoices={eventInvoices}
            payments={eventPayments}
            onInvoiceCreated={handleInvoiceSaved}
            onInvoiceSaved={handleInvoiceSaved}
            actorName={actorName}
          />

          {/* Record Payment Modal */}
          <RecordPaymentModal
            isOpen={showRecordPaymentModal}
            onClose={() => {
              setShowRecordPaymentModal(false);
              setSelectedInvoiceForPayment(null);
            }}
            payerType="Customer"
            event={event}
            invoices={eventInvoices}
            initialInvoiceId={selectedInvoiceForPayment?.id}
            onPaymentRecorded={handlePaymentRecorded}
            onPaymentSaved={handlePaymentRecorded}
            actorName={actorName}
          />
        </div>
      )}

      {/* TAB 6: Tasks & Execution Checklist */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Operations Task Checklist & Milestones
              </h3>
              <p className="text-xs text-slate-500">
                Track team responsibilities from pre-event tastings to wedding day Muhurt execution
              </p>
            </div>
          </div>

          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add new action item or operational reminder..."
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Add Task
            </button>
          </form>

          <div className="divide-y divide-slate-100">
            {eventTasks.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      saveTask(
                        { ...t, status: t.status === 'Done' ? 'To Do' : 'Done' },
                        actorName
                      )
                    }
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      t.status === 'Done'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-amber-500'
                    }`}
                  >
                    {t.status === 'Done' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <span
                      className={`font-semibold ${
                        t.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                      <span>Owner: {t.ownerName}</span>
                      <span>&bull;</span>
                      <span>Due: {t.dueAt}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.priority === 'Urgent'
                      ? 'bg-rose-100 text-rose-800'
                      : t.priority === 'High'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      <DeleteEventModal
        event={event}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEvent}
        isDeleting={isDeletingEvent}
      />

      {/* Delete Quote Confirmation Modal */}
      <DeleteQuoteModal
        quote={quoteToDelete}
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={async (q) => {
          setIsDeletingQuote(true);
          try {
            await deleteQuote(q.id, actorName, q.quoteNumber);
            setQuoteToDelete(null);
          } catch (err) {
            console.error('Failed to delete quote:', err);
          } finally {
            setIsDeletingQuote(false);
          }
        }}
        isDeleting={isDeletingQuote}
      />

      {/* Edit Vendor Rate Modal (Before Booking Confirmation) */}
      {editingRateAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Adjust Vendor Agreed Rate</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingRateAssignment.vendorName} &bull; {editingRateAssignment.category}
                </p>
              </div>
              <button
                onClick={() => setEditingRateAssignment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-300">
              Vendor prices are flexible according to client requirements. You can adjust the agreed vendor payout and customer quoted price anytime before final booking confirmation.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agreed Vendor Cost (₹) *
                </label>
                <input
                  type="number"
                  value={editAgreedCost === 0 ? '' : editAgreedCost}
                  onChange={(e) => {
                    const newCost = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                    setEditAgreedCost(newCost);
                  }}
                  min="0"
                  placeholder="0"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Net rate payable to {editingRateAssignment.vendorName} for this event.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Customer Quoted Price (₹) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditCustomerPrice(Math.round(editAgreedCost * 1.25))}
                    className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Auto +25% Margin
                  </button>
                </div>
                <input
                  type="number"
                  value={editCustomerPrice === 0 ? '' : editCustomerPrice}
                  onChange={(e) => {
                    const newPrice = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                    setEditCustomerPrice(newPrice);
                  }}
                  min="0"
                  placeholder="0"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Gross price billed to the client on quotes and invoices.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scope &amp; Requirement Notes
                </label>
                <input
                  type="text"
                  value={editRateNotes}
                  onChange={(e) => setEditRateNotes(e.target.value)}
                  placeholder="e.g. Rate adjusted for 800 guests, LED stage setup, extended hours"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRateAssignment(null)}
                className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedRate}
                disabled={isSavingRate || editAgreedCost <= 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSavingRate ? 'Saving Rate...' : 'Save Updated Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
