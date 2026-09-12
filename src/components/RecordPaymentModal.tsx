import React, { useState, useEffect } from 'react';
import { EventItem, Invoice, Payment, PaymentType, Vendor } from '../types';
import { X, IndianRupee, CheckCircle2, Calendar, ShieldCheck, Tag, FileText, ArrowRight } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payerType?: 'Customer' | 'Vendor Payout';
  event?: EventItem;
  events?: EventItem[];
  invoices?: Invoice[];
  initialInvoiceId?: string;
  vendors?: Vendor[];
  onPaymentRecorded?: (
    newPayment: Payment,
    shouldConfirmBooking?: boolean
  ) => Promise<void> | void;
  onPaymentSaved?: (
    newPayment: Payment,
    shouldConfirmBooking?: boolean
  ) => Promise<void> | void;
  actorName?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  payerType: initialPayerType = 'Customer',
  event: initialEvent,
  events = [],
  invoices = [],
  initialInvoiceId,
  vendors = [],
  onPaymentRecorded,
  onPaymentSaved,
  actorName = 'Admin',
}) => {
  const [payerType, setPayerType] = useState<'Customer' | 'Vendor Payout'>(initialPayerType);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEvent?.id || (events[0]?.id ?? ''));
  const activeEvent = initialEvent || events.find((e) => e.id === selectedEventId) || events[0];

  const [paymentType, setPaymentType] = useState<PaymentType>('Advance');
  const [amount, setAmount] = useState<number>(50000);
  const [method, setMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Card'>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>(
    `UPI/${Date.now().toString().slice(-6)}/SBI`
  );
  const [notes, setNotes] = useState<string>('Advance booking deposit received in ledger');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId || '');
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id ?? '');
  const [markBookingConfirmed, setMarkBookingConfirmed] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const relevantInvoices = invoices.filter(
    (inv) => inv.eventId === activeEvent?.id && inv.status !== 'Paid'
  );

  const linkedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const invoiceOutstanding = linkedInvoice
    ? Math.max(0, linkedInvoice.total - (linkedInvoice.paidAmount || 0))
    : 0;

  // Synchronize when modal opens or initialInvoiceId changes
  useEffect(() => {
    if (isOpen) {
      if (initialInvoiceId) {
        setSelectedInvoiceId(initialInvoiceId);
        const target = invoices.find((i) => i.id === initialInvoiceId);
        if (target) {
          const due = Math.max(0, target.total - (target.paidAmount || 0));
          if (due > 0) setAmount(due);
          if (target.invoiceType) setPaymentType(target.invoiceType);
          setNotes(`Payment settlement against ${target.invoiceNumber} (${target.invoiceType} Stage)`);
        }
      } else if (!selectedInvoiceId && relevantInvoices.length > 0) {
        // Leave optional or unselected by default
      }
    }
  }, [isOpen, initialInvoiceId, invoices]);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setNotes('General ledger customer receipt');
      return;
    }
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      const due = Math.max(0, inv.total - (inv.paidAmount || 0));
      if (due > 0) {
        setAmount(due);
      }
      if (inv.invoiceType) {
        setPaymentType(inv.invoiceType);
      }
      setNotes(`Payment settlement against ${inv.invoiceNumber} (${inv.invoiceType} Stage)`);
    }
  };

  const handlePaymentTypeChange = (newType: PaymentType) => {
    setPaymentType(newType);
    if (newType === 'Advance') {
      setNotes(
        linkedInvoice
          ? `Advance token deposit against ${linkedInvoice.invoiceNumber}`
          : 'Advance booking deposit locked in ledger'
      );
      setMarkBookingConfirmed(true);
    } else if (newType === 'Milestone') {
      setNotes(
        linkedInvoice
          ? `Milestone progress payment against ${linkedInvoice.invoiceNumber}`
          : 'Mid-planning execution milestone receipt'
      );
    } else if (newType === 'Final') {
      setNotes(
        linkedInvoice
          ? `Final settlement against ${linkedInvoice.invoiceNumber}`
          : 'Final settlement & post-event clearance'
      );
    } else if (newType === 'Security Deposit') {
      setNotes('Refundable caution deposit');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent && payerType === 'Customer') return;
    setIsSubmitting(true);

    try {
      const payId = `pay_${Date.now()}`;
      const receiptNumber =
        payerType === 'Customer'
          ? `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
          : `VPO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const vendor = vendors.find((v) => v.id === selectedVendorId);
      const targetInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

      const newPayment: Payment = {
        id: payId,
        eventId: activeEvent?.id || 'evt_general',
        invoiceId: selectedInvoiceId || undefined,
        invoiceNumber: targetInvoice?.invoiceNumber || undefined,
        payerType,
        paymentType,
        ...(payerType === 'Vendor Payout' && selectedVendorId ? { vendorId: selectedVendorId } : {}),
        ...(payerType === 'Vendor Payout' && vendor?.businessName ? { vendorName: vendor.businessName } : {}),
        amount: Number(amount),
        method,
        transactionRef: transactionRef.trim(),
        receiptNumber,
        paidAt: new Date().toISOString(),
        status: 'Success',
        notes: (notes || '').trim(),
      };

      const shouldConfirm =
        payerType === 'Customer' &&
        markBookingConfirmed &&
        activeEvent &&
        activeEvent.status !== 'Confirmed' &&
        activeEvent.status !== 'Booking Confirmed';

      const callback = onPaymentRecorded || onPaymentSaved;
      if (callback) {
        await callback(newPayment, shouldConfirm);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {payerType === 'Customer' ? 'Record Customer Receipt' : 'Issue Vendor Payout'}
              </h3>
              <p className="text-xs text-emerald-200">
                Log advance or final transaction into the S12/S15 financial ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Payer Type Toggle (if opening generally) */}
          {!initialEvent && (
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPayerType('Customer')}
                className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                  payerType === 'Customer' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Customer Receipt (Receivable)
              </button>
              <button
                type="button"
                onClick={() => setPayerType('Vendor Payout')}
                className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                  payerType === 'Vendor Payout' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Vendor Payout (Payable)
              </button>
            </div>
          )}

          {/* Event Selector */}
          {!initialEvent && events.length > 0 && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Linked Event *</label>
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

          {/* Vendor Selector if Vendor Payout */}
          {payerType === 'Vendor Payout' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Vendor Partner *</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                required
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.businessName} ({v.categories.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Linked Dynamic Invoice Selector (Prominent for Customer Receipts) */}
          {payerType === 'Customer' && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Execute Against Dynamic Invoice</span>
                  <InfoTooltip
                    title="Invoice Relationship"
                    content="Links this receipt directly to an issued invoice number (e.g. MP-INV-2026-308) to update its paid balance in the ledger."
                  />
                </label>
                {linkedInvoice ? (
                  <span className="font-mono text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                    {linkedInvoice.invoiceNumber}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">Unlinked / General</span>
                )}
              </div>

              <select
                value={selectedInvoiceId}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- General Ledger Receipt (No specific invoice) --</option>
                {relevantInvoices.map((inv) => {
                  const bal = Math.max(0, inv.total - (inv.paidAmount || 0));
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} • {inv.title || `${inv.invoiceType} Stage`} — Total: {formatINR(inv.total)} (Due: {formatINR(bal)})
                    </option>
                  );
                })}
              </select>

              {linkedInvoice && (
                <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">Executing Invoice:</span>
                      <span className="font-mono font-black text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {linkedInvoice.invoiceNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {linkedInvoice.invoiceType} Stage
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        linkedInvoice.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : linkedInvoice.status === 'Partial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {linkedInvoice.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Invoice Total</span>
                      <strong className="text-slate-900">{formatINR(linkedInvoice.total)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Paid So Far</span>
                      <strong className="text-emerald-700">{formatINR(linkedInvoice.paidAmount || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Balance Remaining</span>
                      <strong className="text-rose-700">{formatINR(invoiceOutstanding)}</strong>
                    </div>
                  </div>

                  {invoiceOutstanding > 0 && amount !== invoiceOutstanding && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAmount(invoiceOutstanding)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded transition-colors cursor-pointer border border-amber-200"
                      >
                        Set amount to full balance: {formatINR(invoiceOutstanding)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Type Selector (Advance, Milestone, Final, Security Deposit) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Type (Stage Categorization) *</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Advance', 'Milestone', 'Final', 'Security Deposit'] as PaymentType[]).map((type) => {
                const isSelected = paymentType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handlePaymentTypeChange(type)}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      isSelected
                        ? type === 'Advance'
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500'
                          : type === 'Milestone'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500'
                          : type === 'Final'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div>{type}</div>
                    <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                      {type === 'Advance'
                        ? 'Token Deposit'
                        : type === 'Milestone'
                        ? 'Progress'
                        : type === 'Final'
                        ? 'Settlement'
                        : 'Refundable'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflect Booking Confirmed Checkbox */}
          {payerType === 'Customer' &&
            activeEvent &&
            activeEvent.status !== 'Confirmed' &&
            activeEvent.status !== 'Booking Confirmed' && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="reflectConfirmed"
                  checked={markBookingConfirmed}
                  onChange={(e) => setMarkBookingConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="reflectConfirmed" className="cursor-pointer text-emerald-900 flex-1">
                  <span className="font-bold text-xs block flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reflect "Booking Confirmed" in Active Events</span>
                    <InfoTooltip
                      title="Auto Status Update"
                      content="Automatically updates event status to 'Booking Confirmed' across the active pipeline and dashboard once this receipt is saved."
                    />
                  </span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Update event status immediately to "Booking Confirmed" once this payment is logged.
                  </span>
                </label>
              </div>
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Received Amount (₹) *</label>
                <InfoTooltip
                  title="Payment Amount"
                  content="Enter the exact amount received from the customer or disbursed to the vendor. Partial or installment payments are supported."
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-900"
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="font-bold text-slate-700 block">Payment Method / Channel *</label>
                <InfoTooltip
                  title="Payment Channel"
                  content="Select transaction mode for ledger auditing. For bank and UPI transfers, make sure to enter the bank UTR or transaction ID."
                />
              </div>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white cursor-pointer"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="Cash">Cash Receipt (Cashier Counter)</option>
                <option value="Card">Card / Point of Sale (POS)</option>
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Transaction Ref / UTR *</label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI/1234567890/SBI"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Audit Ledger Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50% booking advance paid via phonepe"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Submit footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : `Record ${formatINR(amount)} (${paymentType})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
