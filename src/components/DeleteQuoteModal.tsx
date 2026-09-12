import React from 'react';
import { Quote } from '../types';
import { Trash2, AlertTriangle, X, Loader2, FileText, Calendar, IndianRupee } from 'lucide-react';

interface DeleteQuoteModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quote: Quote) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteQuoteModal: React.FC<DeleteQuoteModalProps> = ({
  quote,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !quote) return null;

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');
  const isAccepted = quote.status === 'Accepted';

  const handleConfirm = async () => {
    if (isAccepted) return;
    await onConfirm(quote);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        id="delete_quote_confirmation_modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-red-50/80 border-b border-red-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0 text-red-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {isAccepted ? 'Quotation Locked' : 'Delete Draft Quotation'}
            </h3>
            <p className="text-xs text-red-700 mt-0.5 font-medium">
              {isAccepted
                ? 'Accepted quotations are legally locked and cannot be deleted.'
                : 'Permanently remove this quotation revision from event records.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            id="btn_close_delete_quote_modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Quote Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>{quote.quoteNumber}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                Version {quote.version}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
              <div>
                <span className="text-slate-400 block">Total Value:</span>
                <span className="font-bold text-slate-900 text-xs">{formatINR(quote.grandTotal)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    quote.status === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : quote.status === 'Sent'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {quote.status}
                </span>
              </div>
            </div>

            {quote.validUntil && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Valid Until: {quote.validUntil}</span>
              </div>
            )}
          </div>

          {isAccepted ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                This quotation has already been accepted by the customer and is bound to financial tax invoices and active vendor work orders. Deletion is restricted to maintain Section 12/15 compliance.
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                This action cannot be undone. All line item packages and pricing revisions associated with this quotation version will be deleted from the database.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            id="btn_cancel_delete_quote"
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isAccepted ? 'Close' : 'Cancel'}
          </button>

          {!isAccepted && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              id="btn_confirm_delete_quote"
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Quotation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
