import React, { useState } from 'react';
import { Customer, EventItem, EventStatus } from '../types';
import { saveCustomer, saveEvent } from '../services/firestoreService';
import { X, Check, ArrowRight, ArrowLeft, Sparkles, User, Calendar, MapPin, IndianRupee, ShieldCheck, Phone, Mail, FileText } from 'lucide-react';
import { PhoneInputField } from './PhoneInputField';
import { formatToIndianMobile } from '../utils/phoneUtils';

interface NewEventWizardProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEventId: string) => void;
  currentUserName: string;
  defaultCustomerId?: string;
}

export const NewEventWizard: React.FC<NewEventWizardProps> = ({
  customers,
  isOpen,
  onClose,
  onEventCreated,
  currentUserName,
  defaultCustomerId,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || '');
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustMobile, setNewCustMobile] = useState<string>('+91 ');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('Warud, Dist. Amravati');
  const [newCustSource, setNewCustSource] = useState<string>('Direct Walk-in / Phone');

  // Event state
  const [title, setTitle] = useState<string>('');
  const [eventType, setEventType] = useState<string>('Wedding');
  const [eventDateStart, setEventDateStart] = useState<string>('2026-11-25');
  const [eventDateEnd, setEventDateEnd] = useState<string>('2026-11-26');
  const [guestCount, setGuestCount] = useState<number>(500);
  const [budgetMin, setBudgetMin] = useState<number>(500000);
  const [budgetMax, setBudgetMax] = useState<number>(850000);
  const [venueAddress, setVenueAddress] = useState<string>('Warud Lawn / Banquet Hall');
  const [coordinatorName, setCoordinatorName] = useState<string>('Ketan Varma');
  const [notes, setNotes] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Venue',
    'Catering',
    'Decoration',
    'Photography',
    'Sound & DJ',
  ]);

  if (!isOpen) return null;

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      let finalCustomerId = selectedCustomerId;
      let finalCustomerName = '';

      if (isNewCustomer || !finalCustomerId) {
        const generatedCustId = `cust_${Date.now()}`;
        const newCust: Customer = {
          id: generatedCustId,
          name: newCustName || 'New Client',
          mobile: newCustMobile || '+91 94220 00000',
          email: newCustEmail,
          address: newCustAddress,
          source: newCustSource,
          createdAt: new Date().toISOString(),
        };
        await saveCustomer(newCust, currentUserName);
        finalCustomerId = generatedCustId;
        finalCustomerName = newCust.name;
      } else {
        const found = customers.find((c) => c.id === selectedCustomerId);
        finalCustomerName = found ? found.name : 'Valued Client';
      }

      const generatedEventId = `evt_${Date.now()}`;
      const newEvent: EventItem = {
        id: generatedEventId,
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        title: title || `${finalCustomerName}'s ${eventType}`,
        eventType,
        eventDateStart,
        eventDateEnd,
        venueAddress,
        guestCount: Number(guestCount) || 300,
        budgetMin: Number(budgetMin) || 400000,
        budgetMax: Number(budgetMax) || 700000,
        status: 'Requirement Pending' as EventStatus,
        salesOwnerName: currentUserName || 'Prashant Sir',
        coordinatorName: coordinatorName || 'Ketan Varma',
        requiredServices: selectedCategories,
        notes: `${notes} [Requirements: ${selectedCategories.join(', ')}]`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveEvent(newEvent, currentUserName);
      setIsSubmitting(false);
      onEventCreated(generatedEventId);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Wizard Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>S05 - New Event Orchestration Wizard</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Step {step} of 5: {
              step === 1 ? 'Customer Identification' :
              step === 2 ? 'Event Core & Dates' :
              step === 3 ? 'Services & Categories' :
              step === 4 ? 'Budget & Venue' : 'Review & Confirm'
            }</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between text-xs">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s
                    ? 'bg-amber-600 text-white'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </span>
              <span className={`hidden sm:inline font-medium ${step === s ? 'text-amber-800 font-bold' : 'text-slate-500'}`}>
                {s === 1 ? 'Customer' : s === 2 ? 'Details' : s === 3 ? 'Services' : s === 4 ? 'Budget' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: Customer */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-4 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(false)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-md ${
                    !isNewCustomer ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600'
                  }`}
                >
                  Select Existing Customer ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(true)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-md ${
                    isNewCustomer ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-600'
                  }`}
                >
                  + Add New Customer
                </button>
              </div>

              {!isNewCustomer ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Choose Customer Record</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Choose registered customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatToIndianMobile(c.mobile) || c.mobile}) - {c.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Customer Preview Card */}
                  {(() => {
                    const selCust = customers.find((c) => c.id === selectedCustomerId);
                    if (!selCust) return null;
                    return (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{selCust.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 font-mono">
                            {selCust.id}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-amber-700" />
                            <span className="font-mono font-bold">
                              {formatToIndianMobile(selCust.mobile) || selCust.mobile}
                            </span>
                          </div>
                          {selCust.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-amber-700" />
                              <span className="truncate">{selCust.email}</span>
                            </div>
                          )}
                          {selCust.address && (
                            <div className="flex items-start gap-1.5 col-span-full">
                              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                              <span>{selCust.address}</span>
                            </div>
                          )}
                        </div>
                        {selCust.notes && (
                          <div className="pt-1.5 border-t border-amber-200/60 text-slate-600 italic text-[11px]">
                            Notes: {selCust.notes}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="e.g. Rameshwar Deshmukh"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhoneInputField
                      id="wizard_new_cust_mobile"
                      label="Mobile Number *"
                      value={newCustMobile}
                      onChange={setNewCustMobile}
                      required
                      placeholder="94220 12345"
                      helperText="Default system country code: +91"
                    />
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">Email Address</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        placeholder="client@gmail.com"
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Address / City</label>
                    <input
                      type="text"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="Station Road, Warud"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Event Core & Dates */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Event Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deshmukh & Kulkarni Royal Wedding"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Wedding">Wedding (लग्न सोहळा)</option>
                    <option value="Engagement">Engagement (साखरपुडा)</option>
                    <option value="Reception">Wedding Reception</option>
                    <option value="Anniversary">Anniversary Celebration</option>
                    <option value="Birthday">Birthday Gala</option>
                    <option value="Naming Ceremony">Naming Ceremony (बारसे)</option>
                    <option value="Religious/Social">Religious / Social Function</option>
                    <option value="Corporate">Corporate / Institution Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Expected Guests Count</label>
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    value={eventDateStart}
                    onChange={(e) => setEventDateStart(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={eventDateEnd}
                    onChange={(e) => setEventDateEnd(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Services & Categories */}
          {step === 3 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">
                Identify Required Service Categories (Click to toggle)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
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
                ].map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`p-3 rounded-lg border text-left text-xs font-bold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-700" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 italic mt-2">
                Mangalparv vendor selection engine will match available, verified vendors in Warud & surrounding areas for each selected category.
              </p>
            </div>
          )}

          {/* STEP 4: Budget & Venue */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Min Budget (₹)</label>
                  <input
                    type="number"
                    value={budgetMin === 0 ? '' : budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Max Budget Target (₹)</label>
                  <input
                    type="number"
                    value={budgetMax === 0 ? '' : budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Preferred Venue / Address *</label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Shri Gajanan Lawns, Warud"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Assigned Operations Coordinator</label>
                  <input
                    type="text"
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Special Notes / Muhurt Timings</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Muhurt at 11:15 AM, Satvik feast"
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="font-bold text-sm text-slate-900">{title || 'Custom Celebration'}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Type:</strong> {eventType}</div>
                  <div><strong>Guests:</strong> {guestCount}</div>
                  <div><strong>Dates:</strong> {eventDateStart} to {eventDateEnd}</div>
                  <div><strong>Budget:</strong> ₹{budgetMin.toLocaleString('en-IN')} - ₹{budgetMax.toLocaleString('en-IN')}</div>
                  <div className="col-span-2"><strong>Venue:</strong> {venueAddress}</div>
                  <div className="col-span-2"><strong>Categories:</strong> {selectedCategories.join(', ')}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-900 rounded-lg text-xs border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Ready to deploy to Firestore. Upon creation, you can run vendor recommendations, generate dynamic cost sheets, and output formal quotes.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border ${
              step === 1 ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !isNewCustomer && !selectedCustomerId) {
                  alert('Please select an existing customer or switch to Add New Customer.');
                  return;
                }
                setStep((s) => Math.min(5, s + 1));
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Firestore...' : 'Create Event & Launch Workspace'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
