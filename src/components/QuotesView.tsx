import React, { useState } from 'react';
import { Quote, EventItem } from '../types';
import { saveQuote, saveEvent, deleteQuote } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { DeleteQuoteModal } from './DeleteQuoteModal';
import {
  FileText,
  Search,
  CheckCircle,
  Eye,
  Send,
  Printer,
  Calendar,
  IndianRupee,
  X,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface QuotesViewProps {
  quotes: Quote[];
  events: EventItem[];
  onSelectEvent: (eventId: string) => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  quotes,
  events,
  onSelectEvent,
}) => {
  const { currentUser, userProfile } = useAuth();
  const actorName = userProfile?.name || currentUser?.displayName || 'Admin';

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState<boolean>(false);

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const filteredQuotes = quotes.filter((q) => {
    const parentEvent = events.find((e) => e.id === q.eventId);
    const eventName = parentEvent ? parentEvent.title : '';
    const customerName = parentEvent ? parentEvent.customerName : '';
    return (
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleUpdateQuoteStatus = async (quote: Quote, newStatus: any) => {
    await saveQuote({ ...quote, status: newStatus }, actorName);
    if (newStatus === 'Accepted') {
      const parentEvent = events.find((e) => e.id === quote.eventId);
      if (parentEvent) {
        await saveEvent({ ...parentEvent, status: 'Confirmed', updatedAt: new Date().toISOString() }, actorName);
      }
    }
  };

  const handleConfirmDeleteQuote = async (quote: Quote) => {
    setIsDeletingQuote(true);
    try {
      const res = await deleteQuote(quote.id, actorName, quote.quoteNumber);
      if (res.success) {
        if (selectedQuoteForPreview?.id === quote.id) {
          setSelectedQuoteForPreview(null);
        }
        setQuoteToDelete(null);
      }
    } finally {
      setIsDeletingQuote(false);
    }
  };

  return (
    <div className="space-y-6" id="quotes_view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Costing & Quotation Lifecycle
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            S13 / S14: Commercial proposals, customer package pricing, version snapshots, and GST calculations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quotation by quote number, event name, or client..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Quote Number & Version</th>
                <th className="p-3.5">Associated Event & Client</th>
                <th className="p-3.5">Validity Date</th>
                <th className="p-3.5 text-right">Selling Total</th>
                <th className="p-3.5 text-right">Grand Total (Inc. GST)</th>
                <th className="p-3.5">Commercial Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotes.map((quote) => {
                const parentEvent = events.find((e) => e.id === quote.eventId);
                return (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>{quote.quoteNumber}</div>
                      <span className="text-[10px] text-slate-400 font-semibold">Version {quote.version}</span>
                    </td>
                    <td className="p-3.5">
                      <div
                        onClick={() => onSelectEvent(quote.eventId)}
                        className="font-bold text-slate-800 hover:text-amber-800 cursor-pointer"
                      >
                        {parentEvent?.title || quote.eventId}
                      </div>
                      <div className="text-[11px] text-slate-500">{parentEvent?.customerName}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{quote.validUntil}</td>
                    <td className="p-3.5 text-right font-semibold text-slate-800">{formatINR(quote.subtotal)}</td>
                    <td className="p-3.5 text-right font-black text-amber-950 text-sm">{formatINR(quote.grandTotal)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          quote.status === 'Accepted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : quote.status === 'Sent'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedQuoteForPreview(quote)}
                        className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        View Proposal
                      </button>
                      {quote.status !== 'Accepted' && (
                        <button
                          onClick={() => handleUpdateQuoteStatus(quote, 'Accepted')}
                          className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Accept
                        </button>
                      )}
                      {quote.status !== 'Accepted' && (
                        <button
                          id={`btn_delete_draft_quote_${quote.id}`}
                          onClick={() => setQuoteToDelete(quote)}
                          title="Delete draft quotation"
                          className="px-2 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors border border-red-200 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Delete Draft</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Quotation Document Preview Modal */}
      {selectedQuoteForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header with Mangalparv Brand */}
            <div className="flex items-start justify-between border-b-2 border-amber-600 pb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 font-serif" style={{ fontFamily: "'Cinzel', serif" }}>
                  मंगलपर्व <span className="text-amber-600 text-lg font-sans font-extrabold">EVENT CO.</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  सोहळा तुमचा, नियोजन आमचे. &bull; Warud, Dist. Amravati, Maharashtra
                </p>
                <div className="text-xs text-slate-600 mt-2">
                  Proposal Ref: <strong>{selectedQuoteForPreview.quoteNumber} (v{selectedQuoteForPreview.version})</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full font-bold text-xs">
                  {selectedQuoteForPreview.status}
                </span>
                <div className="text-xs text-slate-400 mt-2">
                  Valid Until: <strong>{selectedQuoteForPreview.validUntil}</strong>
                </div>
              </div>
            </div>

            {/* Scope / Breakdown Table */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Event Scope & Included Services:
              </h4>
              <table className="w-full text-left border border-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Service Category</th>
                    <th className="p-2.5">Description & Specifications</th>
                    <th className="p-2.5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuoteForPreview.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="p-2.5 font-bold text-slate-800">{line.category}</td>
                      <td className="p-2.5 text-slate-600">{line.description}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatINR(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right">Subtotal:</td>
                    <td className="p-2.5 text-right text-slate-900">{formatINR(selectedQuoteForPreview.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right text-rose-600">Special Privilege Discount:</td>
                    <td className="p-2.5 text-right text-rose-600">-{formatINR(selectedQuoteForPreview.discount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right text-slate-600">GST (18%):</td>
                    <td className="p-2.5 text-right text-slate-800">+{formatINR(selectedQuoteForPreview.tax)}</td>
                  </tr>
                  <tr className="text-sm bg-amber-100/70">
                    <td colSpan={2} className="p-3 text-right text-amber-950 font-black">Grand Quoted Total:</td>
                    <td className="p-3 text-right text-amber-950 font-black">{formatINR(selectedQuoteForPreview.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms & Payment Schedule */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <span className="font-bold text-slate-800 block">Commercial Terms & Payment Milestones:</span>
              <p>{selectedQuoteForPreview.terms}</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedQuoteForPreview.status !== 'Accepted' && (
                  <button
                    id="btn_preview_delete_draft_quote"
                    onClick={() => setQuoteToDelete(selectedQuoteForPreview)}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete Draft Quote</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedQuoteForPreview(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Close
                </button>
                {selectedQuoteForPreview.status !== 'Accepted' && (
                  <button
                    onClick={async () => {
                      await handleUpdateQuoteStatus(selectedQuoteForPreview, 'Accepted');
                      setSelectedQuoteForPreview(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Confirm Customer Acceptance
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Quote Confirmation Modal */}
      <DeleteQuoteModal
        quote={quoteToDelete}
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={handleConfirmDeleteQuote}
        isDeleting={isDeletingQuote}
      />
    </div>
  );
};
