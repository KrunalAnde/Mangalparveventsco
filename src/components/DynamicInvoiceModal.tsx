import React, { useState, useEffect } from 'react';
import {
  EventItem,
  Invoice,
  InvoiceType,
  InvoiceLine,
  Quote,
  EventVendorAssignment,
  Payment,
} from '../types';
import {
  X,
  Receipt,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  Calendar,
  CheckCircle2,
  FileText,
  Percent,
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface DynamicInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EventItem;
  events?: EventItem[];
  quotes?: Quote[];
  assignments?: EventVendorAssignment[];
  existingInvoices?: Invoice[];
  payments?: Payment[];
  onInvoiceCreated?: (newInvoice: Invoice, shouldConfirmBooking?: boolean) => Promise<void> | void;
  onInvoiceSaved?: (newInvoice: Invoice, shouldConfirmBooking?: boolean) => Promise<void> | void;
  actorName?: string;
}

export const DynamicInvoiceModal: React.FC<DynamicInvoiceModalProps> = ({
  isOpen,
  onClose,
  event: initialEvent,
  events = [],
  quotes = [],
  assignments = [],
  existingInvoices = [],
  payments = [],
  onInvoiceCreated,
  onInvoiceSaved,
  actorName = 'Admin',
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEvent?.id || '');
  const activeEvent = initialEvent || events.find((e) => e.id === selectedEventId) || events[0];

  useEffect(() => {
    if (initialEvent) {
      setSelectedEventId(initialEvent.id);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [initialEvent, events]);

  // Invoice Mode: 'lumpsum' or 'itemized'
  const [invoiceMode, setInvoiceMode] = useState<'lumpsum' | 'itemized'>('lumpsum');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Advance');
  const [title, setTitle] = useState<string>('Booking Advance Invoice');
  const [notes, setNotes] = useState<string>('Payable via UPI / Bank Transfer. Mention invoice # in transaction ref.');
  const [gstRate, setGstRate] = useState<number>(18);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [markBookingConfirmed, setMarkBookingConfirmed] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lump sum base amount
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(50000);

  // Itemized lines
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: `line_${Date.now()}_1`,
      description: 'Event Management & Coordination Advance',
      category: 'Coordination',
      quantity: 1,
      unitPrice: 50000,
      amount: 50000,
    },
  ]);

  // Associated event quote & assignments
  const eventQuotes = quotes.filter((q) => q.eventId === activeEvent?.id);
  const acceptedQuote = eventQuotes.find((q) => q.status === 'Accepted') || eventQuotes[0];
  const eventEstimatedTotal = acceptedQuote?.grandTotal || activeEvent?.budgetMax || activeEvent?.budgetMin || 100000;

  const eventInvoices = existingInvoices.filter((i) => i.eventId === activeEvent?.id);
  const totalPreviouslyInvoiced = eventInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  // Payments for this active event
  const activeEventPayments = (payments || []).filter((p) => p.eventId === activeEvent?.id);
  const totalReceiptsReceived = activeEventPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalInvoicesPaid = eventInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const totalCustomerPaid = Math.max(totalReceiptsReceived, totalInvoicesPaid);

  // 1. Advance breakdown
  const advanceInvoices = eventInvoices.filter((i) => i.invoiceType === 'Advance');
  const advanceInvoicedTotal = advanceInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const advanceReceiptsTotal = activeEventPayments
    .filter((p) => p.paymentType === 'Advance' || advanceInvoices.some((inv) => inv.id === p.invoiceId || (p.invoiceNumber && inv.invoiceNumber === p.invoiceNumber)))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const advanceInvoicesPaidTotal = advanceInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const advancePaidTotal = Math.max(advanceReceiptsTotal, advanceInvoicesPaidTotal);

  // Target Advance: 25% of total contract amount
  const targetAdvanceAmount = Math.round(eventEstimatedTotal * 0.25);
  const effectiveAdvanceAmount = advancePaidTotal > 0
    ? advancePaidTotal
    : (advanceInvoicedTotal > 0 ? advanceInvoicedTotal : targetAdvanceAmount);

  // 2. Milestone breakdown
  // "After completing advance token amount then milestone amount shuld be calculated 50% of remaining total amount."
  const remainingTotalAfterAdvance = Math.max(0, eventEstimatedTotal - effectiveAdvanceAmount);
  const targetMilestoneAmount = Math.round(remainingTotalAfterAdvance * 0.50);

  const milestoneInvoices = eventInvoices.filter((i) => i.invoiceType === 'Milestone');
  const milestoneInvoicedTotal = milestoneInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const milestoneReceiptsTotal = activeEventPayments
    .filter((p) => p.paymentType === 'Milestone' || milestoneInvoices.some((inv) => inv.id === p.invoiceId || (p.invoiceNumber && inv.invoiceNumber === p.invoiceNumber)))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const milestoneInvoicesPaidTotal = milestoneInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const milestonePaidTotal = Math.max(milestoneReceiptsTotal, milestoneInvoicesPaidTotal);

  const effectiveMilestoneAmount = milestonePaidTotal > 0
    ? milestonePaidTotal
    : (milestoneInvoicedTotal > 0 ? milestoneInvoicedTotal : targetMilestoneAmount);

  // 3. Final Balance Breakdown
  // "remaining final amount = total amount -( advance amount+milestone amount(!if not paid)). After paying milestone and advance payment final balance reducing."
  const totalPaidAdvanceAndMilestone = advancePaidTotal + milestonePaidTotal;
  const totalPaidOverall = Math.max(totalCustomerPaid, totalPaidAdvanceAndMilestone);

  const targetFinalBalance = totalPaidOverall > 0
    ? Math.max(0, eventEstimatedTotal - totalPaidOverall)
    : Math.max(0, eventEstimatedTotal - (effectiveAdvanceAmount + effectiveMilestoneAmount));

  const getBaseAmountForTarget = (target: number, currentGstRate = gstRate) => {
    if (currentGstRate === 0) return target;
    return Math.round(target / (1 + currentGstRate / 100));
  };

  // Auto-fill preset calculations when type changes
  const applyPreset = (type: InvoiceType) => {
    setInvoiceType(type);
    let target = 0;
    if (type === 'Advance') {
      setTitle('Booking Advance Invoice (25% of Total Contract)');
      target = targetAdvanceAmount;
      setMarkBookingConfirmed(true);
    } else if (type === 'Milestone') {
      setTitle('Milestone Progress Invoice (50% of Remaining Balance)');
      target = targetMilestoneAmount;
    } else if (type === 'Final') {
      setTitle('Final Balance Settlement Invoice');
      target = targetFinalBalance;
    }

    const baseAmount = getBaseAmountForTarget(target);
    const resolvedBase = baseAmount > 0 ? baseAmount : (target > 0 ? target : 25000);
    setLumpSumAmount(resolvedBase);

    setLines([
      {
        id: `line_${Date.now()}_1`,
        description: type === 'Advance'
          ? 'Booking Advance Token (25% of Total Contract Value)'
          : type === 'Milestone'
          ? 'Milestone Progress Payment (50% of Remaining Balance)'
          : 'Final Commercial Settlement & Closing Balance',
        category: 'Coordination',
        quantity: 1,
        unitPrice: resolvedBase,
        amount: resolvedBase,
      },
    ]);
  };

  // On open or event switch, smartly select the next stage and calculate amount
  useEffect(() => {
    if (!isOpen) return;
    let nextStage: InvoiceType = 'Advance';
    if (advancePaidTotal >= targetAdvanceAmount || advanceInvoicedTotal > 0) {
      if (milestonePaidTotal >= targetMilestoneAmount || milestoneInvoicedTotal > 0) {
        nextStage = 'Final';
      } else {
        nextStage = 'Milestone';
      }
    }
    applyPreset(nextStage);
  }, [isOpen, activeEvent?.id, advanceInvoicedTotal, milestoneInvoicedTotal, totalPaidOverall]);

  // Populate line items from assigned vendors or accepted quote
  const handleImportAssignedServices = () => {
    const eventAssgns = assignments.filter((a) => a.eventId === activeEvent?.id);
    if (eventAssgns.length > 0) {
      const importedLines: InvoiceLine[] = eventAssgns.map((a, idx) => ({
        id: `line_imp_${idx}_${Date.now()}`,
        description: `${a.category}: ${a.vendorName} (${a.quantity} units)`,
        category: a.category,
        quantity: 1,
        unitPrice: a.customerPrice || a.agreedCost,
        amount: a.customerPrice || a.agreedCost,
      }));
      setLines(importedLines);
      setInvoiceMode('itemized');
    } else if (acceptedQuote && acceptedQuote.lines?.length > 0) {
      const importedLines: InvoiceLine[] = acceptedQuote.lines.map((l, idx) => ({
        id: `line_quote_${idx}_${Date.now()}`,
        description: `${l.category}: ${l.description}`,
        category: l.category,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
      }));
      setLines(importedLines);
      setInvoiceMode('itemized');
    }
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: `line_${Date.now()}`,
        description: 'Additional Service / Facility',
        category: 'Services',
        quantity: 1,
        unitPrice: 10000,
        amount: 10000,
      },
    ]);
  };

  const handleUpdateLine = (id: string, field: keyof InvoiceLine, val: any) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = Number(updated.quantity || 0) * Number(updated.unitPrice || 0);
        }
        return updated;
      })
    );
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  // Calculate totals
  const subtotal =
    invoiceMode === 'itemized'
      ? lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
      : Number(lumpSumAmount) || 0;

  const taxAmount = Math.round((subtotal * gstRate) / 100);
  const grandTotal = subtotal + taxAmount;

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    setIsSubmitting(true);

    try {
      const invId = `inv_${Date.now()}`;
      const invNum = `MP-INV-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newInvoice: Invoice = {
        id: invId,
        eventId: activeEvent.id,
        invoiceNumber: invNum,
        invoiceType,
        title: title.trim() || `${invoiceType} Invoice`,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate,
        subtotal,
        tax: taxAmount,
        total: grandTotal,
        paidAmount: 0,
        status: 'Pending',
        gstRate,
        notes: (notes || '').trim(),
        lines: invoiceMode === 'itemized' && lines.length > 0 ? lines : [],
      };

      const shouldConfirm =
        markBookingConfirmed &&
        activeEvent &&
        activeEvent.status !== 'Confirmed' &&
        activeEvent.status !== 'Booking Confirmed';

      const callback = onInvoiceCreated || onInvoiceSaved;
      if (callback) {
        await callback(newInvoice, shouldConfirm);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Dynamic Commercial Invoice Generator</h3>
              <p className="text-xs text-slate-300">
                Generate advance, milestone, or final tax invoices with GST and line-item customization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {/* Linked Event Selection (if not locked to one) */}
          {!initialEvent && events.length > 0 && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Linked Event *</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                required
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} &bull; {evt.customerName} ({evt.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeEvent && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Event Target</span>
                <div className="font-bold text-slate-900 text-sm">{activeEvent.title}</div>
                <div className="text-slate-500 text-[11px]">
                  Client: <strong className="text-slate-700">{activeEvent.customerName}</strong> &bull; Date:{' '}
                  {activeEvent.eventDateStart} &bull; Status:{' '}
                  <span className="font-semibold text-amber-900">{activeEvent.status}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Estimated Grand Value</div>
                <div className="text-sm font-black text-slate-900">{formatINR(eventEstimatedTotal)}</div>
                <div className="text-[11px] text-slate-500">Invoiced: {formatINR(totalPreviouslyInvoiced)}</div>
              </div>
            </div>
          )}

          {/* Invoice Stage Presets */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="font-bold text-slate-700 block">Invoice Stage & Payment Type</label>
              <InfoTooltip
                title="Invoice Stages"
                content="Select the commercial milestone: Advance Token (typically 20-30% to block date & vendors), Milestone (interim stage during planning), or Final Balance (clearing remaining contract amount)."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('Advance')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  invoiceType === 'Advance'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">1. Advance Token</span>
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                    25% Total
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-1">{formatINR(targetAdvanceAmount)}</div>
                <div className="text-[10px] mt-0.5">
                  {advancePaidTotal >= targetAdvanceAmount ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid ({formatINR(advancePaidTotal)})
                    </span>
                  ) : advancePaidTotal > 0 ? (
                    <span className="text-amber-700 font-medium">
                      Paid: {formatINR(advancePaidTotal)} / {formatINR(targetAdvanceAmount)}
                    </span>
                  ) : advanceInvoicedTotal > 0 ? (
                    <span className="text-blue-700 font-medium">
                      Billed: {formatINR(advanceInvoicedTotal)} (Unpaid)
                    </span>
                  ) : (
                    <span className="text-slate-500">25% of total contract</span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('Milestone')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  invoiceType === 'Milestone'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">2. Milestone</span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                    50% Rem.
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-1">{formatINR(targetMilestoneAmount)}</div>
                <div className="text-[10px] mt-0.5">
                  {milestonePaidTotal >= targetMilestoneAmount ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid ({formatINR(milestonePaidTotal)})
                    </span>
                  ) : milestonePaidTotal > 0 ? (
                    <span className="text-amber-700 font-medium">
                      Paid: {formatINR(milestonePaidTotal)} / {formatINR(targetMilestoneAmount)}
                    </span>
                  ) : milestoneInvoicedTotal > 0 ? (
                    <span className="text-blue-700 font-medium">
                      Billed: {formatINR(milestoneInvoicedTotal)} (Unpaid)
                    </span>
                  ) : (
                    <span className="text-slate-500">50% of remaining balance</span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('Final')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  invoiceType === 'Final'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">3. Final Balance</span>
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                    Remaining
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-1">{formatINR(targetFinalBalance)}</div>
                <div className="text-[10px] mt-0.5">
                  {totalPaidOverall > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      Reduced by {formatINR(totalPaidOverall)} paid
                    </span>
                  ) : (
                    <span className="text-slate-500">Total - (Adv + Milestone)</span>
                  )}
                </div>
              </button>
            </div>

            {/* Dynamic Milestone Calculation Breakdown Note */}
            <div className="mt-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  Commercial Payment Schedule & Live Tracking
                </span>
                <span className="text-slate-900 font-black">Contract: {formatINR(eventEstimatedTotal)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px] text-slate-600 pt-1 border-t border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700">Advance (25%):</span>{' '}
                  <strong className="text-amber-800">{formatINR(targetAdvanceAmount)}</strong>
                  <div className="text-[10px] text-slate-500">
                    Rem. after advance: {formatINR(remainingTotalAfterAdvance)}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Milestone (50% rem.):</span>{' '}
                  <strong className="text-blue-800">{formatINR(targetMilestoneAmount)}</strong>
                  <div className="text-[10px] text-slate-500">
                    50% of {formatINR(remainingTotalAfterAdvance)}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Final Balance:</span>{' '}
                  <strong className="text-emerald-800">{formatINR(targetFinalBalance)}</strong>
                  <div className="text-[10px] text-slate-500">
                    {totalPaidOverall > 0 ? `Total - ${formatINR(totalPaidOverall)} collected` : 'Total - (Adv + Milestone)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Auto-Confirmation Toggle */}
          {activeEvent && activeEvent.status !== 'Confirmed' && activeEvent.status !== 'Booking Confirmed' && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
              <input
                type="checkbox"
                id="autoConfirmCheck"
                checked={markBookingConfirmed}
                onChange={(e) => setMarkBookingConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="autoConfirmCheck" className="text-xs text-emerald-900 cursor-pointer flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">Reflect "Booking Confirmed" across Active Events</span>
                  <InfoTooltip
                    title="Lifecycle Progression"
                    content="Automatically updates this event's status to 'Booking Confirmed' across the dashboard and pipeline upon issuing this commercial invoice."
                  />
                </div>
                <span className="text-[11px] text-emerald-700 block mt-0.5">
                  Promotes event status to "Booking Confirmed" upon saving this invoice.
                </span>
              </label>
            </div>
          )}

          {/* Invoice Title & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Subject / Description</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Booking Advance 25% Deposit"
                className="w-full p-2 border border-slate-300 rounded-lg font-medium text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Due Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Invoice Mode Toggle (Lump sum vs Detailed Itemized) */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <label className="font-bold text-slate-700">Billing Mode</label>
                <InfoTooltip
                  title="Billing Mode"
                  content="Choose 'Lump Sum' for turnkey packages or percentage advances without itemizing every vendor line. Choose 'Itemized' to bill individual deliverables (catering, mandap, sound) separately."
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInvoiceMode('lumpsum')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    invoiceMode === 'lumpsum' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Lump Sum / Stage
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceMode('itemized')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    invoiceMode === 'itemized' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Itemized Line Items
                </button>
              </div>
            </div>

            {invoiceMode === 'lumpsum' ? (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block text-xs">
                    Taxable Amount (₹ Before GST)
                  </label>
                  <span className="text-[10px] text-slate-500">Enter any custom amount</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={lumpSumAmount === 0 ? '' : lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    step="any"
                    min="0"
                    placeholder="Enter taxable amount in ₹"
                    className="w-full pl-7 pr-4 py-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-slate-900"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] font-medium text-slate-500">Quick Presets:</span>
                  {[25000, 50000, 100000, 150000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setLumpSumAmount(amt)}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:border-slate-400 cursor-pointer"
                    >
                      {formatINR(amt)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Breakdown of charges for this commercial tax invoice
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleImportAssignedServices}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Fill from Event Services</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Line</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {lines.map((line, idx) => (
                    <div key={line.id} className="p-2.5 bg-slate-50/50 flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleUpdateLine(line.id, 'description', e.target.value)}
                          placeholder="Service description"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          value={line.quantity === 0 ? '' : line.quantity}
                          min="1"
                          step="any"
                          onChange={(e) => handleUpdateLine(line.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                          placeholder="Qty"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          value={line.unitPrice === 0 ? '' : line.unitPrice}
                          step="any"
                          min="0"
                          onChange={(e) => handleUpdateLine(line.id, 'unitPrice', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                          placeholder="Unit Rate"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs text-right font-semibold"
                        />
                      </div>
                      <div className="w-28 text-right font-bold text-slate-900 pr-1">
                        {formatINR(line.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={lines.length === 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic GST Tax Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Applicable GST Slab</label>
                <InfoTooltip
                  title="GST Rate Slabs"
                  content="Select the statutory tax rate: 18% for event management and sound/decor services, 12% for venue hall bookings, 5% for pure catering, or 0% for tax-exempt operations."
                />
              </div>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white cursor-pointer"
              >
                <option value={18}>18% GST (9% CGST + 9% SGST - Standard Services)</option>
                <option value={12}>12% GST (6% CGST + 6% SGST - Venue Accommodations)</option>
                <option value={5}>5% GST (2.5% CGST + 2.5% SGST - Pure Catering)</option>
                <option value={0}>0% GST (Tax Exempt / Composite)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Notes / Bank Details</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bank IFSC & payment instructions"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Real-time Calculation Breakdown Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-white">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                GST ({gstRate}%): {gstRate > 0 ? `CGST ${gstRate / 2}% + SGST ${gstRate / 2}%` : 'Exempt'}
              </span>
              <span className="font-semibold text-white">{formatINR(taxAmount)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400">Total Payable Amount</span>
                <span className="text-[10px] text-slate-400 block">Inclusive of all local Maharashtra taxes</span>
              </div>
              <div className="text-lg font-black text-emerald-400">{formatINR(grandTotal)}</div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || subtotal <= 0}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Generating Invoice...' : 'Generate & Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
