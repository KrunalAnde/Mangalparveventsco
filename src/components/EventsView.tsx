import React, { useState } from 'react';
import { EventItem, EventStatus } from '../types';
import { Calendar, Search, Filter, Plus, ChevronRight, Users, MapPin, Trash2, CheckCircle2 } from 'lucide-react';
import { deleteEvent } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { DeleteEventModal } from './DeleteEventModal';
import { InfoTooltip } from './InfoTooltip';

interface EventsViewProps {
  events: EventItem[];
  onSelectEvent: (id: string) => void;
  onNewEvent: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  onSelectEvent,
  onNewEvent,
}) => {
  const { user } = useAuth();
  const actorName = user?.displayName || user?.email || 'Operations Admin';

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const isBookingConfirmed = (status?: string) => {
    const s = (status || '').trim().toLowerCase();
    return s === 'confirmed' || s === 'booking confirmed';
  };

  const isEventActive = (e: EventItem) => {
    const s = (e.status || '').trim().toLowerCase();
    return s !== 'completed' && s !== 'cancelled';
  };

  const activeEventsCount = events.filter(isEventActive).length;
  const confirmedCount = events.filter((e) => isBookingConfirmed(e.status)).length;
  const inExecCount = events.filter((e) => (e.status || '').trim().toLowerCase() === 'in execution').length;
  const inquiriesCount = events.filter(
    (e) => isEventActive(e) && !isBookingConfirmed(e.status) && (e.status || '').trim().toLowerCase() !== 'in execution'
  ).length;
  const completedCount = events.filter((e) => (e.status || '').trim().toLowerCase() === 'completed').length;

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.venueAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    const s = (e.status || '').trim().toLowerCase();
    let matchesStatus = true;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = isEventActive(e);
    } else if (statusFilter === 'Confirmed' || statusFilter === 'Booking Confirmed') {
      matchesStatus = isBookingConfirmed(e.status);
    } else if (statusFilter === 'In Execution') {
      matchesStatus = s === 'in execution';
    } else if (statusFilter === 'Inquiries') {
      matchesStatus = isEventActive(e) && !isBookingConfirmed(e.status) && s !== 'in execution';
    } else {
      matchesStatus = (e.status || '').trim() === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleDeleteConfirm = async (cascade: boolean) => {
    if (!eventToDelete) return;
    if (eventToDelete.status === 'Completed') {
      alert('Completed events are finalized and archived in company records. They cannot be deleted.');
      setEventToDelete(null);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteEvent(eventToDelete.id, actorName, cascade);
      setDeleteNotice(`Event "${eventToDelete.title}" was permanently removed from the pipeline.`);
      setEventToDelete(null);
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event from database. Please check your network connection.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" id="events_view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Events & Bookings Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository of all celebratory, social and corporate events managed by Mangalparv
          </p>
        </div>
        <button
          onClick={onNewEvent}
          id="btn_events_new_event"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Event Wizard</span>
        </button>
      </div>

      {/* Delete Feedback Notice */}
      {deleteNotice && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-semibold">{deleteNotice}</span>
          </div>
          <button
            onClick={() => setDeleteNotice(null)}
            className="text-red-700 hover:text-red-900 font-bold px-2 py-0.5 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by event title, client name, or venue location..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold p-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Events ({events.length})</option>
              <option value="ACTIVE">Active Events ({activeEventsCount})</option>
              <option value="Booking Confirmed">Booking Confirmed ({confirmedCount})</option>
              <option value="In Execution">In Execution ({inExecCount})</option>
              <option value="Inquiries">Inquiries & Proposals ({inquiriesCount})</option>
              <option value="Completed">Completed ({completedCount})</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Status Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({events.length})
          </button>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Active Events ({activeEventsCount})
            </button>
            <InfoTooltip
              title="Active Events"
              content="All events currently in the active pipeline (excluding Completed or Cancelled). Includes Inquiries, Costing, Quoted, Booking Confirmed, and In Execution."
            />
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('Booking Confirmed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              statusFilter === 'Booking Confirmed' || statusFilter === 'Confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Booking Confirmed ({confirmedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('In Execution')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'In Execution' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            In Execution ({inExecCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Inquiries')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'Inquiries' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            Inquiries & Quoted ({inquiriesCount})
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map((evt) => {
          const isConfirmed = isBookingConfirmed(evt.status);
          return (
            <div
              key={evt.id}
              onClick={() => onSelectEvent(evt.id)}
              className="bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Booking Confirmed</span>
                      </span>
                    ) : evt.status === 'In Execution' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                        In Execution
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          evt.status === 'Quoted' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium">
                      {evt.eventType}
                    </span>
                  </div>

                  {/* Delete Button on Card (Completed events cannot be deleted) */}
                  {evt.status !== 'Completed' && (
                    <button
                      id={`btn_delete_card_${evt.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventToDelete(evt);
                      }}
                      title="Delete event from pipeline"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                    {evt.title}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium mt-1">
                    👤 Client: {evt.customerName}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{evt.eventDateStart} {evt.eventDateEnd !== evt.eventDateStart && `to ${evt.eventDateEnd}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{evt.venueAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{evt.guestCount} Guests Target</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Budget Range</span>
                  <span className="font-bold text-slate-900">{formatINR(evt.budgetMin)} - {formatINR(evt.budgetMax)}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-700 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Manage</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <DeleteEventModal
        event={eventToDelete}
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};
