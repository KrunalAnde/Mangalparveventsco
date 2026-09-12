import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Customer,
  EventItem,
  EventRequirement,
  Vendor,
  EventVendorAssignment,
  CostSheet,
  Quote,
  Invoice,
  Payment,
  Task,
  AuditLog,
} from '../types';

/**
 * Recursively strips undefined values from an object or array before writing to Firestore.
 * Firestore setDoc/updateDoc throws an error if any property value is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Real-time subscription helper with defensive error handling
export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  errorHandler?: (error: Error) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as T[];
      callback(items);
    },
    (error) => {
      console.warn(`Firestore snapshot notice for ${collectionName}:`, error.message);
      if (errorHandler) errorHandler(error);
    }
  );
}

export function subscribeToEvents(callback: (events: EventItem[]) => void) {
  return subscribeToCollection<EventItem>('events', callback);
}

export function subscribeToVendors(callback: (vendors: Vendor[]) => void) {
  return subscribeToCollection<Vendor>('vendors', callback);
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  return subscribeToCollection<Customer>('customers', callback);
}

export function subscribeToAssignments(callback: (assignments: EventVendorAssignment[]) => void) {
  return subscribeToCollection<EventVendorAssignment>('assignments', callback);
}

export function subscribeToQuotes(callback: (quotes: Quote[]) => void) {
  return subscribeToCollection<Quote>('quotes', callback);
}

export function subscribeToInvoices(callback: (invoices: Invoice[]) => void) {
  return subscribeToCollection<Invoice>('invoices', callback);
}

export function subscribeToPayments(callback: (payments: Payment[]) => void) {
  return subscribeToCollection<Payment>('payments', callback);
}

export function subscribeToTasks(callback: (tasks: Task[]) => void) {
  return subscribeToCollection<Task>('tasks', callback);
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  return subscribeToCollection<AuditLog>('audit_logs', (logs) => {
    // Sort descending by timestamp / createdAt
    const sorted = [...logs].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    callback(sorted);
  });
}

// Audit logging
export async function logAuditAction(
  actorName: string,
  entityType: string,
  entityId: string,
  action: string,
  details: string
) {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const record: AuditLog = {
    id: auditId,
    actorName,
    entityType,
    entityId,
    action,
    details,
    createdAt: now,
    timestamp: now,
  };
  try {
    await setDoc(doc(db, 'audit_logs', auditId), sanitizeForFirestore(record));
  } catch (err) {
    console.warn('Audit log write note:', err);
  }
}

// Customers API
export async function saveCustomer(customer: Customer, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'customers', customer.id), sanitizeForFirestore(customer));
    await logAuditAction(actorName, 'Customer', customer.id, 'SAVE_CUSTOMER', `Saved customer ${customer.name}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
  }
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>,
  actorName = 'Admin',
  syncLinkedEvents = true
) {
  try {
    const custRef = doc(db, 'customers', customerId);
    const sanitizedUpdates = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(custRef, sanitizedUpdates);
    await logAuditAction(
      actorName,
      'Customer',
      customerId,
      'UPDATE_CUSTOMER',
      `Updated customer details for "${updates.name || customerId}"`
    );

    // If name was updated, optionally synchronize customerName on linked events
    if (syncLinkedEvents && updates.name) {
      try {
        const eventsQuery = query(collection(db, 'events'), where('customerId', '==', customerId));
        const eventsSnap = await getDocs(eventsQuery);
        for (const evDoc of eventsSnap.docs) {
          await updateDoc(doc(db, 'events', evDoc.id), {
            customerName: updates.name,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Note updating linked event customer names:', e);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
  }
}

export async function deleteCustomer(
  customerId: string,
  customerName: string,
  actorName = 'Admin',
  unlinkEvents = true
) {
  try {
    // If unlinkEvents requested, update any linked events so they reflect customer removal
    if (unlinkEvents) {
      try {
        const eventsQuery = query(collection(db, 'events'), where('customerId', '==', customerId));
        const eventsSnap = await getDocs(eventsQuery);
        for (const evDoc of eventsSnap.docs) {
          const evData = evDoc.data();
          await updateDoc(doc(db, 'events', evDoc.id), {
            notes: `${evData.notes || ''} [Archived Client Record: ${customerName} was deleted on ${new Date().toLocaleDateString('en-IN')}]`,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Note annotating linked events upon customer delete:', e);
      }
    }

    // Permanently remove customer from Firestore
    await deleteDoc(doc(db, 'customers', customerId));
    await logAuditAction(
      actorName,
      'Customer',
      customerId,
      'DELETE_CUSTOMER',
      `Permanently deleted customer "${customerName}" (${customerId}) from Firestore database`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
  }
}

// Events API
export async function saveEvent(event: EventItem, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'events', event.id), sanitizeForFirestore(event));
    await logAuditAction(actorName, 'Event', event.id, 'SAVE_EVENT', `Updated event "${event.title}" to status ${event.status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `events/${event.id}`);
  }
}

export async function deleteEvent(eventId: string, actorName = 'Admin', cascade = true) {
  try {
    // Delete the event document
    await deleteDoc(doc(db, 'events', eventId));

    // Cascade delete linked pipeline sub-records if requested
    if (cascade) {
      const collectionsToClean = ['assignments', 'quotes', 'invoices', 'payments', 'tasks'];
      for (const colName of collectionsToClean) {
        try {
          const q = query(collection(db, colName), where('eventId', '==', eventId));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch (subErr) {
          console.warn(`Note cleaning up ${colName} for event ${eventId}:`, subErr);
        }
      }
    }

    // Audit log
    await logAuditAction(
      actorName,
      'Event',
      eventId,
      'DELETE_EVENT',
      `Permanently deleted event ${eventId} and associated pipeline data`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    throw err;
  }
}

// Double booking validator
export async function checkVendorAvailability(
  vendorId: string,
  eventDateStart: string,
  eventDateEnd: string,
  excludeEventId?: string
): Promise<{ available: boolean; conflictEventTitle?: string }> {
  try {
    const q = query(collection(db, 'assignments'), where('vendorId', '==', vendorId), where('status', '==', 'Confirmed'));
    const snap = await getDocs(q);
    const conflicts = snap.docs.filter((d) => {
      const data = d.data() as EventVendorAssignment;
      if (excludeEventId && data.eventId === excludeEventId) return false;
      return true;
    });

    if (conflicts.length > 0) {
      return {
        available: false,
        conflictEventTitle: 'Overlapping confirmed event',
      };
    }
    return { available: true };
  } catch (err) {
    return { available: true }; // non-blocking fallback
  }
}

// Vendor Assignment API with double booking guard
export async function assignVendorToEvent(
  assignment: EventVendorAssignment,
  eventDateStart: string,
  eventDateEnd: string,
  actorName = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  if (assignment.status === 'Confirmed') {
    const avail = await checkVendorAvailability(assignment.vendorId, eventDateStart, eventDateEnd, assignment.eventId);
    if (!avail.available) {
      return {
        success: false,
        error: `Conflict detected: Vendor is already confirmed on this date. Double-booking prevented.`,
      };
    }
  }

  try {
    await setDoc(doc(db, 'assignments', assignment.id), sanitizeForFirestore(assignment));
    await logAuditAction(
      actorName,
      'Assignment',
      assignment.id,
      'VENDOR_ASSIGNMENT',
      `Assigned vendor ${assignment.vendorName} (${assignment.category}) with score ${assignment.selectionScore}%`
    );
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `assignments/${assignment.id}`);
  }
}

// Quotes API
export async function saveQuote(quote: Quote, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'quotes', quote.id), sanitizeForFirestore(quote));
    await logAuditAction(
      actorName,
      'Quote',
      quote.id,
      'QUOTE_SAVE',
      `Saved quote ${quote.quoteNumber} v${quote.version} (${quote.status}) total ₹${quote.grandTotal.toLocaleString('en-IN')}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `quotes/${quote.id}`);
  }
}

export async function deleteQuote(
  quoteId: string,
  actorName = 'Admin',
  quoteNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'quotes', quoteId));
    await logAuditAction(
      actorName,
      'Quote',
      quoteId,
      'QUOTE_DELETE',
      `Deleted quotation ${quoteNumber || quoteId}`
    );
    return { success: true };
  } catch (err: any) {
    console.error(`Failed to delete quote ${quoteId}:`, err);
    try {
      handleFirestoreError(err, OperationType.DELETE, `quotes/${quoteId}`);
    } catch {
      // Ignored for graceful handling
    }
    return { success: false, error: err?.message || 'Failed to delete quotation from database.' };
  }
}

// Invoices API
export async function saveInvoice(invoice: Invoice, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'invoices', invoice.id), sanitizeForFirestore(invoice));
    await logAuditAction(
      actorName,
      'Invoice',
      invoice.id,
      'INVOICE_SAVE',
      `Created ${invoice.invoiceType} invoice ${invoice.invoiceNumber} for ₹${invoice.total.toLocaleString('en-IN')}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `invoices/${invoice.id}`);
  }
}

// Payments API
export async function recordPayment(payment: Payment, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'payments', payment.id), sanitizeForFirestore(payment));
    // If linked to an invoice, update invoice paid amount and status
    if (payment.invoiceId) {
      const invSnap = await getDocs(query(collection(db, 'invoices'), where('id', '==', payment.invoiceId)));
      if (!invSnap.empty) {
        const invDoc = invSnap.docs[0];
        const invData = invDoc.data() as Invoice;
        const newPaid = (invData.paidAmount || 0) + payment.amount;
        const newStatus = newPaid >= invData.total ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
        await updateDoc(invDoc.ref, {
          paidAmount: newPaid,
          status: newStatus,
        });
      } else {
        const directRef = doc(db, 'invoices', payment.invoiceId);
        try {
          const directSnap = await getDoc(directRef);
          if (directSnap.exists()) {
            const invData = directSnap.data() as Invoice;
            const newPaid = (invData.paidAmount || 0) + payment.amount;
            const newStatus = newPaid >= invData.total ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';
            await updateDoc(directRef, {
              paidAmount: newPaid,
              status: newStatus,
            });
          }
        } catch {
          // non-blocking fallback
        }
      }
    }
    const targetInvText = payment.invoiceNumber ? ` against Invoice ${payment.invoiceNumber}` : '';
    await logAuditAction(
      actorName,
      'Payment',
      payment.id,
      'PAYMENT_RECORDED',
      `Recorded ₹${payment.amount.toLocaleString('en-IN')} via ${payment.method}${targetInvText} (Receipt: ${payment.receiptNumber}, Ref: ${payment.transactionRef})`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payments/${payment.id}`);
  }
}

// Tasks API
export async function saveTask(task: Task, actorName = 'Admin') {
  try {
    await setDoc(doc(db, 'tasks', task.id), sanitizeForFirestore(task));
    await logAuditAction(actorName, 'Task', task.id, 'TASK_UPDATE', `Task "${task.title}" marked as ${task.status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
  }
}

export async function deleteTask(taskId: string, actorName = 'Admin') {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    await logAuditAction(actorName, 'Task', taskId, 'TASK_DELETED', `Deleted task ${taskId}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
  }
}

// Default Seed Data for Warud / Amravati Region
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_warud_01',
    name: 'Adv. Rameshwar Deshmukh',
    mobile: '+91 94221 88290',
    email: 'r.deshmukh@warudlaw.in',
    address: 'Station Road, Near Tehsil Office, Warud, Dist. Amravati',
    source: 'Direct Referral / Community',
    notes: 'Bride father. Prefers traditional Marathi rituals with contemporary banquet hospitality.',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'cust_warud_02',
    name: 'Dr. Sunita & Pramod Patil',
    mobile: '+91 98230 45611',
    email: 'sunita.patil@warudclinic.org',
    address: 'Adarsh Colony, Morshi Road, Warud',
    source: 'Instagram / Word of Mouth',
    notes: '25th Wedding Anniversary reception with 350 VIP guests from Nagpur and Amravati.',
    createdAt: '2026-09-04T11:30:00Z',
  },
  {
    id: 'cust_warud_03',
    name: 'Shri Agrani Sahakari Sanstha',
    mobile: '+91 71220 90123',
    email: 'contact@agranibank.co.in',
    address: 'Main Market Yard, Warud',
    source: 'Corporate Enquiry',
    notes: 'Annual General Meeting and Cultural Evening with award ceremony for 500 delegates.',
    createdAt: '2026-09-08T09:00:00Z',
  },
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'ven_01',
    businessName: 'Maa Annapurna Shahi Catering',
    contactName: 'Vitthalrao Kale',
    mobile: '+91 94231 10982',
    email: 'annapurna.caterers@gmail.com',
    address: 'Opposite Grain Market, Warud',
    serviceArea: 'Warud, Morshi, Shendurjana Ghat',
    rating: 4.9,
    status: 'Preferred',
    qualityScore: 94,
    reliabilityScore: 98,
    categories: ['Catering', 'Dessert Counter'],
    baseCost: 380,
    pricingModel: 'Per plate',
    advanceRequirementPercent: 40,
    notes: 'Renowned for authentic Vidarbha & Maharashtrian wedding feast: Puran Poli, Basundi, Patodi.',
  },
  {
    id: 'ven_02',
    businessName: 'Rajlaxmi Mandap Decorators & Florals',
    contactName: 'Sanjay Bonde',
    mobile: '+91 98500 78210',
    email: 'rajlaxmi.decor@warud.com',
    address: 'Near Old Bus Stand, Warud',
    serviceArea: 'Warud, Amravati, Paratwada',
    rating: 4.8,
    status: 'Preferred',
    qualityScore: 92,
    reliabilityScore: 95,
    categories: ['Decoration', 'Mandap', 'Florals'],
    baseCost: 145000,
    pricingModel: 'Fixed package',
    advanceRequirementPercent: 50,
    notes: 'Specializes in Royal Maratha Mandap, fresh Bangalore orchid flower gateways, fairy light ceiling.',
  },
  {
    id: 'ven_03',
    businessName: 'Drishti Cinematics & Drone Lab',
    contactName: 'Amol Deshmukh',
    mobile: '+91 97632 44109',
    email: 'amol@drishticinema.in',
    address: 'Rajapeth, Amravati (Servicing Warud)',
    serviceArea: 'Amravati, Warud, Nagpur',
    rating: 4.9,
    status: 'Preferred',
    qualityScore: 96,
    reliabilityScore: 92,
    categories: ['Photography', 'Videography', 'Drone'],
    baseCost: 85000,
    pricingModel: 'Fixed package',
    advanceRequirementPercent: 30,
    notes: 'Dual Sony Alpha 7 IV rigs + DJI Mini 4 Pro drone + Same-day Instagram reel edit included.',
  },
  {
    id: 'ven_04',
    businessName: 'Sur-Taal Live Orchestra & DJ System',
    contactName: 'Kishor Wankhede',
    mobile: '+91 94033 67120',
    email: 'surtaal.sounds@gmail.com',
    address: 'Morshi Road, Warud',
    serviceArea: 'Warud, Morshi, Jarud',
    rating: 4.6,
    status: 'Active',
    qualityScore: 88,
    reliabilityScore: 90,
    categories: ['Sound & DJ', 'Orchestra', 'Traditional Shehnai'],
    baseCost: 45000,
    pricingModel: 'Per day',
    advanceRequirementPercent: 25,
    notes: 'Full JBL line-array sound system, wireless microphones, LED stage wash and traditional Shehnai-Chaughada.',
  },
  {
    id: 'ven_05',
    businessName: 'Roop-Kala Bridal Makeover Studio',
    contactName: 'Pooja Tiwari',
    mobile: '+91 96238 90112',
    email: 'roopkala.bridal@gmail.com',
    address: 'Shivaji Chowk, Warud',
    serviceArea: 'Warud, Shendurjana',
    rating: 4.7,
    status: 'Active',
    qualityScore: 91,
    reliabilityScore: 93,
    categories: ['Makeup & Styling', 'Bridal Mehndi'],
    baseCost: 28000,
    pricingModel: 'Fixed package',
    advanceRequirementPercent: 50,
    notes: 'HD Airbrush makeup, Nauvari saree draping, floral hair adornments, bridal party touchups.',
  },
  {
    id: 'ven_06',
    businessName: 'Shri Gajanan Lawns & Banquet Hall',
    contactName: 'Nitinrao Chaudhari',
    mobile: '+91 94228 55431',
    email: 'gajananlawns.warud@gmail.com',
    address: 'Bypass Highway, Warud',
    serviceArea: 'Warud',
    rating: 4.8,
    status: 'Preferred',
    qualityScore: 90,
    reliabilityScore: 96,
    categories: ['Venue'],
    baseCost: 120000,
    pricingModel: 'Per day',
    advanceRequirementPercent: 50,
    notes: 'Air-cooled banquet with 800-seat capacity, 20,000 sq ft lush green lawn, 12 AC dressing rooms, 100-car parking.',
  },
  {
    id: 'ven_07',
    businessName: 'Pt. Shrikant Joshi Guruji & Purohit Sangh',
    contactName: 'Pt. Shrikant Joshi Guruji',
    mobile: '+91 94221 44589',
    email: 'shrikant.guruji@gmail.com',
    address: 'Near Ram Mandir, Main Road, Warud',
    serviceArea: 'Warud, Morshi, Shendurjana, Amravati',
    rating: 4.95,
    status: 'Preferred',
    qualityScore: 98,
    reliabilityScore: 99,
    categories: ['Pandit & Rituals', 'Pandit', 'Pandit / Priest', 'Vedic Vivah Sanskar', 'Pooja Samagri'],
    baseCost: 25000,
    pricingModel: 'Fixed package',
    advanceRequirementPercent: 30,
    notes: 'Vedic Vivah Sanskar, Saptapadi, Kanyadaan, Lagna Muhurta, Satyanarayan Pooja, complete Havan & authentic Pooja Samagri arrangements.',
  }
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt_deshmukh_wedding',
    customerId: 'cust_warud_01',
    customerName: 'Adv. Rameshwar Deshmukh',
    title: 'Deshmukh & Kulkarni Royal Maharashtrian Wedding',
    eventType: 'Wedding',
    eventDateStart: '2026-11-20',
    eventDateEnd: '2026-11-21',
    venueAddress: 'Shri Gajanan Lawns & Banquet, Bypass Highway, Warud',
    guestCount: 650,
    budgetMin: 800000,
    budgetMax: 1100000,
    status: 'Quoted',
    salesOwnerName: 'Prashant Sir (Sales Lead)',
    coordinatorName: 'Ketan Varma (Ops Coordinator)',
    notes: 'High profile wedding. Require punctuality for Muhurt at 10:48 AM, authentic satvik catering for lunch.',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-09T14:30:00Z',
  },
  {
    id: 'evt_patil_anniversary',
    customerId: 'cust_warud_02',
    customerName: 'Dr. Sunita & Pramod Patil',
    title: 'Dr. Patil Silver Jubilee Celebration Gala',
    eventType: 'Anniversary',
    eventDateStart: '2026-10-15',
    eventDateEnd: '2026-10-15',
    venueAddress: 'Hotel Celebration Grand Banquet, Warud',
    guestCount: 350,
    budgetMin: 350000,
    budgetMax: 450000,
    status: 'Confirmed',
    salesOwnerName: 'Prashant Sir (Sales Lead)',
    coordinatorName: 'Sneha Raut (Ops Coordinator)',
    notes: 'Musical evening, couple story video reel, live acoustic band and multi-cuisine dinner.',
    createdAt: '2026-09-05T12:00:00Z',
    updatedAt: '2026-09-08T16:00:00Z',
  },
  {
    id: 'evt_agrani_convene',
    customerId: 'cust_warud_03',
    customerName: 'Shri Agrani Sahakari Sanstha',
    title: 'Agrani Sahakari Golden Milestone Convention',
    eventType: 'Corporate',
    eventDateStart: '2026-12-05',
    eventDateEnd: '2026-12-05',
    venueAddress: 'Agricultural APMC Hall, Warud',
    guestCount: 500,
    budgetMin: 400000,
    budgetMax: 550000,
    status: 'Requirement Pending',
    salesOwnerName: 'Prashant Sir (Sales Lead)',
    coordinatorName: 'Ketan Varma (Ops Coordinator)',
    notes: 'Stage backdrop for 15 dignitaries, memento distribution, LED screens and high tea + packed lunch.',
    createdAt: '2026-09-08T09:30:00Z',
    updatedAt: '2026-09-08T09:30:00Z',
  },
];

export const INITIAL_ASSIGNMENTS: EventVendorAssignment[] = [
  {
    id: 'asgn_01',
    eventId: 'evt_deshmukh_wedding',
    vendorId: 'ven_06',
    vendorName: 'Shri Gajanan Lawns & Banquet Hall',
    category: 'Venue',
    requirementId: 'req_venue',
    quantity: 2,
    agreedCost: 220000,
    customerPrice: 260000,
    selectionScore: 96,
    status: 'Confirmed',
    notes: '2-day full booking with 12 AC suites',
    confirmedAt: '2026-09-06T11:00:00Z',
  },
  {
    id: 'asgn_02',
    eventId: 'evt_deshmukh_wedding',
    vendorId: 'ven_01',
    vendorName: 'Maa Annapurna Shahi Catering',
    category: 'Catering',
    requirementId: 'req_cater',
    quantity: 650,
    agreedCost: 247000,
    customerPrice: 312000,
    selectionScore: 94,
    status: 'Offered',
    notes: 'Per plate cost negotiated to ₹380 with Puranpoli and Shrikhand',
  },
  {
    id: 'asgn_03',
    eventId: 'evt_deshmukh_wedding',
    vendorId: 'ven_02',
    vendorName: 'Rajlaxmi Mandap Decorators & Florals',
    category: 'Decoration',
    requirementId: 'req_decor',
    quantity: 1,
    agreedCost: 140000,
    customerPrice: 175000,
    selectionScore: 92,
    status: 'Proposed',
    notes: 'Grand Peshwai Mandap theme with fresh marigold and carnations',
  },
  {
    id: 'asgn_04',
    eventId: 'evt_deshmukh_wedding',
    vendorId: 'ven_03',
    vendorName: 'Drishti Cinematics & Drone Lab',
    category: 'Photography',
    requirementId: 'req_photo',
    quantity: 1,
    agreedCost: 80000,
    customerPrice: 100000,
    selectionScore: 95,
    status: 'Proposed',
  },
  {
    id: 'asgn_05',
    eventId: 'evt_patil_anniversary',
    vendorId: 'ven_04',
    vendorName: 'Sur-Taal Live Orchestra & DJ System',
    category: 'Sound & DJ',
    requirementId: 'req_patil_sound',
    quantity: 1,
    agreedCost: 40000,
    customerPrice: 52000,
    selectionScore: 91,
    status: 'Confirmed',
    confirmedAt: '2026-09-07T14:00:00Z',
  },
];

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'qt_deshmukh_01',
    eventId: 'evt_deshmukh_wedding',
    quoteNumber: 'MP-2026-QT-0104',
    version: 1,
    validUntil: '2026-09-25',
    subtotal: 847000,
    discount: 25000,
    tax: 147960,
    grandTotal: 969960,
    status: 'Sent',
    terms: '1. 30% advance on confirmation to secure venue and priority dates. 2. 50% 10 days before the wedding. 3. 20% balance on wedding day.',
    createdAt: '2026-09-07T12:00:00Z',
    lines: [
      { id: 'ql_1', category: 'Venue', description: 'Shri Gajanan Lawns & 2 AC Banquet Halls (2-day booking)', quantity: 1, unitPrice: 260000, amount: 260000 },
      { id: 'ql_2', category: 'Catering', description: 'Royal Maharashtrian Shahi Feast with Live Dessert Station (650 guests)', quantity: 650, unitPrice: 480, amount: 312000 },
      { id: 'ql_3', category: 'Decoration', description: 'Traditional Peshwai Rajmahal Mandap & Fresh Floral Entrance', quantity: 1, unitPrice: 175000, amount: 175000 },
      { id: 'ql_4', category: 'Photography', description: 'Cinematic 4K Video, Drone Coverage & 2 Premium Photo Albums', quantity: 1, unitPrice: 100000, amount: 100000 },
    ],
  },
  {
    id: 'qt_patil_01',
    eventId: 'evt_patil_anniversary',
    quoteNumber: 'MP-2026-QT-0098',
    version: 1,
    validUntil: '2026-09-20',
    subtotal: 360000,
    discount: 15000,
    tax: 62100,
    grandTotal: 407100,
    status: 'Accepted',
    terms: '50% advance received, balance payable upon event completion.',
    createdAt: '2026-09-06T10:00:00Z',
    lines: [
      { id: 'ql_p1', category: 'Venue', description: 'Celebration Grand Banquet Hall with Lighting Setup', quantity: 1, unitPrice: 110000, amount: 110000 },
      { id: 'ql_p2', category: 'Catering', description: 'Silver Jubilee Dinner Buffet (350 pax)', quantity: 350, unitPrice: 450, amount: 157500 },
      { id: 'ql_p3', category: 'Sound & Music', description: 'Live Acoustic Bollywood Band and Stage Lighting', quantity: 1, unitPrice: 52000, amount: 52000 },
      { id: 'ql_p4', category: 'Decor', description: 'Silver & Rose Gold Crystal Stage Decor', quantity: 1, unitPrice: 40500, amount: 40500 },
    ],
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv_patil_adv',
    eventId: 'evt_patil_anniversary',
    invoiceNumber: 'MP-INV-2026-0042',
    invoiceType: 'Advance',
    issueDate: '2026-09-07',
    dueDate: '2026-09-12',
    subtotal: 172500,
    tax: 31050,
    total: 203550,
    paidAmount: 203550,
    status: 'Paid',
  },
  {
    id: 'inv_deshmukh_adv',
    eventId: 'evt_deshmukh_wedding',
    invoiceNumber: 'MP-INV-2026-0045',
    invoiceType: 'Advance',
    issueDate: '2026-09-08',
    dueDate: '2026-09-18',
    subtotal: 246000,
    tax: 44280,
    total: 290280,
    paidAmount: 100000,
    status: 'Partial',
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay_01',
    eventId: 'evt_patil_anniversary',
    invoiceId: 'inv_patil_adv',
    payerType: 'Customer',
    paymentType: 'Advance',
    amount: 203550,
    method: 'UPI',
    transactionRef: 'UPI/625109841290/SBI',
    receiptNumber: 'REC-2026-081',
    paidAt: '2026-09-07T16:20:00Z',
    status: 'Success',
    notes: 'Advance 50% received via Google Pay / UPI',
  },
  {
    id: 'pay_02',
    eventId: 'evt_deshmukh_wedding',
    invoiceId: 'inv_deshmukh_adv',
    payerType: 'Customer',
    paymentType: 'Advance',
    amount: 100000,
    method: 'Bank Transfer',
    transactionRef: 'NEFT/HDFC294810239',
    receiptNumber: 'REC-2026-084',
    paidAt: '2026-09-08T11:45:00Z',
    status: 'Success',
    notes: 'Token booking deposit',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'tsk_01',
    eventId: 'evt_deshmukh_wedding',
    title: 'Confirm Muhurt Pandit schedule and samagri list with family',
    ownerName: 'Ketan Varma',
    status: 'Done',
    priority: 'High',
    dueAt: '2026-09-10',
    category: 'Rituals',
  },
  {
    id: 'tsk_02',
    eventId: 'evt_deshmukh_wedding',
    title: 'Finalize Tasting Session for Puranpoli and Shrikhand flavours',
    ownerName: 'Ketan Varma',
    status: 'In Progress',
    priority: 'Urgent',
    dueAt: '2026-09-15',
    category: 'Catering',
  },
  {
    id: 'tsk_03',
    eventId: 'evt_deshmukh_wedding',
    title: 'Site measurement and 3D Mandap layout check at Shri Gajanan Lawns',
    ownerName: 'Sanjay Bonde',
    status: 'To Do',
    priority: 'High',
    dueAt: '2026-09-20',
    category: 'Decoration',
  },
  {
    id: 'tsk_04',
    eventId: 'evt_patil_anniversary',
    title: 'Collect 50 old couple photos for anniversary timeline video edit',
    ownerName: 'Amol Deshmukh',
    status: 'Waiting',
    priority: 'Medium',
    dueAt: '2026-09-22',
    category: 'Cinematics',
  },
  {
    id: 'tsk_05',
    eventId: 'evt_patil_anniversary',
    title: 'Rehearse acoustic playlist with live orchestra',
    ownerName: 'Kishor Wankhede',
    status: 'To Do',
    priority: 'Medium',
    dueAt: '2026-10-01',
    category: 'Music',
  },
];

// Seed initial collections into Firestore if empty
export async function seedDatabaseIfEmpty() {
  try {
    const custSnap = await getDocs(collection(db, 'customers'));
    if (custSnap.empty) {
      console.info('Seeding initial Mangalparv Event Co. data to Firestore...');
      for (const c of INITIAL_CUSTOMERS) {
        await setDoc(doc(db, 'customers', c.id), c);
      }
      for (const v of INITIAL_VENDORS) {
        await setDoc(doc(db, 'vendors', v.id), v);
      }
      for (const e of INITIAL_EVENTS) {
        await setDoc(doc(db, 'events', e.id), e);
      }
      for (const a of INITIAL_ASSIGNMENTS) {
        await setDoc(doc(db, 'assignments', a.id), a);
      }
      for (const q of INITIAL_QUOTES) {
        await setDoc(doc(db, 'quotes', q.id), q);
      }
      for (const inv of INITIAL_INVOICES) {
        await setDoc(doc(db, 'invoices', inv.id), inv);
      }
      for (const p of INITIAL_PAYMENTS) {
        await setDoc(doc(db, 'payments', p.id), p);
      }
      for (const t of INITIAL_TASKS) {
        await setDoc(doc(db, 'tasks', t.id), t);
      }
      await logAuditAction(
        'System Initializer',
        'Database',
        'system',
        'INIT_DATABASE',
        'Successfully initialized Mangalparv Event Co. operational records with Warud regional vendors & events'
      );
      console.info('Seeding complete.');
    } else {
      // Ensure the Pandit partner (ven_07) exists even if the database was previously seeded
      try {
        const panditSnap = await getDoc(doc(db, 'vendors', 'ven_07'));
        if (!panditSnap.exists()) {
          const panditVendor = INITIAL_VENDORS.find((v) => v.id === 'ven_07');
          if (panditVendor) {
            await setDoc(doc(db, 'vendors', 'ven_07'), panditVendor);
          }
        }
      } catch (e) {
        // silent
      }
    }
  } catch (err) {
    console.warn('Seeding note:', err);
  }
}
