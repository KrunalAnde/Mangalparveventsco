import React, { useState } from 'react';
import { EventItem } from '../types';
import { Trash2, AlertTriangle, X, Calendar, MapPin, User, IndianRupee, Loader2 } from 'lucide-react';

interface DeleteEventModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascade: boolean) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteEventModal: React.FC<DeleteEventModalProps> = ({
  event,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const [cascade, setCascade] = useState<boolean>(true);

  if (!isOpen || !event) return null;

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleConfirm = async () => {
    await onConfirm(cascade);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        id="delete_event_confirmation_modal"
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
              Delete Event from Pipeline
            </h3>
            <p className="text-xs text-red-700 mt-0.5 font-medium">
              Are you sure you want to permanently remove this event?
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            id="btn_close_delete_modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {event.status === 'Completed' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Completed Events Cannot Be Deleted</span>
              </div>
              <p className="text-amber-800">
                This event is marked as <strong>Completed</strong>. Completed events are permanently archived to maintain accurate financial accounting, GST records, and vendor performance history.
              </p>
            </div>
          ) : (
            <>
              {/* Target Event Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                {event.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 flex-shrink-0">
                {event.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{event.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{event.eventDateStart}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{event.venueAddress}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{formatINR(event.budgetMin)} - {formatINR(event.budgetMax)}</span>
              </div>
            </div>
          </div>

          {/* Impact Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <span className="font-bold block">Permanent Deletion Notice:</span>
              <span>
                Deleting this event removes it from the operational pipeline, live calendar, and revenue dashboards.
              </span>
            </div>
          </div>

          {/* Cascade Option */}
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              id="checkbox_cascade_delete"
              checked={cascade}
              onChange={(e) => setCascade(e.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-600">
              Cascade delete all linked vendor allocations, commercial quotes, and assigned tasks associated with this event.
            </span>
          </label>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="btn_cancel_delete_event"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {event.status === 'Completed' ? 'Close' : 'Cancel'}
          </button>
          {event.status !== 'Completed' && (
            <button
              type="button"
              id="btn_confirm_delete_event"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Event...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event Permanently</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
