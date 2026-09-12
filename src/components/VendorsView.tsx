import React, { useState } from 'react';
import { Vendor, EventVendorAssignment, EventItem } from '../types';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../services/firestoreService';
import { PhoneInputField } from './PhoneInputField';
import { formatToIndianMobile } from '../utils/phoneUtils';
import {
  Users,
  Search,
  Filter,
  Plus,
  Star,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  X,
} from 'lucide-react';

interface VendorsViewProps {
  vendors: Vendor[];
  assignments: EventVendorAssignment[];
  events: EventItem[];
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  vendors,
  assignments,
  events,
}) => {
  const { currentUser, userProfile } = useAuth();
  const actorName = userProfile?.name || currentUser?.displayName || 'Admin';

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVendorForCalendar, setSelectedVendorForCalendar] = useState<Vendor | null>(null);

  // New Vendor Form
  const [newBizName, setNewBizName] = useState<string>('');
  const [newContact, setNewContact] = useState<string>('');
  const [newMobile, setNewMobile] = useState<string>('+91 ');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('Warud, Dist. Amravati');
  const [newArea, setNewArea] = useState<string>('Warud, Morshi');
  const [newBaseCost, setNewBaseCost] = useState<number>(35000);
  const [newCat, setNewCat] = useState<string>('Catering');

  const categories = [
    'ALL',
    'Venue',
    'Catering',
    'Decoration',
    'Photography',
    'Sound & DJ',
    'Makeup & Styling',
    'Pandit & Rituals',
  ];

  const isPanditCategory = (cat: string) => {
    const lower = (cat || '').toLowerCase();
    return (
      lower.includes('pandit') ||
      lower.includes('priest') ||
      lower.includes('ritual') ||
      lower.includes('guruji') ||
      lower.includes('purohit') ||
      lower.includes('pooja')
    );
  };

  // Handler for category filter buttons: switches category AND clears search so results are never stuck
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setSearchTerm('');
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      v.businessName.toLowerCase().includes(q) ||
      v.contactName.toLowerCase().includes(q) ||
      v.serviceArea.toLowerCase().includes(q) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q)) ||
      v.categories?.some((c) => c.toLowerCase().includes(q));

    let matchesCat = false;
    if (selectedCategory === 'ALL') {
      matchesCat = true;
    } else if (isPanditCategory(selectedCategory)) {
      matchesCat =
        v.categories?.some((c) => isPanditCategory(c)) ||
        isPanditCategory(v.businessName) ||
        (v.notes ? isPanditCategory(v.notes) : false);
    } else {
      matchesCat = v.categories?.some((c) =>
        c.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    return matchesSearch && matchesCat;
  });

  const formatINR = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName) return;
    const vendorId = `ven_${Date.now()}`;
    const newVendor: Vendor = {
      id: vendorId,
      businessName: newBizName,
      contactName: newContact || 'Manager',
      mobile: formatToIndianMobile(newMobile) || '+91 94220 00000',
      email: newEmail || 'vendor@mangalparv.in',
      address: newAddress,
      serviceArea: newArea,
      rating: 4.8,
      status: 'Active',
      qualityScore: 90,
      reliabilityScore: 92,
      categories: [newCat],
      baseCost: Number(newBaseCost) || 30000,
      pricingModel: 'Fixed package',
      advanceRequirementPercent: 40,
      notes: 'Onboarded via Mangalparv Partner Portal',
    };

    try {
      await setDoc(doc(db, 'vendors', vendorId), newVendor);
      await logAuditAction(actorName, 'Vendor', vendorId, 'VENDOR_ONBOARD', `Onboarded vendor ${newBizName}`);
      setShowAddModal(false);
      setNewBizName('');
      setNewMobile('+91 ');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" id="vendors_view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-serif">
            Vendor Directory &amp; Availability Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            S08 / S09 / S10: Curated network of celebration vendors across Warud, Amravati, and Nagpur
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Vendor</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor by business name, contact person, or service area..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Active Search & Filter Indicator */}
      {searchTerm && (
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
          <span>
            Filtering by search &ldquo;<strong className="text-slate-800 dark:text-slate-200">{searchTerm}</strong>&rdquo;
            {selectedCategory !== 'ALL' && (
              <> in <strong className="text-amber-700 dark:text-amber-400">{selectedCategory}</strong></>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
            }}
            className="text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            Clear Search &amp; Show All
          </button>
        </div>
      )}

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              No Vendors Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm
                ? `No vendors matched "${searchTerm}" ${selectedCategory !== 'ALL' ? `under "${selectedCategory}"` : ''}.`
                : `No vendors currently registered under "${selectedCategory}".`}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {(searchTerm || selectedCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Show All Vendors
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (selectedCategory !== 'ALL') {
                    setNewCat(selectedCategory === 'Pandit & Rituals' ? 'Pandit & Rituals' : selectedCategory);
                  }
                  setShowAddModal(true);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                + Onboard Vendor in {selectedCategory === 'ALL' ? 'Directory' : selectedCategory}
              </button>
            </div>
          </div>
        ) : (
          filteredVendors.map((vendor) => {
          const vendorConfirmedBookings = assignments.filter(
            (a) => a.vendorId === vendor.id && a.status === 'Confirmed'
          );

          return (
            <div
              key={vendor.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all p-5 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                      {vendor.businessName}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Contact: <strong className="text-slate-700 dark:text-slate-300">{vendor.contactName}</strong>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      vendor.status === 'Preferred'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {vendor.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center text-amber-500 font-bold gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{vendor.rating}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <div className="text-slate-600 dark:text-slate-400">
                    Quality: <strong className="text-emerald-700 dark:text-emerald-400">{vendor.qualityScore}%</strong>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <div className="text-slate-600 dark:text-slate-400">
                    Reliability: <strong className="text-blue-700 dark:text-blue-400">{vendor.reliabilityScore}%</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{vendor.serviceArea} ({vendor.address})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{vendor.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold">Pricing:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatINR(vendor.baseCost)} / {vendor.pricingModel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {vendor.categories?.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {vendorConfirmedBookings.length > 0
                      ? `${vendorConfirmedBookings.length} Confirmed Events`
                      : 'Available for Booking'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedVendorForCalendar(vendor)}
                  className="font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-xs cursor-pointer"
                >
                  View Schedule &rarr;
                </button>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Schedule & Availability Drawer Modal (S10 Availability Board) */}
      {selectedVendorForCalendar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {selectedVendorForCalendar.businessName} - Availability &amp; Bookings
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Double-booking prevention ledger for Warud market
                </p>
              </div>
              <button
                onClick={() => setSelectedVendorForCalendar(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>
                  Automatic scheduling conflict guard prevents confirming overlapping events for this partner.
                </span>
              </div>

              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Current Confirmed Event Schedule:
              </h4>

              {assignments.filter((a) => a.vendorId === selectedVendorForCalendar.id).length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                  No active assignments currently booked for this vendor. Available for all dates!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg">
                  {assignments
                    .filter((a) => a.vendorId === selectedVendorForCalendar.id)
                    .map((a) => {
                      const parentEvent = events.find((e) => e.id === a.eventId);
                      return (
                        <div key={a.id} className="p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {parentEvent ? parentEvent.title : a.eventId}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.status === 'Confirmed'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Category: {a.category} &bull; Dates:{' '}
                            {parentEvent ? `${parentEvent.eventDateStart} to ${parentEvent.eventDateEnd}` : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboard Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVendor}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Onboard New Celebration Partner</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="e.g. Maa Ambika Band & Line Array"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="Suresh Patil"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Category</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration &amp; Mandap</option>
                    <option value="Photography">Photography &amp; Drone</option>
                    <option value="Sound & DJ">Sound &amp; DJ</option>
                    <option value="Venue">Venue / Lawns</option>
                    <option value="Makeup & Styling">Makeup &amp; Styling</option>
                    <option value="Pandit & Rituals">Pandit &amp; Rituals</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <PhoneInputField
                  id="new_vendor_mobile"
                  label="Mobile Number"
                  value={newMobile}
                  onChange={setNewMobile}
                  placeholder="98220 12345"
                  helperText="Default country code: +91"
                />
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={newBaseCost === 0 ? '' : newBaseCost}
                    onChange={(e) => setNewBaseCost(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    step="any"
                    min="0"
                    placeholder="0"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Service Area</label>
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Warud, Morshi, Amravati"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer"
              >
                Save to Directory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
