import React, { useState } from 'react';
import { Invoice, Payment, EventItem, EventVendorAssignment, Vendor } from '../types';
import { recordPayment, saveInvoice } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  Filter,
  FileText,
  Check,
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { RecordPaymentModal } from './RecordPaymentModal';

interface FinanceViewProps {
  invoices: Invoice[];
  payments: Payment[];
  events: EventItem[];
  assignments: EventVendorAssignment[];
  vendors: Vendor[];
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  invoices,
  payments,
  events,
  assignments,
  vendors,
}) => {
  const { currentUser, userProfile } = useAuth();
  const actorName = userProfile?.name || currentUser?.displayName || 'Accounts Manager';

  const [activeLedger, setActiveLedger] = useState<'receivables' | 'payables'>('receivables');
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);

  // Receivables Sub-ledger Navigation
  const [receivablesSubTab, setReceivablesSubTab] = useState<'invoices' | 'receipts'>('invoices');

  // Invoices Filter State
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'All' | 'Pending' | 'Partial' | 'Paid'>('All');
  const [invoiceStageFilter, setInvoiceStageFilter] = useState<'All' | 'Advance' | 'Milestone' | 'Final'>('All');
  const [invoiceEventFilter, setInvoiceEventFilter] = useState<string>('All');

  // Receipts Filter State
  const [receiptSearch, setReceiptSearch] = useState<string>('');
  const [receiptMethodFilter, setReceiptMethodFilter] = useState<string>('All');

  // Direct Record Receipt Modal from Finance View
  const [showRecordReceiptModal, setShowRecordReceiptModal] = useState<boolean>(false);
  const [receiptTargetInvoice, setReceiptTargetInvoice] = useState<Invoice | null>(null);

  // Vendor Payout Form
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [payoutEventId, setPayoutEventId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<number>(35000);
  const [payoutMethod, setPayoutMethod] = useState<'Bank Transfer' | 'UPI' | 'Cash'>('Bank Transfer');
  const [payoutRef, setPayoutRef] = useState<string>('NEFT/VEN-' + Math.floor(Math.random() * 900000 + 100000));

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // Customer Ledger Totals
  const totalCustomerInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCustomerCollected = payments
    .filter((p) => p.payerType === 'Customer' && p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalCustomerBalance = Math.max(0, totalCustomerInvoiced - totalCustomerCollected);

  // Filtered Customer Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const parentEvent = events.find((e) => e.id === inv.eventId);
    const q = invoiceSearch.trim().toLowerCase();

    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.title && inv.title.toLowerCase().includes(q)) ||
      (inv.notes && inv.notes.toLowerCase().includes(q)) ||
      (parentEvent?.title && parentEvent.title.toLowerCase().includes(q)) ||
      (parentEvent?.customerName && parentEvent.customerName.toLowerCase().includes(q));

    const matchesStatus =
      invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter;

    const matchesStage =
      invoiceStageFilter === 'All' || inv.invoiceType === invoiceStageFilter;

    const matchesEvent =
      invoiceEventFilter === 'All' || inv.eventId === invoiceEventFilter;

    return matchesSearch && matchesStatus && matchesStage && matchesEvent;
  });

  // Customer Payments & Filtered Receipts
  const customerPayments = payments.filter((p) => p.payerType === 'Customer');
  const filteredCustomerReceipts = customerPayments.filter((p) => {
    const parentEvent = events.find((e) => e.id === p.eventId);
    const q = receiptSearch.trim().toLowerCase();

    const matchesSearch =
      !q ||
      p.receiptNumber.toLowerCase().includes(q) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
      p.transactionRef.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q)) ||
      (parentEvent?.title && parentEvent.title.toLowerCase().includes(q)) ||
      (parentEvent?.customerName && parentEvent.customerName.toLowerCase().includes(q));

    const matchesMethod =
      receiptMethodFilter === 'All' || p.method === receiptMethodFilter;

    return matchesSearch && matchesMethod;
  });

  // Vendor Ledger Totals
  const totalVendorAgreed = assignments
    .filter((a) => a.status === 'Confirmed')
    .reduce((sum, a) => sum + a.agreedCost, 0);
  const totalVendorPaid = payments
    .filter((p) => p.payerType === 'Vendor Payout' && p.status === 'Success')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalVendorDue = Math.max(0, totalVendorAgreed - totalVendorPaid);

  const handleRecordVendorPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const payId = `pay_ven_${Date.now()}`;
    const newPayout: Payment = {
      id: payId,
      eventId: payoutEventId || (events.length > 0 ? events[0].id : 'evt_general'),
      vendorId: selectedVendorId,
      vendorName: vendor ? vendor.businessName : 'Vendor Partner',
      payerType: 'Vendor Payout',
      amount: Number(payoutAmount),
      method: payoutMethod,
      transactionRef: payoutRef,
      receiptNumber: `VPO-${Date.now().toString().slice(-4)}`,
      paidAt: new Date().toISOString(),
      status: 'Success',
      notes: `Advance/Milestone payment to vendor ${vendor?.businessName}`,
    };

    await recordPayment(newPayout, actorName);
    setShowPayoutModal(false);
  };

  return (
    <div className="space-y-6" id="finance_view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Double-Ledger Financial Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            S15 / S12: Customer Receivables & Vendor Payables separation as mandated by Section 12
          </p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          <span>Release Vendor Payout</span>
        </button>
      </div>

      {/* Dual Ledger KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Receivables Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Customer Receivables Ledger</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {invoices.length} Invoices Active
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Total Invoiced</div>
              <div className="text-base font-bold text-slate-900">{formatINR(totalCustomerInvoiced)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Collected (UPI/Bank)</div>
              <div className="text-base font-bold text-emerald-700">{formatINR(totalCustomerCollected)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Overdue / Balance</div>
              <div className="text-base font-black text-rose-700">{formatINR(totalCustomerBalance)}</div>
            </div>
          </div>
        </div>

        {/* Vendor Payables Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span>Vendor Payables Ledger</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Confirmed Work Orders
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Agreed Vendor Base</div>
              <div className="text-base font-bold text-slate-900">{formatINR(totalVendorAgreed)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Paid Advances</div>
              <div className="text-base font-bold text-emerald-700">{formatINR(totalVendorPaid)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Balance Due on Event</div>
              <div className="text-base font-black text-amber-800">{formatINR(totalVendorDue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Navigation Toggle */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveLedger('receivables')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeLedger === 'receivables'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer Invoices & Receipts ({invoices.length})
        </button>
        <button
          onClick={() => setActiveLedger('payables')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeLedger === 'payables'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vendor Work Orders & Payouts ({assignments.filter((a) => a.status === 'Confirmed').length})
        </button>
      </div>

      {/* LEDGER 1: Customer Invoices & Receipts */}
      {activeLedger === 'receivables' && (
        <div className="space-y-4">
          {/* Sub-navigation & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReceivablesSubTab('invoices')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  receivablesSubTab === 'invoices'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Dynamic Invoices ({filteredInvoices.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setReceivablesSubTab('receipts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  receivablesSubTab === 'receipts'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Audit Receipts Ledger ({filteredCustomerReceipts.length})</span>
              </button>
            </div>

            <button
              id="btn_record_customer_receipt_finance"
              type="button"
              onClick={() => {
                setReceiptTargetInvoice(null);
                setShowRecordReceiptModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Record Customer Receipt</span>
            </button>
          </div>

          {/* SUB-VIEW 1: Invoices List */}
          {receivablesSubTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
              {/* Filter Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search by invoice # (e.g. MP-INV-2026-308), event title, customer, notes..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['All', 'Pending', 'Partial', 'Paid'] as const).map((st) => {
                    const count =
                      st === 'All'
                        ? invoices.length
                        : invoices.filter((i) => i.status === st).length;
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

                {/* Stage Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={invoiceStageFilter}
                    onChange={(e) => setInvoiceStageFilter(e.target.value as any)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="All">All Stages</option>
                    <option value="Advance">Advance</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Final">Final</option>
                  </select>

                  {/* Event Filter */}
                  <select
                    value={invoiceEventFilter}
                    onChange={(e) => setInvoiceEventFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none max-w-[150px] truncate"
                  >
                    <option value="All">All Events</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>

                  {(invoiceSearch || invoiceStatusFilter !== 'All' || invoiceStageFilter !== 'All' || invoiceEventFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSearch('');
                        setInvoiceStatusFilter('All');
                        setInvoiceStageFilter('All');
                        setInvoiceEventFilter('All');
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-4 -mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Event & Customer</th>
                      <th className="p-3.5">Stage</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5 text-right">Invoice Total</th>
                      <th className="p-3.5 text-right">Paid Amount</th>
                      <th className="p-3.5 text-right">Balance Due</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Linked Audit Receipts</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          No invoices matching the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const parentEvent = events.find((e) => e.id === inv.eventId);
                        const bal = Math.max(0, inv.total - (inv.paidAmount || 0));
                        const linked = payments.filter(
                          (p) =>
                            p.invoiceId === inv.id ||
                            (p.invoiceNumber && p.invoiceNumber === inv.invoiceNumber)
                        );

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="p-3.5">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                <FileText className="w-3 h-3 text-amber-700" />
                                <span>{inv.invoiceNumber}</span>
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{parentEvent?.title || inv.eventId}</div>
                              {parentEvent?.customerName && (
                                <div className="text-[11px] text-slate-500">{parentEvent.customerName}</div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {inv.invoiceType}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500">{inv.dueDate}</td>
                            <td className="p-3.5 text-right font-bold text-slate-900">{formatINR(inv.total)}</td>
                            <td className="p-3.5 text-right font-bold text-emerald-700">{formatINR(inv.paidAmount)}</td>
                            <td className="p-3.5 text-right font-black">
                              {bal > 0 ? (
                                <span className="text-rose-600">{formatINR(bal)}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">Cleared</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.status === 'Partial'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {linked.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {linked.map((lp) => (
                                    <span
                                      key={lp.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                                      title={`Receipt ${lp.receiptNumber}: ${formatINR(lp.amount)} on ${new Date(lp.paidAt).toLocaleDateString('en-IN')}`}
                                    >
                                      <span>{lp.receiptNumber}</span>
                                      <span className="text-emerald-700 font-bold">+{formatINR(lp.amount)}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No receipts yet</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              {bal > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptTargetInvoice(inv);
                                    setShowRecordReceiptModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs whitespace-nowrap"
                                  title={`Record customer receipt against ${inv.invoiceNumber}`}
                                >
                                  <IndianRupee className="w-3 h-3" />
                                  <span>Record Receipt</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>Settled</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: Customer Receipts Ledger */}
          {receivablesSubTab === 'receipts' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
              {/* Filter Controls for Receipts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    placeholder="Search receipt #, invoice # (e.g. MP-INV-2026-308), UTR reference, customer..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={receiptMethodFilter}
                    onChange={(e) => setReceiptMethodFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="All">All Methods</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>

                  {(receiptSearch || receiptMethodFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptSearch('');
                        setReceiptMethodFilter('All');
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-4 -mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Receipt #</th>
                      <th className="p-3.5">Executed Against Dynamic Invoice</th>
                      <th className="p-3.5">Event & Customer</th>
                      <th className="p-3.5">Stage Type</th>
                      <th className="p-3.5">Method & Reference</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5 text-right">Amount Received</th>
                      <th className="p-3.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCustomerReceipts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          No customer payment receipts found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomerReceipts.map((p) => {
                        const parentEvent = events.find((e) => e.id === p.eventId);
                        const linkedInv = invoices.find(
                          (i) => i.id === p.invoiceId || (p.invoiceNumber && i.invoiceNumber === p.invoiceNumber)
                        );
                        const displayInvNum = p.invoiceNumber || linkedInv?.invoiceNumber;
                        const pType = p.paymentType || (p.notes?.toLowerCase().includes('advance') ? 'Advance' : 'Milestone');

                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-bold text-slate-900">{p.receiptNumber}</td>
                            <td className="p-3.5">
                              {displayInvNum ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-black bg-amber-50 text-amber-900 border border-amber-300"
                                  title={`Executed against dynamic invoice ${displayInvNum}`}
                                >
                                  <FileText className="w-3 h-3 text-amber-700" />
                                  <span>{displayInvNum}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                  General Ledger
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{parentEvent?.title || p.eventId}</div>
                              {parentEvent?.customerName && (
                                <div className="text-[11px] text-slate-500">{parentEvent.customerName}</div>
                              )}
                            </td>
                            <td className="p-3.5">
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
                                {pType}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-slate-800">{p.method}</span>
                              <div className="text-[11px] text-slate-400">Ref: {p.transactionRef}</div>
                            </td>
                            <td className="p-3.5 text-slate-500 text-[11px]">
                              {new Date(p.paidAt).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-right font-black text-emerald-700 text-sm">
                              +{formatINR(p.amount)}
                            </td>
                            <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                              {p.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEDGER 2: Vendor Payables */}
      {activeLedger === 'payables' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Vendor Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Event Assignment</th>
                  <th className="p-3.5 text-right">Agreed Contract Cost</th>
                  <th className="p-3.5 text-right">Advance Paid</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5">Assignment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignments
                  .filter((a) => a.status === 'Confirmed')
                  .map((a) => {
                    const parentEvent = events.find((e) => e.id === a.eventId);
                    const paidSoFar = payments
                      .filter((p) => p.vendorId === a.vendorId && p.status === 'Success')
                      .reduce((sum, p) => sum + p.amount, 0);
                    const bal = Math.max(0, a.agreedCost - paidSoFar);

                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{a.vendorName}</td>
                        <td className="p-3.5 text-slate-600 font-semibold">{a.category}</td>
                        <td className="p-3.5 text-slate-800">{parentEvent?.title}</td>
                        <td className="p-3.5 text-right font-bold text-slate-900">{formatINR(a.agreedCost)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-700">{formatINR(paidSoFar)}</td>
                        <td className="p-3.5 text-right font-black text-amber-800">{formatINR(bal)}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Release Vendor Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordVendorPayout}
            className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-base text-slate-900">Issue Vendor Payout / Advance</h4>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Vendor Partner *</label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                >
                  <option value="">-- Choose vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName} ({v.categories.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Linked Event *</label>
                <select
                  required
                  value={payoutEventId}
                  onChange={(e) => setPayoutEventId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                >
                  <option value="">-- Choose event --</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.customerName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payout Amount (₹) *</label>
                  <input
                    type="number"
                    value={payoutAmount === 0 ? '' : payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full p-2 border border-slate-300 rounded font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payout Method</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded cursor-pointer"
              >
                Disburse & Record in Ledger
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Record Customer Receipt Modal */}
      <RecordPaymentModal
        isOpen={showRecordReceiptModal}
        onClose={() => {
          setShowRecordReceiptModal(false);
          setReceiptTargetInvoice(null);
        }}
        payerType="Customer"
        event={receiptTargetInvoice ? events.find((e) => e.id === receiptTargetInvoice.eventId) : undefined}
        invoices={invoices}
        initialInvoiceId={receiptTargetInvoice?.id}
        actorName={actorName}
      />
    </div>
  );
};
